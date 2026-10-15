"""Original 32px equipment icons, reproducible SVG with no external assets."""
from pathlib import Path
out = Path(__file__).resolve().parents[1] / 'assets' / 'coliseum'
icons = {}
def path(d, color):
    return f'<path d="{d}" fill="{color}" stroke="#30352f" stroke-width="1" stroke-linejoin="miter"/>'
def rect(x, y, w, h, color):
    return path(f'M{x} {y}h{w}v{h}h-{w}z', color)
steel, shine, gold, wood, leather = '#91a9ae', '#d8e4d4', '#d5b76e', '#a57849', '#866044'
icons['sword'] = path('M13 21V7l3 -5 3 5v14z',steel)+rect(16,7,2,14,shine)+rect(8,20,16,3,gold)+rect(14,23,4,6,leather)+rect(12,29,8,2,gold)
icons['dagger'] = path('M13 21V12l3 -5 3 5v9z',shine)+rect(10,20,12,3,gold)+rect(14,23,4,6,leather)
icons['axe'] = rect(14,5,4,25,wood)+path('M16 7h8l5 -4v14l-5 -3h-8z',steel)+rect(25,5,3,10,shine)
icons['mace'] = rect(14,13,4,17,wood)+path('M10 3h12l4 5 -4 8h-12l-4 -8z',steel)+rect(14,4,4,10,shine)+rect(12,25,8,3,gold)
icons['hammer'] = rect(14,12,4,18,wood)+path('M4 5h23v9h-23z',steel)+rect(5,6,4,7,shine)+rect(24,6,3,7,gold)
icons['spear'] = rect(14,12,3,19,wood)+path('M11 12l5 -11 5 11 -5 5z',steel)+rect(15,5,2,9,shine)
icons['staff'] = rect(14,9,4,21,wood)+path('M10 4l6 -3 6 3v6l-6 4 -6 -4z','#79aaa1')+rect(14,4,4,6,'#d4e5c7')
icons['bow'] = path('M9 2h5l10 8v12l-10 8h-5l10 -10v-8z',wood)+rect(9,3,1,26,shine)+rect(3,15,25,2,wood)+path('M26 13l4 3 -4 3z',steel)
icons['crossbow'] = path('M3 8h5l8 7 8 -7h5l-4 9h-18z',wood)+rect(14,10,5,20,leather)+rect(15,2,2,19,shine)+rect(4,10,24,1,shine)
icons['sling'] = path('M9 3h2v16l5 7 5 -7v-16h2v17l-7 10 -7 -10z',wood)+path('M11 21h10l-5 8z',leather)
icons['shield'] = path('M4 5l12 -3 12 3v14l-5 6 -7 5 -7 -5 -5 -6z','#587d94')+rect(14,5,4,20,gold)+rect(6,12,20,4,gold)
icons['helmet'] = path('M5 25v-13l5 -7h12l5 7v13h-8v-9h-6v9z',steel)+rect(9,9,14,3,shine)+rect(6,14,9,3,'#354847')+rect(18,14,9,3,'#354847')
icons['armor'] = path('M6 4h6v5h8v-5h6l4 9 -6 3v13h-16v-13l-6 -3z',steel)+rect(10,12,12,12,'#607f88')+rect(14,10,3,16,shine)
icons['leather'] = path('M6 4h6v5h8v-5h6l4 9 -6 3v13h-16v-13l-6 -3z',leather)+rect(15,9,3,18,wood)+rect(8,23,16,4,'#544737')+rect(14,23,5,4,gold)
icons['robe'] = path('M8 4h5l3 5 3 -5h5l6 14 -6 2 -3 -6 5 16h-20l5 -16 -3 6 -6 -2z','#72628e')+rect(15,10,2,19,gold)
icons['cloak'] = path('M10 3h12l5 8 -3 3 5 16h-26l5 -16 -3 -3z','#5c7958')+path('M11 5h10l2 8h-14z','#354f42')+rect(14,14,4,4,gold)
icons['boots'] = path('M5 3h8v18l3 4v5h-14v-7h3z M19 3h8v18l3 4v5h-14v-7h3z',leather)+rect(5,4,8,4,wood)+rect(19,4,8,4,wood)
icons['gloves'] = path('M6 4h4v10h2v-12h4v12h2v-10h4v12h2v-8h4v15l-7 7h-11l-8 -11v-8h4z',leather)
icons['pack'] = path('M8 7v-4h16v4h4v23h-24v-23z',leather)+rect(7,8,18,10,wood)+rect(9,21,14,7,wood)+rect(14,14,4,7,gold)
icons['potion'] = rect(12,2,8,5,wood)+path('M12 7h8v6l6 6v9h-20v-9l6 -6z',shine)+path('M8 20h16v6h-16z','#a54f53')
icons['rope'] = path('M9 3h14l5 5v17l-5 5h-14l-5 -5v-17z',wood)+path('M12 8h8l3 4v10l-3 3h-8l-3 -3v-10z','#e4d8ab')+rect(14,9,3,20,gold)
icons['torch'] = path('M12 16h8l-2 14h-4z',wood)+path('M10 16l-3 -6 6 -8 2 6 5 -7 5 10 -4 5z','#d78a43')+path('M12 15l4 -8 4 8z','#efd277')
icons['book'] = path('M5 3h21v25h-21z','#665d83')+rect(8,5,15,20,'#dfd1a8')+rect(5,3,4,25,leather)+rect(12,7,10,2,gold)
icons['quiver'] = path('M9 10h14l-2 20h-10z',leather)+rect(12,2,2,17,wood)+rect(18,1,2,17,wood)+path('M10 2h6l-3 5z M16 1h6l-3 5z',shine)
icons['ring'] = path('M8 12h16l4 5v9l-5 5h-14l-5 -5v-9z',gold)+path('M11 17h10l2 3v4l-3 3h-8l-3 -3v-4z','#f1e8cc')+path('M10 3h12l3 6 -9 8 -9 -8z','#7faaa9')
icons['item'] = path('M4 9l12 -6 12 6v16l-12 6 -12 -6z',wood)+path('M4 9l12 6 12 -6 M16 15v16','none')+rect(14,4,4,10,gold)
body=''.join(f'<symbol id="{name}" viewBox="0 0 32 32">{art}</symbol>' for name,art in icons.items())
(out/'equipment.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">'+body+'</svg>\n')
print(f'Built {len(icons)} original equipment icons.')
