import test from 'node:test';
import assert from 'node:assert/strict';
import {rankBonus} from '../rules.js';
import {buildEncounterRoster} from '../encounter-roster.js';

test('saved character becomes an encounter actor with calculated skill and defense', async () => {
  const character = {
    id:'hero-1', name:'Test Fighter', race:'Common Man', profession:'Fighter', realm:'None',
    level:'1', hits:'35', roleHeight:'6\' 0', stats:{},
    categoryRanks:{'Weapon • 1-H Edged':{start:'2', buy:'0'}},
    skills:[{category:'Weapon • 1-H Edged', name:'Broadsword', ranks:3, item:0, special:0}],
    startingWeapons:JSON.stringify([JSON.stringify(['Weapon • 1-H Edged', 'Broadsword'])])
  };
  const [actor] = buildEncounterRoster([character], {
    equipmentCatalog:[], trainingPackages:[], rankBonus,
    basicStatBonus:() => 0, strideBonus:() => 5,
    trainingSpecialAwards:() => []
  });
  assert.equal(actor.name, 'Test Fighter');
  assert.equal(actor.skills[0].bonus, 33);
  assert.equal(actor.attacks[0].bonus, 33);
  assert.equal(actor.hitsMax, 35);
  assert.equal(actor.baseMove, 55);
});
