"""Extract the printed reference tables without the surrounding page prose.

Coordinates are in PDF points at 72 dpi. Printed page numbers are one less
than PDF page numbers in this edition. Attack and critical JSON is untouched.
"""

import json
import re
import subprocess
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / 'Rolemaster FRP - CORE Rules - OCR.pdf'
TABLES = ROOT / 'tables'

# (printed page, x, y, width, height); one entry may have several sections.
REGIONS = {
    'T-1.1': [(13, 52, 650, 490, 115)],
    'T-1.2': [(16, 325, 100, 232, 220)],
    'T-1.3': [(17, 305, 39, 225, 378)],
    'T-1.4': [(15, 52, 420, 490, 345)],
    'T-1.5': [(21, 50, 39, 495, 720)],
    'T-1.6': [(19, 368, 39, 222, 650)],
    'T-1.7': [(29, 50, 39, 540, 690)],
    'T-2.1': [(17, 305, 425, 225, 335)],
    'T-2.2': [(31, 50, 225, 245, 535)],
    'T-2.3': [(37, 50, 559, 245, 202)],
    'T-2.4': [(103, 298, 39, 255, 345)],
    'T-2.5': [(27, 50, 27, 495, 735)],
    'T-2.6': [(36, 335, 99, 215, 560)],
    'T-2.7': [(25, 50, 39, 300, 295)],
    'T-2.8': [(23, 290, 39, 300, 615)],
    'chart-special-progression': [(85, 50, 635, 365, 128)],
    'T-3.1': [(40, 70, 513, 225, 248)],
    'T-3.2': [(39, 50, 304, 495, 475)],
    'T-3.3': [(213, 300, 39, 243, 412)],
    'T-3.4': [(230, 35, 552, 385, 215)],
    'T-3.5': [(211, 50, 212, 495, 545)],
    'T-3.6': [(214, 75, 39, 485, 680)],
    'chart-stride': [(35, 50, 39, 245, 225)],
    'chart-pace': [(57, 300, 223, 245, 137)],
    'chart-pace-limitation': [(56, 65, 556, 480, 195)],
    'chart-encumbrance': [(56, 20, 140, 165, 247)],
    'chart-exhaustion': [(57, 300, 452, 245, 295), (57, 55, 641, 245, 115)],
    'T-4.1': [(49, 38, 26, 552, 745)],
    'T-4.2': [(50, 300, 206, 260, 551)],
    'T-4.3': [(45, 50, 300, 245, 460)],
    'T-4.4': [(45, 300, 39, 245, 716)],
    'T-4.5': [(46, 320, 329, 230, 430)],
    'T-4.6': [(47, 50, 39, 495, 720)],
    'T-4.7': [(115, 50, 39, 495, 720)],
    'T-5.1': [(68, 50, 141, 495, 615)],
    'T-5.2': [(67, 50, 377, 495, 380)],
    'T-5.3': [(81, 50, 372, 495, 385)],
    'T-5.4': [(76, 325, 39, 232, 716)],
    'T-5.5': [(78, 325, 39, 220, 223)],
    'T-5.6': [(78, 70, 499, 245, 100)],
    'T-5.7': [(71, 300, 507, 245, 248), (72, 50, 39, 495, 246),
                (73, 50, 39, 245, 293), (73, 50, 510, 495, 245)],
    'T-5.8': [(61, 50, 150, 540, 608)],
    'chart-animal-monster': [(150, 20, 138, 525, 640), (151, 50, 30, 495, 724)],
    'A-10.11.1': [(240, 38, 25, 552, 752)],
    'A-10.11.2': [(241, 38, 25, 552, 752)],
}


def extract_region(region):
    page, x, y, width, height = region
    if page in (19, 29, 61, 150):
        return extract_dense_chart(region)
    result = subprocess.run(
        ['pdftotext', '-f', str(page + 1), '-l', str(page + 1), '-r', '72',
         '-layout', '-x', str(x), '-y', str(y), '-W', str(width), '-H', str(height),
         str(PDF), '-'], capture_output=True, text=True, check=True)
    lines = result.stdout.replace('\f', '').splitlines()
    while lines and not lines[0].strip():
        lines.pop(0)
    while lines and not lines[-1].strip():
        lines.pop()
    # Crop-specific text starts at column zero after this; keep internal spaces.
    left = min((len(line) - len(line.lstrip()) for line in lines if line.strip()), default=0)
    text = '\n'.join(line[left:].rstrip() for line in lines)
    text = text.replace('ROLEMASTER', '').replace('  BH  ', '  ')
    return {'printedPage': page, 'pdfPage': page + 1, 'text': text}


def extract_dense_chart(region):
    """Keep the last monster rows together where PDF footer text overlaps them."""
    page, x, y, width, height = region
    result = subprocess.run(
        ['pdftotext', '-f', str(page + 1), '-l', str(page + 1),
         '-bbox-layout', str(PDF), '-'], capture_output=True, text=True, check=True)
    root = ET.fromstring(result.stdout)
    rows = {}
    for word in root.iter():
        if not word.tag.endswith('word'):
            continue
        wx, wy, wxmax = (float(word.attrib[key]) for key in ('xMin', 'yMin', 'xMax'))
        value = word.text or ''
        if not (x <= wx < x + width and y <= wy < y + height):
            continue
        if page in (19, 29) and wx >= 550 and wy < 120 and value in {'a', 'Part', 'II', 'Creating', 'Character'}:
            continue
        if page == 29 and wx >= 550 and 690 <= wy <= 750 and value in {'ROLEMASTER', 'BH', '29'}:
            continue
        if page == 150 and wx < 80 and 690 <= wy <= 739 and value in {'ROLEMASTER', 'BH', '150'}:
            continue
        if page == 61 and wx >= 545 and 690 <= wy <= 740 and value in {'ROLEMASTER', 'BH', '61'}:
            continue
        rows.setdefault(round(wy), []).append((wx, wxmax, value))
    lines = []
    for _, words in sorted(rows.items()):
        words.sort()
        line = ''
        last_end = x
        for wx, wxmax, value in words:
            gap = max(1, round((wx - last_end) / 4)) if line else 0
            line += ' ' * min(gap, 30) + value
            last_end = wxmax
        lines.append(line)
    return {'printedPage': page, 'pdfPage': page + 1,
            'text': '\n'.join(lines)}


index = json.loads((TABLES / 'index.json').read_text())
for entry in index:
    code = entry['code']
    if code.startswith(('A-10.9.', 'A-10.10.')):
        continue
    regions = REGIONS[code]
    table_pages = [extract_region(region) for region in regions]
    if code == 'T-1.6':
        page = table_pages[0]
        lines = page['text'].splitlines()
        first_row = next(i for i, line in enumerate(lines) if line.startswith('Armor • Light'))
        page['text'] = '\n'.join([
            lines[0],
            'Race columns: Common Men | High Men | Wood Elves | Dwarves | Halflings',
            *lines[first_row:]
        ])
    if code == 'T-4.1':
        page = table_pages[0]
        page['text'] = re.sub(r'\bPart III\b|\bPerforming\b|\bActions\b', '', page['text'])
        page['text'] = re.sub(r'(?m)^\s*49(?=\s{2,})', '', page['text'])
        page['text'] = '\n'.join(line.rstrip() for line in page['text'].splitlines()).rstrip()
    if code == 'A-10.11.1':
        page = table_pages[0]
        lines = page['text'].splitlines()
        title_end = next(i for i, line in enumerate(lines) if 'TABLE A-10.11.1' in line)
        page['text'] = '\n'.join(['WEAPON FUMBLE TABLE A-10.11.1', *lines[title_end + 1:]])
        page['text'] = re.sub(r'(?m)^\s*40(?=\s+Key:)', '', page['text'])
    if code == 'A-10.11.2':
        table_pages[0]['text'] = re.sub(r'\s+241$', '', table_pages[0]['text'])
    if not all(page['text'] for page in table_pages):
        raise RuntimeError(f'Empty region in {code}')
    pages = list(dict.fromkeys(page['printedPage'] for page in table_pages))
    record = {'code': code, 'title': entry['title'], 'printedPages': pages,
              'file': entry['file'], 'tablePages': table_pages}
    if code == 'T-2.8':
        old = json.loads((TABLES / entry['file']).read_text())
        record['professions'] = old['professions']
        record['categories'] = old['categories']
        del record['tablePages']  # This table already has exact, usable cells.
    (TABLES / entry['file']).write_text(json.dumps(record, ensure_ascii=False, separators=(',', ':')) + '\n')
    entry['printedPages'] = pages
    print(f'{code}: {len(table_pages)} region(s), {sum(len(p["text"].splitlines()) for p in table_pages)} lines')
(TABLES / 'index.json').write_text(json.dumps(index, indent=2, ensure_ascii=False) + '\n')
