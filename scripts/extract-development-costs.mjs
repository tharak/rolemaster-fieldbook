import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const pdf = fileURLToPath(new URL('../Rolemaster FRP - CORE Rules - OCR.pdf', import.meta.url));
const professions = ['Fighter', 'Thief', 'Rogue', 'Magician', 'Cleric', 'Mentalist', 'Ranger', 'Dabbler', 'Bard'];
const isCost = value => /^(?:\d+(?:\/\d+){0,2}|[-–—])$/.test(value);
const categoryNames = [
  'Armor • Heavy', 'Armor • Light', 'Armor • Medium', 'Artistic • Active', 'Artistic • Passive',
  'Athletic • Brawn', 'Athletic • Endurance', 'Athletic • Gymnastics', 'Awareness • Perceptions',
  'Awareness • Searching', 'Awareness • Senses', 'Body Development', 'Combat Maneuvers', 'Communications',
  'Crafts', 'Directed Spells', 'Influence', 'Lore • General', 'Lore • Magical', 'Lore • Obscure',
  'Lore • Technical', 'Martial Arts • Striking', 'Outdoor • Animal', 'Outdoor • Environmental',
  'Power Awareness', 'Power Point Development', 'Science/Analytic • Basic', 'Science/Analytic • Specialized',
  'Self Control', 'Spells • Own Realm Closed Lists', 'Spells • Own Realm Open Lists',
  'Spells • Own Realm Own Base Lists', 'Subterfuge • Attack', 'Subterfuge • Mechanics',
  'Subterfuge • Stealth', 'Technical/Trade • General', 'Technical/Trade • Professional',
  'Technical/Trade • Vocational', 'Urban', 'Weapon • 1-H Concussion', 'Weapon • 1-H Edged',
  'Weapon • 2-Handed', 'Weapon • Missile', 'Weapon • Missile Artillery', 'Weapon • Pole Arms', 'Weapon • Thrown'
];
let source;
try {
  source = execFileSync('pdftotext', ['-f', '24', '-l', '24', '-layout', pdf, '-'], { encoding: 'utf8' });
} catch (error) {
  if (error.status !== 0) throw error;
  source = error.stdout || error.output?.[1];
}

const categories = {};
for (const sourceLine of source.split(/\r?\n/)) {
  const line = sourceLine.trim().replace(/\s+/g, ' ');
  for (const label of categoryNames) {
    let remainder = '';
    if (label.startsWith('Spells • ')) {
      const spellName = label.slice('Spells • '.length);
      const start = line.indexOf(`${spellName} † `);
      if (start >= 0) remainder = line.slice(start + `${spellName} † `.length);
    } else {
      const start = line.indexOf(`${label} `);
      if (start >= 0) remainder = line.slice(start + label.length + 1);
    }
    if (!remainder) continue;
    const costs = remainder.split(' ').filter(isCost).slice(0, professions.length);
    if (costs.length !== professions.length) continue;
    categories[label] = Object.fromEntries(professions.map((profession, index) => [profession, costs[index] === '–' || costs[index] === '-' || costs[index] === '—' ? null : costs[index].split('/').map(Number)]));
  }
}
if (Object.keys(categories).length !== categoryNames.length) throw new Error(`Found ${Object.keys(categories).length} of ${categoryNames.length} skill categories; missing: ${categoryNames.filter(name => !categories[name]).join(' | ')}`);
const rules = { professions, categories };
mkdirSync(new URL('../tables/', import.meta.url), { recursive: true });
writeFileSync(new URL('../tables/T-2.8.json', import.meta.url), `${JSON.stringify({ code: 'T-2.8', title: 'Standard Skill Category Development Point Costs', sourcePages: [23], ...rules }, null, 2)}\n`);
console.log(`Wrote tables/T-2.8.json (${Object.keys(categories).length} skill categories)`);
