import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const pdf = fileURLToPath(new URL('../Rolemaster FRP - CORE Rules - OCR.pdf', import.meta.url));
let text;
try {
  text = execFileSync('pdftotext', ['-layout', pdf, '-'], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
} catch (error) {
  if (error.status !== 0) throw error;
  text = error.stdout || error.output?.[1];
}
const pdfPages = text.split('\f');
const definitions = [
  ['T-1.1', 'Race Abilities', [13]], ['T-1.2', 'Stat Assignment', [16]], ['T-1.3', 'Potential Stat', [17]],
  ['T-1.4', 'Profession', [15]], ['T-1.5', 'Background Options', [21]], ['T-1.6', 'Adolescence Rank', [19]],
  ['T-1.7', 'Random Role Trait', [29]], ['T-2.1', 'Basic Stat Bonus', [17]], ['T-2.2', 'Skill Bonus', [31]],
  ['T-2.3', 'Stat Gain', [25, 37]], ['T-2.4', 'Spell List Development Point Costs', [103, 127]],
  ['T-2.5', 'Skill Summary', [27]], ['T-2.6', 'Experience Point', [36]], ['T-2.7', 'Training Package Development Point Costs', [25]],
  ['T-2.8', 'Standard Skill Category Development Point Costs', [23]], ['chart-special-progression', 'Special Progression Based on Race', [85, 102]],
  ['T-3.1', 'Battle Round Sequence', [40]], ['T-3.2', 'Common Actions', [39]], ['T-3.3', 'Armor', [35, 104, 213]],
  ['T-3.4', 'Resistance Roll', [52, 230]], ['T-3.5', 'Offensive Capabilities', [211]], ['T-3.6', 'Defensive Capabilities', [214]],
  ['chart-stride', 'Stride Chart', [35]], ['chart-pace', 'Pace Chart', [51, 57]], ['chart-pace-limitation', 'Pace Limitation Chart', [56]],
  ['chart-encumbrance', 'Encumbrance Chart', [56]], ['chart-exhaustion', 'Exhaustion Charts', [57]],
  ['T-4.1', 'Moving Maneuver', [49]], ['T-4.2', 'Standard Moving Maneuver Modifications', [50]],
  ['T-4.3', 'Static Maneuver', [45]], ['T-4.4', 'Standard Static Maneuver Modifications', [45]],
  ['T-4.5', 'Spell Casting Static Maneuver', [46]], ['T-4.6', 'Spell Casting Modifications', [47]], ['T-4.7', 'Language Rank', [115]],
  ['T-5.1', 'Encounter', [68]], ['T-5.2', 'Strategic Movement Rate', [67]], ['T-5.3', 'Magic Item Pricing', [81]],
  ['T-5.4', 'Healing Recovery', [75]], ['T-5.5', 'Race Healing Factors', [78]], ['T-5.6', 'Mental Stat Loss', [78]],
  ['T-5.7', 'Experience Point Charts', [71, 72, 73]], ['T-5.8', 'Master Character', [61]],
  ['chart-animal-monster', 'Animal & Monster Statistics Charts', [150]],
  ['A-10.9.1', 'One-handed Concussion Weapon Attack', [220]], ['A-10.9.2', 'One-handed Edged Weapon Attack', [221]],
  ['A-10.9.3', 'Two-handed Weapon Attack', [222]], ['A-10.9.4', 'Missile Weapon Attack', [223]],
  ['A-10.9.5', 'Pole Arm Weapon Attack', [224]], ['A-10.9.6', 'Thrown Weapon Attack', [225]],
  ['A-10.9.7', 'Tooth & Claw Attack', [226]], ['A-10.9.8', 'Bash & Grapple Attack', [227]],
  ['A-10.9.9', 'Bolt Spell Attack', [228]], ['A-10.9.10', 'Ball Spell Attack', [229]], ['A-10.9.11', 'Basic Spell Attack', [230]],
  ['A-10.10.1', 'Cold Critical Strike', [231]], ['A-10.10.2', 'Heat Critical Strike', [232]],
  ['A-10.10.3', 'Krush Critical Strike', [233]], ['A-10.10.4', 'Puncture Critical Strike', [234]],
  ['A-10.10.5', 'Slash Critical Strike', [235]], ['A-10.10.6', 'Unbalance Critical Strike', [236]],
  ['A-10.10.7', 'Large Creature Critical Strike', [237]], ['A-10.10.8', 'Super Large Creature Critical Strike', [238]],
  ['A-10.10.9', 'Spells Against Creatures Critical Strike', [239]],
  ['A-10.11.1', 'Weapon Fumble', [240]], ['A-10.11.2', 'Spell Failure', [241]]
];

const dir = new URL('../tables/', import.meta.url);
mkdirSync(dir, { recursive: true });
const index = [];
for (const [code, title, printedPages] of definitions) {
  const file = `${code}.json`;
  const sourcePages = printedPages.map(printedPage => {
    const pdfPage = printedPage + 1;
    const pageText = pdfPages[pdfPage - 1] || '';
    const lines = pageText.split(/\r?\n/).filter(line => line.trim());
    return {
      printedPage,
      pdfPage,
      lines: lines.map(line => ({ text: line.replace(/ {2,}/g, ' '), cells: line.trim().split(/\s{2,}/).filter(Boolean) }))
    };
  });
  const record = { code, title, printedPages, file, sourcePages };
  if (code.startsWith('A-10.9.')) {
    const extracted = JSON.parse(readFileSync(new URL(`./${file}`, dir), 'utf8'));
    Object.assign(record, { columns: extracted.columns, rows: extracted.rows });
  }
  if (code.startsWith('A-10.10.')) {
    const extracted = JSON.parse(readFileSync(new URL(`./${file}`, dir), 'utf8'));
    Object.assign(record, { kind: extracted.kind, columns: extracted.columns, rows: extracted.rows });
  }
  if (code === 'T-2.8') {
    const development = JSON.parse(readFileSync(new URL('../tables/T-2.8.json', import.meta.url), 'utf8'));
    record.professions = development.professions;
    record.categories = development.categories;
  }
  writeFileSync(new URL(file, dir), `${JSON.stringify(record)}\n`);
  index.push({ code, title, printedPages, file });
}
writeFileSync(new URL('index.json', dir), `${JSON.stringify(index, null, 2)}\n`);
console.log(`Wrote ${index.length} table source files to tables/`);
