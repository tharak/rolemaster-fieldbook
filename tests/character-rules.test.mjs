import test from 'node:test';
import assert from 'node:assert/strict';
import {
  statCost, basicStatBonus, fixedPotential, rolledPotential, rollStatGain,
  xpForLevel, levelForXp, strideBonus, classifySkill, developedRanks,
  spellListCostsFor, trainingSpecialAwards
} from '../character-rules.js';
import {equipmentLedger, parseList, parseRecord} from '../character-record.js';

test('stat assignment cost and bonuses retain the table boundaries', () => {
  assert.equal(statCost(90), 90);
  assert.equal(statCost(91), 91);
  assert.equal(statCost(100), 190);
  for (const [value, bonus] of [[1,-9],[10,-5],[11,-4],[30,-1],[31,0],[69,0],[70,1],[89,4],[90,5],[99,9],[100,10]]) {
    assert.equal(basicStatBonus(value), bonus, `stat ${value}`);
  }
});

test('potential stat methods preserve their bands and limits', () => {
  assert.equal(fixedPotential(24), 68);
  assert.equal(fixedPotential(25), 64);
  assert.equal(fixedPotential(100), 101);
  assert.equal(rolledPotential(20, () => 0), 28);
  assert.equal(rolledPotential(20, () => 0.999), 100);
  assert.equal(rolledPotential(100, () => 0), 100);
  assert.equal(rolledPotential(100, () => 0.999), 101);
});

test('stat gains handle low doubles, remaining potential, and high doubles', () => {
  const gain = (before, potential, dice) => rollStatGain(before, potential, () => dice.shift()).after;
  assert.equal(gain(70, 90, [3,3]), 67);
  assert.equal(gain(70, 90, [6,9]), 79);
  assert.equal(gain(70, 100, [6,9]), 85);
  assert.equal(gain(97, 100, [10,10]), 100);
});

test('XP thresholds and post-level-20 progression agree', () => {
  for (let level = 2; level <= 22; level++) {
    assert.equal(levelForXp(xpForLevel(level)), level);
    assert.equal(levelForXp(xpForLevel(level) - 1), level - 1);
  }
  assert.equal(levelForXp(-1), 1);
});

test('skill classifications apply race, profession, and explicit choices', () => {
  const kind = name => classifySkill({name, race:'Dwarf', profession:'Thief'});
  assert.equal(kind('Lock Lore'), 'occupational');
  assert.equal(kind('Swimming'), 'restricted');
  assert.equal(developedRanks(3, kind('Swimming')), 1);
  assert.equal(developedRanks(2, kind('Lock Lore')), 6);
  assert.equal(classifySkill({name:'Swimming', race:'Dwarf', profession:'Thief', override:'everyman'}), 'everyman');
  assert.equal(classifySkill({name:'Play Instrument (flute)', race:'Wood Elf', profession:'Fighter'}), 'everyman');
});

test('spell rank costs handle a band crossing and development multipliers', () => {
  const costs = options => spellListCostsFor({category:'Spells • Own Realm Open Lists', profession:'Magician', baseCosts:[2,2,2], ...options});
  assert.deepEqual(costs({start:4}), [2,4,4]);
  assert.deepEqual(costs({start:19, multiplier:2}), [8,12,12]);
  assert.deepEqual(costs({start:10, profession:'Ranger'}), [12]);
});

test('stride validates feet and inches before applying the chart', () => {
  assert.equal(strideBonus('6\'4"'), 5);
  assert.equal(strideBonus('5\'10"'), 0);
  assert.equal(strideBonus('6\'12"'), null);
});

test('training awards handle missing or malformed roll history', () => {
  const pack = {specialItems:[['First'], ['Last']]};
  assert.deepEqual(trainingSpecialAwards(pack, {mode:'rolled', rows:[{gained:true}, {gained:false}]}), [0]);
  assert.deepEqual(trainingSpecialAwards(pack, {mode:'rolled', rows:null}), [1]);
  assert.deepEqual(trainingSpecialAwards({specialItems:[]}, {mode:'last'}), []);
});

test('character record readers reject valid JSON of the wrong shape', () => {
  assert.deepEqual(parseList('{}'), []);
  assert.deepEqual(parseRecord('null'), {});
  assert.deepEqual(equipmentLedger('{"items":[null,{"id":"sword","quantity":1,"priceTin":100}]}'), {
    adjustment:0, items:[{id:'sword', name:'', quantity:1, priceTin:100}]
  });
});
