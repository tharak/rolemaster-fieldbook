"""Build original, code-drawn pixel artwork. No reference-image pixels are used."""
from pathlib import Path
from random import Random
import re

out = Path(__file__).resolve().parents[1] / 'assets' / 'coliseum'
out.mkdir(parents=True, exist_ok=True)
rng = Random(620)
parts = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 270" preserveAspectRatio="none" shape-rendering="crispEdges">']
def rect(x, y, w, h, fill):
    parts.append(f'<path fill="{fill}" d="M{x} {y}h{w}v{h}h-{w}z"/>')
def path(d, fill):
    parts.append(f'<path fill="{fill}" d="{d}"/>')

rect(0, 0, 480, 270, '#cbd7ac')
rect(0, 0, 480, 132, '#514b3a')
# Three tiers: individual spectators, stepped seats and stone balustrades.
for tier, (y, height) in enumerate([(14, 29), (49, 34), (89, 33)]):
    rect(0, y, 480, height, '#70674a')
    for row in range(4):
        for x in range(-4, 484, 5):
            px = x + row % 2 * 2
            py = y + 3 + row * 6
            color = rng.choice(['#d3bd79', '#bd965b', '#768767', '#a6a68c', '#e3d39c', '#977650'])
            rect(px, py, 2, 2, '#ddc79a')
            rect(px - 1, py + 2, 4, 3, color)
    rect(0, y + height, 480, 3, '#c2b58a')
    rect(0, y + height + 3, 480, 3, '#484b3d')
    for x in range(8, 480, 48):
        rect(x, y - 2, 5, height + 4, '#797c64')
        rect(x, y - 2, 2, height + 4, '#aaa589')
        rect(x - 2, y - 3, 9, 3, '#beb18b')
        rect(x - 2, y + height, 9, 3, '#aca482')
        if tier != 1:
            path(f'M{x+6} {y+2}h36v2h-4v2h-4v2h-4v2h-12v-2h-4v-2h-4v-2h-4z', '#c5ad72')

# Foreground arcade with a central portcullis and two pennants.
rect(0, 128, 480, 47, '#777a62')
for y in range(130, 174, 7):
    rect(0, y, 480, 1, '#656a56')
    for x in range((y // 7 % 2) * 12, 480, 24):
        rect(x, y, 1, 7, '#999b7b')
for x in range(9, 480, 46):
    path(f'M{x} 172v-26h3v-4h4v-3h10v3h4v4h3v26z', '#3e493b')
    path(f'M{x+3} 172v-24h3v-4h4v-2h2v2h4v4h3v24z', '#525941')
    rect(x - 3, 137, 4, 38, '#b2ae86')
    rect(x - 4, 136, 6, 4, '#d0c59b')
rect(198, 113, 84, 61, '#929479')
rect(198, 113, 84, 5, '#c8bc91')
rect(202, 121, 76, 3, '#a9a986')
path('M214 174v-34h3v-7h5v-5h36v5h5v7h3v34z', '#414b36')
path('M220 174v-33h3v-7h34v7h3v33z', '#676b40')
for x in range(224, 260, 7):
    rect(x, 134, 2, 40, '#282f27')
for y in range(143, 174, 9):
    rect(220, y, 40, 2, '#282f27')
for x, color, light in [(179, '#9e4338', '#cb6750'), (288, '#3e6285', '#7196b0')]:
    rect(x - 2, 117, 2, 47, '#d2c293')
    path(f'M{x} 120h15v28l-7 -5 -8 5z', color)
    rect(x + 3, 120, 2, 23, light)
    rect(x - 4, 116, 20, 2, '#d4bc77')

# Turf: hand-placed bands plus seeded fine pixel texture.
rect(0, 173, 480, 97, '#a2ae67')
rect(0, 173, 480, 5, '#758a50')
rect(0, 178, 480, 8, '#9eaf66')
rect(0, 186, 480, 16, '#b9c47b')
rect(0, 202, 480, 18, '#c6cb83')
rect(0, 220, 480, 50, '#b8bd75')
for _ in range(760):
    x, y = rng.randrange(480), rng.randrange(180, 270)
    rect(x, y, rng.choice([1, 2, 3, 5]), 1, rng.choice(['#cdd18a', '#b0ba72', '#a5b16a', '#bec680']))
parts.append('</svg>')
(out / 'arena.svg').write_text(''.join(parts) + '\n')

# Sprite silhouettes use a 96 × 80 grid. Every family faces right; CSS mirrors
# the right contender. Pixel polygons, short highlights and a dark one-pixel edge.
symbols = []
def sprite(name, body):
    symbols.append(f'<symbol id="{name}" viewBox="0 0 96 80"><g stroke="#292e28" stroke-width="1.4" stroke-linejoin="miter">{body}</g></symbol>')
def pixel_path(d):
    """Turn polygon diagonals into single-grid-pixel stair steps."""
    tokens = re.findall(r'[MmLlHhVvZz]|-?\d+', d)
    result, point, origin, command, index = [], (0, 0), (0, 0), 'M', 0
    def line(a, b):
        steps = max(abs(b[0] - a[0]), abs(b[1] - a[1]))
        current = a
        for step in range(1, steps + 1):
            target = tuple(round(a[axis] + (b[axis] - a[axis]) * step / steps) for axis in (0, 1))
            if target[0] != current[0]:
                result.append(f'H{target[0]}')
            if target[1] != current[1]:
                result.append(f'V{target[1]}')
            current = target
    while index < len(tokens):
        if tokens[index].isalpha():
            command = tokens[index]
            index += 1
        if command.lower() == 'z':
            line(point, origin)
            result.append('z')
            point = origin
            continue
        a = int(tokens[index]); index += 1
        if command.lower() in ('m', 'l'):
            b = int(tokens[index]); index += 1
            target = (a, b) if command.isupper() else (point[0] + a, point[1] + b)
        elif command.lower() == 'h':
            target = (a if command.isupper() else point[0] + a, point[1])
        else:
            target = (point[0], a if command.isupper() else point[1] + a)
        if command.lower() == 'm':
            result.append(f'M{target[0]} {target[1]}')
            origin = target
            command = 'L' if command.isupper() else 'l'
        else:
            line(point, target)
        point = target
    return ''.join(result)
def p(d, fill):
    return f'<path d="{pixel_path(d)}" fill="{fill}" stroke-width="1"/>'
def r(x, y, w, h, fill):
    return f'<path stroke="none" d="M{x} {y}h{w}v{h}h-{w}z" fill="{fill}"/>'

legs = 'M29 49h9v8l-4 9h-10v-4h5z M54 48h10v12h6v6h-13v-9h-4z'
quad = 'M19 42l-8 -5 -7 -12 8 5 12 5h29l9 -8h12l7 8 10 3v7l-12 3 -9 -3 -9 10h-34l-10 -5z'
sprite('wolf', p(legs, '#6b777c') + p(quad, '#9faeb0') + p('M62 28v-11l8 10 7 -9 2 14z', '#b9c3bd') + p('M24 39h29l8 -6 6 7 -7 10h-31z', '#cbd0bd') + p('M73 40h17v6h-15l-8 -3z', '#dee0c6') + r(74, 34, 3, 3, '#eac674') + r(86, 38, 4, 4, '#282e2d') + r(31, 62, 6, 3, '#d6d7bf'))
sprite('tiger', p(legs, '#b7763a') + p(quad, '#dc9c45') + p('M62 28v-7h6l4 6 3 -6h6v13z', '#e8b35e') + p('M25 48h31l7 -5 5 7 -8 6h-34z', '#f1d3a1') + p('M73 40h17v6h-16l-7 -3z', '#f5deb0') + p('M28 35l5 2 -2 11 -5 -3z M41 35l5 1 -2 11 -4 -2z M54 35h4l-1 8 -4 4z M65 30l4 1 1 7 -4 -3z', '#453d2c') + r(76, 34, 3, 3, '#282e2d') + r(86, 39, 4, 3, '#49372a'))
sprite('bear', p('M25 46h13v15h6v7h-23v-5h4z M53 46h15v15h5v7h-21z', '#654a37') + p('M15 43v-13l8 -8h33l10 4h12l10 9v15l-12 4 -8 -7 -13 10h-31z', '#876447') + p('M67 25v-7h8v8z M20 29l9 -4h24l10 9 -6 10h-32z', '#a77b50') + p('M74 40h16v8h-15l-6 -4z', '#d0aa74') + r(76, 33, 3, 3, '#251f1d') + r(87, 40, 4, 3, '#392e24'))
sprite('dragon', p('M31 42l-19 -8 -6 -12 12 5 19 4z M36 50l-3 14h-9v4h19l4 -16 M60 48l4 14h10v6h-19l-5 -16', '#3f6650') + p('M34 39l-12 -22 3 -12 16 11 14 22 7 -20 13 -8 -2 17 -10 20z', '#557b63') + p('M29 14l11 8 8 14 -13 -5z M68 18l-8 17 10 -8z', '#b39159') + p('M21 43l15 -13h21l11 -10h12l6 14h8v7l-17 5 -14 -5 -8 16h-26z', '#749969') + p('M61 25l8 -12 2 13 9 -12 -1 14z', '#d3bd76') + p('M34 35h20l7 7 -8 9h-21z', '#a6b47a') + r(79, 31, 3, 3, '#eaca70') + r(89, 36, 4, 3, '#3c4635'))
sprite('serpent', p('M14 64l-4 -10 7 -14h26l8 9h-25l-4 6h35l8 -17 -7 -12 4 -13h18l10 9 -2 13h-12l-1 23 -13 10h-42z', '#738958') + p('M24 61h37l7 -22h7l-4 24 -11 5h-36z', '#c6bc76') + p('M64 17l10 8h13l-5 -8z', '#a3ad69') + r(79, 24, 3, 3, '#e5c566') + p('M86 34h7v2h-8z', '#a24e40'))
sprite('bird', p('M43 39l-27 -13 -9 -14 16 6 28 13 14 -11 20 -8 -8 18 -17 15z', '#667a7a') + p('M40 39l-15 -4 -16 2 17 10 17 5z M49 48l-6 12h-10v4h16l6 -15z M56 47l2 13h8v4h-13l-3 -16z', '#b49b56') + p('M35 39l9 -15h18l9 13 -7 17h-19z', '#b5b29b') + p('M61 25l4 -12h13l5 10 -7 10h-12z', '#ddd8b6') + p('M78 22h12l-8 7 -6 -2z', '#c8a757') + r(75, 19, 3, 3, '#302f29'))
sprite('insect', p('M32 43l-16 -8 -9 3 4 4 11 -2 14 10 M34 52l-13 7 -5 10h6l5 -7 14 -6 M50 53l11 9 2 7h6l-3 -10 -10 -12 M60 41l12 -8h12l4 4 -14 1 -10 9', '#675044') + p('M12 47l6 -13h22l7 12 -7 13h-22z', '#937444') + p('M37 43l6 -10h15l7 12 -7 12h-15z', '#b18b4e') + p('M60 42l7 -12h15l8 11 -8 13h-15z', '#a58149') + p('M69 32l-7 -15 3 -2 9 16 M80 32l4 -16h4l-3 18 M82 47l11 -2 -3 8 -8 1', '#6d5033') + r(79, 37, 4, 4, '#e4cd7d') + p('M20 36v20 M28 35v21', 'none'))
sprite('humanoid', p('M36 48h12l-5 15h-11v6h19l5 -17 M53 47h10l3 15h10v7h-18l-6 -15', '#574c41') + p('M33 26h28l11 13 -9 9 -8 -7v13h-21l-4 -14 -8 7 -7 -6z', '#71835c') + p('M39 11h19l5 8 -4 15h-21l-5 -11z', '#b2b18a') + p('M39 11l-4 -7 11 7h10l8 -6 -5 14 -8 -3h-12z', '#88916d') + p('M18 39l9 1 5 8 -8 5 -9 -6z', '#b2b18a') + p('M67 36l12 -4 6 12 -10 7 -7 -4z', '#a7a780') + p('M80 48l-1 -29 4 -1 6 47 -6 1z M72 17l4 -11h14l5 12 -7 10h-12z', '#7c6e54') + r(42, 22, 3, 3, '#292d28') + r(55, 22, 3, 3, '#292d28') + r(44, 30, 12, 2, '#686a4b'))
sprite('horse', p('M27 46h8l-4 19h-10v-4h5z M56 43h9l4 18h8v5h-15l-7 -14', '#775846') + p('M12 37l8 -7h33l8 -19h12l8 10 9 6 -3 9h-13l-9 19h-40l-11 -10 -9 9 -2 -11z', '#b59468') + p('M59 15l3 -8 7 4 5 -4 3 10 -8 -3 -4 17 -10 9z', '#504238') + r(75, 22, 3, 3, '#272b26') + p('M29 35h21l8 5 -9 9h-23z', '#c9b188'))
sprite('aquatic', p('M18 46l-14 -15v30z M24 43l15 -14h26l20 15 -7 12 -19 7h-24l-15 -10z', '#708f8c') + p('M39 30l11 -18 10 19 M42 56l9 12 11 -7', '#4c6b70') + p('M34 49h44l-12 10h-28z', '#b4c1aa') + r(71, 39, 4, 4, '#2b3833') + p('M82 46l-9 4h8z', '#e1d5b0'))
sprite('elemental', p('M23 66l-8 -11 7 -8 -3 -13 13 3 5 -17 8 8 12 -20 4 22 11 -9 2 17 12 -2 -6 16 8 10 -14 9h-40z', '#ba6841') + p('M34 64l-9 -10 10 -9 5 -12 7 9 11 -20 1 25 13 -8 -1 17 8 7 -16 4h-24z', '#e0a550') + p('M43 64l-4 -12 9 -10 5 11 9 -4 -4 15z', '#f2d17c') + r(42, 40, 4, 4, '#523c2d') + r(58, 40, 4, 4, '#523c2d'))
sprite('turtle', p('M22 50l-5 10h12l7 -8 M55 51l3 10h13l-6 -10', '#748157') + p('M15 49l6 -16 13 -11h23l15 10 5 18z', '#73805a') + p('M22 45l5 -11 13 -8h13l12 9 6 10z', '#9ca372') + p('M34 31l8 -5 7 10 -5 11h-12l-6 -8z M51 32l9 1 7 11h-15z', '#bac18a') + p('M68 44l10 -8h12l5 9 -8 10h-15z', '#b4b37b') + r(86, 41, 3, 3, '#2c352a'))
(out / 'creatures.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">' + ''.join(symbols) + '</svg>\n')
print('Built arena and 12 original creature-family sprites.')
