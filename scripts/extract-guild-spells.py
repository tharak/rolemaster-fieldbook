"""Extract list names and individual spell names from the local Core Rules PDF.
Requires pdftotext; no network or external Python dependencies.
"""
import json, re, subprocess
from pathlib import Path
root = Path(__file__).resolve().parents[1]
text = subprocess.check_output(['pdftotext', '-layout', str(root / 'references' / 'Rolemaster FRP - CORE Rules - OCR.pdf'), '-'], text=True)
pages = text.split('\f')
result = []
for page in range(156, 204):
    lines = pages[page].splitlines()
    names = re.split(r'\s{2,}', re.sub(r'^\s*C\s+|\s+F\s*$', '', lines[3]).strip())
    codes = re.findall(r'(?:A-)?(9\.\d+\.\d+)', lines[1])
    assert len(names) == len(codes) == 2, (page, names, codes)
    for side in range(2):
        spells = []
        column = subprocess.check_output(['pdftotext', '-f', str(page+1), '-l', str(page+1), '-x', str(side*306), '-y', '0', '-W', '306', '-H', '792', '-layout', str(root / 'references' / 'Rolemaster FRP - CORE Rules - OCR.pdf'), '-'], text=True)
        for line in column.splitlines():
            for match in re.finditer(r'(\d+)\.\s+([^—\n]+?)\s+—', line):
                if 1 <= int(match[1]) <= 10:
                    spells.append({'level': int(match[1]), 'name': match[2].strip()})
        assert spells and len({s['level'] for s in spells}) == len(spells), (page, side, spells)
        result.append({'id': 'A-' + codes[side], 'name': names[side].title(), 'page': page, 'spells': spells})
assert len(result) == 96
(root / 'data/guild/spell-lists.json').write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n')
print(f'Extracted {len(result)} lists and {sum(len(s["spells"]) for s in result)} spell names.')
