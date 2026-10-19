// Presentation only: initials are the arena's original creature symbols.
// Families share a pictogram; full creature names always identify variants.
const families = [
  [/wolf/i,'🐺'], [/tiger/i,'🐯'], [/dragon|wyvern|hydra/i,'🐉'],
  [/^ant /i,'🐜'], [/bear/i,'🐻'], [/eagle|hawk|falcon|condor|roc /i,'🦅'],
  [/cat|cheetah/i,'🐈'], [/lion/i,'🦁'], [/snake|boa|basilisk/i,'🐍'],
  [/crab/i,'🦀'], [/horse|centaur/i,'🐴'], [/unicorn|pegasus/i,'🦄'],
  [/ape|baboon|gorilla/i,'🦍'], [/beetle/i,'🪲'], [/demon/i,'👿'],
  [/undead|lich/i,'💀'], [/goblin|orc|ogre|troll/i,'👹'],
  [/elemental.*AIR/i,'🌪️'], [/elemental.*EARTH|golem/i,'🪨'],
  [/elemental.*FIRE|efreet/i,'🔥'], [/elemental.*WATER/i,'🌊'],
  [/genie/i,'🧞'], [/bat/i,'🦇'], [/bees/i,'🐝'], [/bird|harpy/i,'🐦'],
  [/alligator/i,'🐊'], [/boar/i,'🐗'], [/bull/i,'🐂'], [/deer|elk|moose/i,'🦌'],
  [/dolphin/i,'🐬'], [/elephant/i,'🐘'], [/whale/i,'🐋'],
  [/kraken|squid/i,'🦑'], [/lizard/i,'🦎'], [/lobster/i,'🦞'],
  [/octopus/i,'🐙'], [/owl/i,'🦉'], [/rat/i,'🐀'], [/rhinoceros/i,'🦏'],
  [/scorpion/i,'🦂'], [/shark/i,'🦈'], [/spider/i,'🕷️'], [/turtle/i,'🐢'],
  [/barracuda|pike|piranha|eel|manta/i,'🐟'],
];
export function creatureSymbol(creature) {
  if(creature.sourceKind)return {symbol:creature.name[0],emoji:'🧑',meaning:creature.name};
  return {symbol:creature.name[0], emoji:families.find(([pattern]) => pattern.test(creature.name))?.[1] || (creature.group === 'Animal' ? '🐾' : '👾'), meaning:creature.name};
}
export const duelSymbol = {symbol:'⚔', emoji:'⚔️', meaning:'Melee duel'};
