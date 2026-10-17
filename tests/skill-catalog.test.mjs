import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSkillCatalog, skillNames} from '../skill-catalog.js';
import {a4Skills, raceWeaponChoices, backgroundExtraLanguages} from '../app-data.js';
const spells = JSON.parse(readFileSync(new URL('../data/guild/spell-lists.json', import.meta.url)));
const catalog = createSkillCatalog(spells);
test('all core spell lists have unique source identities and correct realm/profession categories', () => {
  assert.equal(catalog.filter(s => s.id).length, 96);
  assert.equal(new Set(catalog.filter(s => s.id).map(s => s.id)).size, 96);
  for (const [realm, professions] of Object.entries({Channeling:['Cleric','Ranger'], Essence:['Magician','Dabbler'], Mentalism:['Mentalist','Bard']})) {
    for (const profession of [...professions, 'Fighter']) {
      const context = {realm, profession};
      assert.equal(skillNames(catalog, 'Spells • Own Realm Open Lists', context).length, 10);
      assert.equal(skillNames(catalog, 'Spells • Own Realm Closed Lists', context).length, 10);
      assert.equal(skillNames(catalog, 'Spells • Own Realm Own Base Lists', context).length, profession === 'Fighter' ? 0 : 6);
    }
  }
  assert.deepEqual(skillNames(catalog, 'Spells • Own Realm Open Lists', {realm:'None'}), []);
  assert.deepEqual(skillNames(catalog, 'Spells • Own Realm Own Base Lists', {realm:'Essence',profession:'Cleric'}), []);
  assert(skillNames(catalog, 'Spells • Own Realm Open Lists', {realm:'Channeling'}).includes('Concussion’s Ways'));
});
test('specific choices replace every template without dropping fixed core skills', () => {
  assert(!catalog.some(s => /\*|^Other |^Weapon$|^Spell list$|^Directed attack$/.test(s.name)));
  assert.equal(new Set(catalog.map(s => `${s.category}:${s.name}`)).size, catalog.length);
  for (const [category, names] of Object.entries(a4Skills)) for (const name of names.split('|').filter(n => !n.endsWith('*'))) {
    assert(skillNames(catalog, category).includes(name), name);
  }
  assert.equal(skillNames(catalog, 'Directed Spells').length, 5);
  assert(skillNames(catalog, 'Artistic • Active').includes('Play Instrument (flute)'));
  assert(skillNames(catalog, 'Outdoor • Animal').includes('Riding (horse)'));
});
test('racial weapon and language grants are offered in the full catalog', () => {
  for (const categories of Object.values(raceWeaponChoices)) for (const [category, names] of Object.entries(categories)) {
    for (const name of names) assert(skillNames(catalog, category).includes(name), name);
  }
  const languages = skillNames(catalog, 'Communications');
  for (const entries of Object.values(backgroundExtraLanguages)) for (const [name] of entries) {
    assert(languages.includes(`${name} (spoken)`));
    assert(languages.includes(`${name} (written)`));
  }
  assert(!languages.some(name => /,|\d/.test(name)));
});

test('every A-7 weapon has a specific skill, including weapons with two uses', () => {
  const equipment = JSON.parse(readFileSync(new URL('../tables/A-7-equipment.json', import.meta.url)));
  const names = new Set(catalog.filter(s => s.category.startsWith('Weapon •')).map(s => s.name.toLowerCase()));
  const aliases = {'crossbow, hvy':'heavy crossbow', 'crossbow, lt.':'light crossbow', 'two-hand sword':'two-handed sword'};
  for (const item of equipment.items.filter(i => i.category === 'Weapons')) {
    const name = item.name.toLowerCase();
    assert(names.has(aliases[name] || name), item.name);
  }
  for (const category of ['Weapon • 1-H Edged', 'Weapon • 2-Handed']) {
    assert(skillNames(catalog, category).includes('Bastard sword'));
    assert(skillNames(catalog, category).includes('Katana'));
  }
});
