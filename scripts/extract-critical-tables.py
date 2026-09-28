"""Extract searchable critical results from the included Rolemaster PDF.

Requires Poppler's pdftotext. Run before extract-book-tables.mjs so the
structured results can be merged with the source-page records.
"""

import re
import subprocess
import xml.etree.ElementTree as ET
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / "Rolemaster FRP - CORE Rules - OCR.pdf"
NS = {"x": "http://www.w3.org/1999/xhtml"}
STANDARD_ROLLS = [
    "01-05", "06-10", "11-15", "16-20", "21-35", "36-45", "46-50",
    "51-55", "56-60", "61-65", "66", "67-70", "71-75", "76-80",
    "81-85", "86-90", "91-95", "96-99", "100",
]
CREATURE_ROLLS = [
    "01-05", "06-10", "11-20", "21-30", "31-40", "41-50", "51-65",
    "66", "67-70", "71-80", "81-90", "91-95", "96-98", "99-100",
    "101-150", "151-175", "176-200", "201-250", "251+",
]


def extract_lines(page):
    lines = []
    for element in page.findall(".//x:line", NS):
        words = [
            (float(word.attrib["xMin"]), word.text or "")
            for word in element.findall("x:word", NS)
        ]
        if words:
            lines.append((float(element.attrib["yMin"]), words))
    return sorted(lines)


def first_body_columns(lines, first_label_y, gutter):
    starts = sorted({round(words[0][0], 1) for y, words in lines
                     if first_label_y - 16 <= y <= first_label_y + 4
                     and words[0][0] > gutter + 20})
    columns = []
    for start in starts:
        if not columns or start - columns[-1] > 4:
            columns.append(start)
    return columns


def label_positions(lines, rolls, gutter):
    candidates = []
    for y, words in lines:
        if words[0][0] > gutter + 8:
            continue
        value = words[0][1].replace(" ", "")
        if len(words) > 1 and value.endswith("-") and words[1][1].isdigit():
            value += words[1][1]
        elif len(words) > 1 and words[1][1] == "-" and words[1][0] < gutter + 12:
            value += "-"
        if re.fullmatch(r"\d{1,3}(?:-\d{1,3}|-?|\+)?", value):
            candidates.append((y, value))
    positions = []
    for roll in rolls:
        matches = [y for y, value in candidates if value == roll]
        if matches:
            positions.append(matches[-1])
            continue
        # The upper creature ranges wrap onto two physical lines in the PDF.
        start, _, end = roll.partition("-")
        if end:
            parts = [(y, value) for y, value in candidates if value in (f"{start}-", start)]
            for y, _ in parts:
                second = [yy for yy, value in candidates if value == end and 0 < yy - y < 12]
                if second:
                    positions.append(second[0])
                    break
        if len(positions) < rolls.index(roll) + 1:
            raise ValueError(f"Could not find critical roll {roll}; labels: {candidates}")
    if positions != sorted(positions):
        raise ValueError(f"Critical roll labels are out of order: {positions}")
    return positions


def joined_text(lines, low, high, left, right):
    selected = []
    for y, words in lines:
        if low <= y < high:
            text = " ".join(word for x, word in words if left - 1 <= x < right - 1)
            if text.strip():
                selected.append((y, text.strip()))
    return " ".join(text for _, text in selected).replace("  ", " ").strip()


def make_table(page, code, printed_page):
    lines = extract_lines(page)
    rolls = CREATURE_ROLLS if printed_page >= 237 else STANDARD_ROLLS
    first_label = next(y for y, words in lines if words[0][1] == "01-05")
    gutter = next(words[0][0] for y, words in lines if words[0][1] == "01-05")
    starts = first_body_columns(lines, first_label, gutter)
    expected_columns = 4 if printed_page == 239 else 5
    if len(starts) != expected_columns:
        raise ValueError(f"{code}: expected {expected_columns} columns, found {starts}")
    labels = label_positions(lines, rolls, gutter)
    body_starts = [
        min((y for y, words in lines if y > label + 15 and abs(words[0][0] - starts[0]) < 2), default=765)
        for label in labels
    ]
    if any(body_starts[i] >= labels[i + 1] + 15 for i in range(len(labels) - 1)):
        raise ValueError(f"{code}: could not find description boundaries")
    if printed_page == 239:
        columns = [
            {"label": "Normal", "group": "Large creature"},
            {"label": "Slaying", "group": "Large creature"},
            {"label": "Normal", "group": "Super large creature"},
            {"label": "Slaying", "group": "Super large creature"},
        ]
    elif printed_page >= 237:
        columns = [{"label": label, "group": "Weapon"} for label in ["Normal", "Magic", "Mithril", "Holy arms", "Slaying"]]
    else:
        columns = [{"label": label, "group": "Critical severity"} for label in "ABCDE"]
    rows = []
    for index, roll in enumerate(rolls):
        description_start = first_label - 15 if index == 0 else body_starts[index - 1] - 1
        effect_start = labels[index] + 5
        effect_end = min(body_starts[index] - 1, 756)
        cells = []
        for column, left in enumerate(starts):
            right = starts[column + 1] if column + 1 < len(starts) else 612
            cells.append({
                "description": joined_text(lines, description_start, effect_start, left, right),
                "effect": joined_text(lines, effect_start, effect_end, left, right),
            })
        rows.append({"roll": roll, "cells": cells})
    missing = [(row["roll"], columns[index]["label"]) for row in rows
               for index, cell in enumerate(row["cells"]) if not cell["description"]]
    if missing:
        raise ValueError(f"{code}: missing critical descriptions: {missing}")
    # Two final-row prose fragments sit on the same line as their effects.
    if code == "A-10.10.8":
        for column, fragment in ((1, "a round."), (2, "in 18 rounds.")):
            cell = rows[-1]["cells"][column]
            if not cell["effect"].startswith(fragment):
                raise ValueError(f"{code}: final-row text changed: {cell['effect']}")
            cell["description"] += f" {fragment}"
            cell["effect"] = cell["effect"][len(fragment):].strip()
    return {"kind": "critical", "columns": columns, "rows": rows}


def main():
    import json

    result = subprocess.run(
        ["pdftotext", "-f", "232", "-l", "240", "-bbox-layout", str(PDF), "-"],
        capture_output=True, check=True, text=True,
    )
    pages = ET.fromstring(result.stdout).findall(".//x:page", NS)
    if len(pages) != 9:
        raise ValueError(f"Expected 9 critical pages, found {len(pages)}")
    for index, page in enumerate(pages, start=1):
        printed_page = 230 + index
        code = f"A-10.10.{index}"
        table = make_table(page, code, printed_page)
        path = ROOT / "tables" / f"{code}.json"
        path.write_text(json.dumps(table, ensure_ascii=False, indent=2) + "\n")
        print(f"{code}: {len(table['rows'])} roll ranges, {len(table['columns'])} columns")


if __name__ == "__main__":
    main()
