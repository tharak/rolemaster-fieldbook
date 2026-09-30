"""Add selectable A-10.11 weapon-fumble and spell-failure results.

Run pdftotext -f 241 -l 242 -bbox-layout on the bundled PDF and pass its
HTML output to this script. The row and column boundaries follow those pages.
"""

import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
NS = {"x": "http://www.w3.org/1999/xhtml"}
TABLES = [
    {
        "code": "A-10.11.1",
        "rolls": ["01-25", "26-30", "31-40", "41-50", "51-60", "61-65", "66", "67-70", "71-80", "81-85", "86-90", "91-95", "96-99", "100"],
        "starts": [71.3, 101.8, 140.2, 170.7, 209.1, 254.2, 300.5, 346.8, 393.1, 439.4, 492.5, 546.7, 600.9, 647.2],
        "bounds": [59, 140, 221, 302, 384, 465, 547],
        "labels": ["One-handed arms", "Two-handed arms", "Polearms and spears", "Mounted arms", "Thrown arms", "Missile weapons"],
        "groups": ["Weapon"] * 6,
        "end": 710,
    },
    {
        "code": "A-10.11.2",
        "rolls": ["01-20", "21-30", "31-40", "41-60", "61-75", "76-90", "91-95", "96-100", "101-125", "126-150", "151-175", "176-185", "186-191", "192-195", "196-200", "201-250", "251-300", "301+"],
        "starts": [86.6, 113.4, 148.7, 176.5, 203.2, 231.0, 265.2, 300.5, 335.8, 370.0, 420.3, 462.0, 504.8, 547.6, 596.7, 632.0, 673.7, 724.0],
        "bounds": [107, 229, 351, 473, 595],
        "labels": ["Elemental", "Force", "Informational", "Other"],
        "groups": ["Attack spell", "Attack spell", "Non-attack spell", "Non-attack spell"],
        "end": 750,
    },
]


def extract_cell(lines, top, bottom, left, right):
    fragments = []
    for y, words in lines:
        if top - 0.5 <= y < bottom - 0.5:
            selected = [word for x, word in words if left <= x < right]
            if selected:
                fragments.append(" ".join(selected))
    return " ".join(fragments).strip()


def main():
    pages = ET.parse(sys.argv[1]).findall(".//x:page", NS)
    if len(pages) != 2:
        raise ValueError(f"Expected 2 pages, got {len(pages)}")
    for page, spec in zip(pages, TABLES):
        lines = []
        for line in page.findall(".//x:line", NS):
            words = [(float(word.attrib["xMin"]), word.text or "") for word in line.findall("x:word", NS)]
            if words:
                lines.append((float(line.attrib["yMin"]), words))
        lines.sort(key=lambda entry: entry[0])
        rows = []
        for index, roll in enumerate(spec["rolls"]):
            top = spec["starts"][index]
            bottom = spec["starts"][index + 1] if index + 1 < len(spec["starts"]) else spec["end"]
            cells = [{"description": extract_cell(lines, top, bottom, left, spec["bounds"][column + 1])}
                     for column, left in enumerate(spec["bounds"][:-1])]
            if any(not cell["description"] for cell in cells):
                raise ValueError(f"Missing {spec['code']} result at {roll}")
            rows.append({"roll": roll, "cells": cells})
        # Two OCR text layers overlap in the elemental 21–30 result.
        if spec["code"] == "A-10.11.2":
            rows[1]["cells"][0]["description"] = "Your fingertips spark and surprise you. You lose the spell (and one power point). You operate at a -50 modification next round."
        path = ROOT / "tables" / f"{spec['code']}.json"
        data = json.loads(path.read_text())
        data.update(kind="fumble", columns=[{"group": group, "label": label} for group, label in zip(spec["groups"], spec["labels"])], rows=rows)
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
        print(f"{spec['code']}: {len(rows)} roll ranges, {len(spec['labels'])} columns")


if __name__ == "__main__":
    main()
