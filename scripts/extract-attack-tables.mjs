import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const pdf = fileURLToPath(new URL('../Rolemaster FRP - CORE Rules - OCR.pdf', import.meta.url));
const armorColumns = Array.from({ length: 20 }, (_, index) => ({ label: `AT ${20 - index}`, group: ['Plate', 'Chain', 'Rigid leather', 'Soft leather', 'No armor'][index < 4 ? 0 : index < 8 ? 1 : index < 11 ? 2 : index < 16 ? 3 : 4] }));
const spellColumns = [
  ['Metal armor', 'Essence'], ['Leather armor', 'Essence'], ['Other', 'Essence'],
  ['Metal armor', 'Channeling'], ['Metal shield', 'Channeling'], ['Other', 'Channeling'],
  ['Metal helmet', 'Mentalism'], ['Leather helmet', 'Mentalism'], ['Other', 'Mentalism']
].map(([label, group]) => ({ label, group }));
const definitions = [
  ['One-handed concussion', 'A-10.9.1', 221], ['One-handed edged', 'A-10.9.2', 222],
  ['Two-handed weapon', 'A-10.9.3', 223], ['Missile weapon', 'A-10.9.4', 224],
  ['Pole arm weapon', 'A-10.9.5', 225], ['Thrown weapon', 'A-10.9.6', 226],
  ['Tooth & claw', 'A-10.9.7', 227], ['Bash & grapple', 'A-10.9.8', 228],
  ['Bolt spell', 'A-10.9.9', 229], ['Ball spell', 'A-10.9.10', 230],
  ['Basic spell', 'A-10.9.11', 231]
];
const rangeToken = /^(?:\d{1,3}-\d{1,3}|XX-\d{1,3}|\d{1,3})$/;
const cellToken = /^(?:[+-]?\d+[A-E]?|F|[-–—])$/;

const tables = definitions.map(([name, code, page], index) => {
  let raw;
  try {
    raw = execFileSync('pdftotext', ['-f', String(page), '-l', String(page), '-layout', pdf, '-'], { encoding: 'utf8' });
  } catch (error) {
    if (error.status !== 0) throw error;
    raw = error.stdout || error.output?.[1];
  }
  const columns = index === 10 ? spellColumns : armorColumns;
  const rows = [];
  let section = '';
  for (const sourceLine of raw.split(/\r?\n/)) {
    const line = sourceLine.trim().replace(/\s+/g, ' ');
    if (/^Maximum (?:Modified )?Result for /i.test(line)) {
      section = line;
      continue;
    }
    const tokens = line.split(' ');
    let start = tokens[0] === 'UM' ? 1 : 0;
    if (!rangeToken.test(tokens[start] || '')) continue;
    const roll = tokens[start++];
    const values = [];
    while (start < tokens.length && cellToken.test(tokens[start]) && values.length < columns.length) values.push(tokens[start++].replace(/[–—]/g, '–'));
    if (values.length !== columns.length) continue;
    rows.push({ roll, unmodified: tokens[0] === 'UM', section, values });
  }
  if (!rows.length) throw new Error(`No rows found for ${code} on PDF page ${page}`);
  return { name, code, page, columns, rows };
});

const outputDirectory = new URL('../tables/', import.meta.url);
mkdirSync(outputDirectory, { recursive: true });
for (const table of tables) writeFileSync(new URL(`${table.code}.json`, outputDirectory), `${JSON.stringify(table, null, 2)}\n`);
console.log(`Wrote ${tables.length} structured attack table files to tables/`);
