import test from 'node:test';
import assert from 'node:assert/strict';
import {accumulatedStunRounds,expireCriticalEffects,updateCriticalStunConsciousness} from '../critical-stun.js';

test('stun is one cumulative pool and spends only the most severe active round',()=>{
  let effects=[{kind:'stun',roundsLeft:2,startsRound:1},{kind:'stunNoParry',roundsLeft:2,startsRound:1},{kind:'downOrOut',roundsLeft:1,startsRound:1},{kind:'penalty',amount:20,roundsLeft:null}];
  assert.equal(accumulatedStunRounds(effects),5);
  effects=expireCriticalEffects(effects,1,'startsRound');assert.equal(accumulatedStunRounds(effects),4);assert.deepEqual(effects.map(e=>e.kind),['stun','stunNoParry','penalty']);
  effects=expireCriticalEffects(effects,2,'startsRound');assert.deepEqual(effects.filter(e=>e.kind!=='penalty').map(e=>e.roundsLeft),[2,1]);
  effects=expireCriticalEffects(effects,3,'startsRound');assert.equal(accumulatedStunRounds(effects),2);
  effects=expireCriticalEffects(effects,4,'startsRound');assert.equal(accumulatedStunRounds(effects),1);
  effects=expireCriticalEffects(effects,5,'startsRound');assert.deepEqual(effects,[{kind:'penalty',amount:20,roundsLeft:null}]);
});
test('future stun does not consume a round before it starts and other timed effects expire independently',()=>{
  const effects=[{kind:'stunNoParry',roundsLeft:3,starts:2},{kind:'stun',roundsLeft:2,starts:1},{kind:'bonus',roundsLeft:1,starts:1}];
  const remaining=expireCriticalEffects(effects,1,'starts');assert.deepEqual(remaining.map(e=>e.roundsLeft),[3,1]);
});
test('consciousness uses strict above/below boundaries and Co bonus, not the raw stat',()=>{
  const target={statuses:[]};const effects=[{kind:'stun',roundsLeft:14}];
  updateCriticalStunConsciousness(target,effects,2);assert.deepEqual(target.statuses,[]);
  effects[0].roundsLeft=15;updateCriticalStunConsciousness(target,effects,2);assert.ok(target.statuses.includes('Unconscious'));
  effects[0].roundsLeft=14;updateCriticalStunConsciousness(target,effects,2);assert.ok(target.statuses.includes('Unconscious'),'Equality must not revive a stunned combatant');
  effects[0].roundsLeft=13;updateCriticalStunConsciousness(target,effects,2);assert.ok(!target.statuses.includes('Unconscious'));
});
test('stun relief reduces the shared pool without reviving other causes of unconsciousness',()=>{
  for(const other of [{hitUnconscious:true},{otherUnconscious:true},{dead:true,statuses:['Dead']},{statuses:['Unconscious']}]){
    const target={statuses:[],...other};const effects=[{kind:'stunNoParry',roundsLeft:11}];
    updateCriticalStunConsciousness(target,effects,0);effects[0].roundsLeft=9;updateCriticalStunConsciousness(target,effects,0);
    assert.ok(target.statuses.includes('Unconscious'),JSON.stringify(other));
  }
});
