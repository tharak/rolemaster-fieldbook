import test from 'node:test';
import assert from 'node:assert/strict';
import {buildEncounterRoster} from '../encounter-roster.js';

test('saved character becomes an encounter actor with calculated skill and defense', () => {
  const character = {
    id:'hero-1', name:'Test Fighter', race:'Common Man', profession:'Fighter', realm:'None',
    level:'1', hits:'35', roleHeight:'6\' 4', stats:{},
    categoryRanks:{'Weapon • 1-H Edged':{start:'2', buy:'0'}},
    skills:[{category:'Weapon • 1-H Edged', name:'Broadsword', ranks:3, item:0, special:0}],
    startingWeapons:JSON.stringify([JSON.stringify(['Weapon • 1-H Edged', 'Broadsword'])])
  };
  const [actor] = buildEncounterRoster([character]);
  assert.equal(actor.name, 'Test Fighter');
  assert.equal(actor.skills[0].bonus, 33);
  assert.equal(actor.attacks[0].bonus, 33);
  assert.equal(actor.hitsMax, 35);
  assert.equal(actor.baseMove, 55);
});

test('malformed structured fields do not prevent encounter roster loading', () => {
  const [actor] = buildEncounterRoster([null, {
    id:'hero-2', name:'Recovered', race:'Common Man', profession:'Fighter',
    skills:[null, 7, {name:'bad category'}, {category:'Weapon • 1-H Edged', name:4}],
    startingArmor:'null', startingWeapons:'{}', equipmentLedger:'{"items":[null]}',
    trainingBenefits:'null', trainingSelections:'{}'
  }]);
  assert.equal(actor.name, 'Recovered');
  assert.deepEqual(actor.skills, []);
  assert.deepEqual(actor.attacks, []);
  assert.equal(actor.at, 1);
  assert.equal(actor.db, 0);
});
