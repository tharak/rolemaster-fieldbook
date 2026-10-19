import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {creatureCatalog} from '../src/coliseum-rules.js';
import {creatureSymbol,duelSymbol} from '../src/coliseum-symbols.js';
test('every creature retains its original initial and full identity with an emoji', () => {
  const creatures = creatureCatalog(JSON.parse(readFileSync(new URL('../tables/creatures.json',import.meta.url))));
  for (const creature of creatures) {
    const before = JSON.stringify(creature);
    const icon = creatureSymbol(creature);
    assert.equal(icon.symbol, creature.name[0]);
    assert.equal(icon.meaning, creature.name);
    assert.match(icon.emoji, /\p{Extended_Pictographic}/u);
    assert.equal(JSON.stringify(creature), before);
  }
  for (const [name,emoji] of [['Wolf','🐺'],['Tiger','🐯'],['Dragon (typical adult)','🐉'],['Ant (Giant)','🐜']]) assert.equal(creatureSymbol({name}).emoji,emoji);
  assert.deepEqual(duelSymbol,{symbol:'⚔',emoji:'⚔️',meaning:'Melee duel'});
});
