import {a4Skills, raceWeaponChoices, raceStartingLanguages, raceAdolescenceLanguages, backgroundExtraLanguages, adolescenceRaces} from './app-data.js';

// Specific examples from Core Rules A-4 (pp. 112–133), A-1 and A-7.
// Open-ended families without a named example are deliberately not offered.
const instances = (skill, subjects) => subjects.map(subject => `${skill} (${subject})`);
const specific = {
  'Artistic • Active': instances('Play Instrument', ['flute', 'drum', 'lute']),
  'Athletic • Brawn': ['Athletic Games (Wrestling)'],
  'Athletic • Gymnastics': ['Athletic Games (Soccer)', 'Athletic Games (Basketball)'],
  'Awareness • Senses': [...instances('Sense Awareness', ['sight', 'touch']), ...instances('Situational Awareness', ['Combat', 'Scouting', 'Sleep', 'Urban'])],
  Crafts: ["Barber", "Billeting", "Book Maker", "Calligraphy", "Candle Maker", "Ceramics", "Cooper", "Crocheting", "Drafting", "Dying", "Embalmer", "Embroidering", "Enameler", "Fletching", "Furrier", "Glass Blower", "Guide", "Horticulture", "Knitting", "Masseur", "Messenger/Runner", "Miller", "Net Maker", "Paper making", "Potter", "Quilting", "Roofer", "Sail Maker", "Scribe", "Seneschal", "Service", "Sewing/Weaving", "Skinning", "Spinner", "Stewardship", "Tailoring", "Taxidermist", "Trapping", "Tube Hollower", "Upholstery", "Valet", "Weaving", "Wicker Worker"],
  'Directed Spells': ['Fire Bolt', 'Ice Bolt', 'Lightning Bolt', 'Shock Bolt', 'Water Bolt'],
  'Lore • General': [...instances('History', ['World', 'Military', 'Kingdom of Harran', 'Guild of Architects of Jeppod']), ...instances('Race Lore', adolescenceRaces), 'Own Race Lore', 'Own Region Lore'],
  'Lore • Obscure': ['Xeno-Lore (Shimmiebop Philosophy)'],
  'Outdoor • Animal': [...instances('Animal Handling', ['horse', 'dog', 'bird of prey', 'bear', 'big cat']), ...instances('Animal Training', ['bird of prey', 'dog', 'bear', 'big cat']), ...instances('Driving', ['wagon', 'cart', 'sleigh']), ...instances('Riding', ['horse', 'elephant', 'Dragon'])],
  'Outdoor • Environmental': instances('Survival', ['desert', 'jungle', 'arctic', 'water', 'underground', 'vacuum', 'underwater', 'elemental plane of fire']),
  'Science/Analytic • Specialized': ['Astronomy', 'Biochemistry', 'Chemistry', 'Linguistics', 'Planetology', 'Physics', 'Psychology'],
  'Technical/Trade • Professional': instances('Diagnostics', ['general', ...adolescenceRaces]),
  'Technical/Trade • Vocational': instances('Tactics', ['Battle Field', 'Naval', 'Sabotage', 'Siege', 'Small Unit']),
  'Weapon • 1-H Concussion': ['Club', 'Mace', 'Morning star', 'War hammer'],
  'Weapon • 1-H Edged': ['Broadsword', 'Dagger', 'Handaxe', 'Short sword', 'Scimitar', 'Katana'],
  'Weapon • 2-Handed': ['Flail', 'Quarterstaff', 'Two-handed sword', 'War mattock', 'Katana'],
  'Weapon • Missile': ['Composite bow', 'Long bow', 'Short bow', 'Light crossbow', 'Heavy crossbow', 'Sling'],
  'Weapon • Missile Artillery': ['Catapult', 'Trebuchet'],
  'Weapon • Pole Arms': ['Halbard', 'Lance', 'Spear', 'Pike', 'Glaive-guisarme'],
  'Weapon • Thrown': ['Dagger', 'Dart', 'Javelin', 'Handaxe', 'Spear']
};
// A-7 Weapon Chart (p. 148), Type column; dual-use weapons have separate skills.
const equipmentWeapons = {
  "Weapon • 1-H Edged": [
    "Axe",
    "Bastard sword",
    "Broadsword",
    "Cat-o’-nine tails",
    "Claymore",
    "Cutlass",
    "Dagger",
    "Dirk",
    "Falchion",
    "Foil",
    "Handaxe",
    "Long sword",
    "Main gauche",
    "Rapier",
    "Sabre",
    "Sai",
    "Scimitar",
    "Short sword",
    "Tomahawk"
  ],
  "Weapon • 2-Handed": [
    "Bastard sword",
    "Battle axe",
    "Cudgel",
    "Flail",
    "Jo",
    "No-dachi",
    "Nunchaku",
    "Pick",
    "Quarterstaff",
    "Two-handed sword",
    "War mattock"
  ],
  "Weapon • 1-H Concussion": [
    "Blackjack",
    "Cat-o’-nine tails",
    "Club",
    "Cudgel",
    "Jo",
    "Mace",
    "Morning star",
    "Net (fishing)",
    "Net (gladiator)",
    "Nunchaku",
    "Tonfa",
    "War hammer",
    "Whip"
  ],
  "Weapon • Missile": [
    "Blowpipe",
    "Composite bow",
    "Heavy crossbow",
    "Light crossbow",
    "Long bow",
    "Short bow",
    "Sling"
  ],
  "Weapon • Pole Arms": [
    "Boar spear",
    "Halbard",
    "Javelin",
    "Lance",
    "Pilum",
    "Spear",
    "Trident"
  ],
  "Weapon • Thrown": [
    "Bola (2 handed)",
    "Boomerang",
    "Dagger",
    "Dart",
    "Harpoon",
    "Javelin",
    "Lasso",
    "Net (fishing)",
    "Net (gladiator)",
    "Pilum",
    "Shuriken",
    "Spear",
    "Tomahawk"
  ]
};
for (const [category, names] of Object.entries(equipmentWeapons)) specific[category].push(...names);
const languages = new Set([
  ...Object.values(raceStartingLanguages).flat().map(([name]) => name),
  ...Object.values(raceAdolescenceLanguages).flat().map(([name]) => name),
  ...Object.values(backgroundExtraLanguages).flat().map(([name]) => name)
]);
specific.Communications = [...languages].flatMap(name => [`${name} (spoken)`, `${name} (written)`]);
for (const categories of Object.values(raceWeaponChoices)) {
  for (const [category, names] of Object.entries(categories)) specific[category].push(...names);
}

// A-9.5–A-9.16: open, closed, pure profession base, semi profession base.
const spellGroups = {
  5: ['Channeling', 'Open'], 6: ['Channeling', 'Closed'], 7: ['Channeling', 'Own Base', 'Cleric'], 8: ['Channeling', 'Own Base', 'Ranger'],
  9: ['Essence', 'Open'], 10: ['Essence', 'Closed'], 11: ['Essence', 'Own Base', 'Magician'], 12: ['Essence', 'Own Base', 'Dabbler'],
  13: ['Mentalism', 'Open'], 14: ['Mentalism', 'Closed'], 15: ['Mentalism', 'Own Base', 'Mentalist'], 16: ['Mentalism', 'Own Base', 'Bard']
};
export function createSkillCatalog(spellLists = []) {
  const catalog = Object.entries(a4Skills).flatMap(([category, names]) => [...new Set([
    ...names.split('|').filter(name => name && !name.endsWith('*')), ...(specific[category] || [])
  ])].map(name => ({category, name})));
  for (const list of spellLists) {
    const group = spellGroups[list.id.split('.')[1]];
    if (!group) throw new Error(`Unknown spell list group: ${list.id}`);
    const [realm, type, profession] = group;
    catalog.push({id:list.id, name:list.name.replace(/([’'])S\b/g, '$1s'), category:`Spells • Own Realm ${type} Lists`, realm, profession});
  }
  return catalog;
}
export function skillNames(catalog, category, {realm, profession} = {}) {
  return [...new Set(catalog.filter(skill => skill.category === category && (!skill.realm || skill.realm === realm) && (!skill.profession || skill.profession === profession)).map(skill => skill.name))].sort((a,b) => a.localeCompare(b));
}
