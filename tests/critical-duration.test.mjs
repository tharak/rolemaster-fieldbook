import test from 'node:test';
import assert from 'node:assert/strict';
import {criticalDuration} from '../critical-duration.js';
import {parseCriticalSymbols} from '../rules.js';
import {criticalTokens,formatCriticalEffect} from '../critical-presentation.js';
import {automaticInitiative} from '../critical-initiative.js';
import {createFight,stepFight,parseCreatureAttack} from '../coliseum-rules.js';
test('unspecified temporary effects use one round while explicit counts win',()=>{
  for(const text of ['∑','∏','∑∏','π','(π-15)','(-20)','(+10)'])assert.equal(parseCriticalSymbols(text)[0].roundsLeft,1,text);
  for(const text of ['3∑','3∏','3∑∏','3π','3(π-15)','3(-20)','3(+10)'])assert.equal(parseCriticalSymbols(text)[0].roundsLeft,3,text);
  assert.equal(parseCriticalSymbols('(-20)','Penalty lasts for 4 rounds.')[0].roundsLeft,4);
  assert.equal(parseCriticalSymbols('2(-20)','Penalty lasts for 4 rounds.')[0].roundsLeft,2);
  assert.equal(parseCriticalSymbols('(-20)','Death comes in 9 rounds.')[0].roundsLeft,1);
  assert.match(formatCriticalEffect('(-20)'),/Penalty: −20 for 1 round/);
  assert.match(formatCriticalEffect('(-20)',true),/➖.*−20 for 1 round/);
});
test('ongoing, until-healed and permanent effects are not truncated; prose does not invent effects',()=>{
  for(const desc of ['Penalty lasts until healed.','Permanent penalty.','Penalty is indefinite.','Arm is useless until the armor is removed.']){
    const effect=parseCriticalSymbols('(-20)',desc)[0];assert.equal(effect.roundsLeft,null);assert.ok(effect.durationLabel);
    assert.doesNotMatch(formatCriticalEffect('(-20)',false,desc),/for 1 round/);
  }
  assert.equal(parseCriticalSymbols('(-20)','Penalty lasts for 2 weeks.')[0].roundsLeft,null);
  assert.equal(parseCriticalSymbols('3∫','Bleeding continues until healed.')[0].roundsLeft,null);
  assert.equal(parseCriticalSymbols('(-20)','A permanent scar remains.')[0].roundsLeft,1);
  assert.deepEqual(parseCriticalSymbols('Foe is in pain. A permanent scar remains.'),[]);
  assert.equal(criticalDuration('', 'penalty').roundsLeft,1);
});
const creatures=[{name:'Slow attacker',hits:10000,db:0,armor_type:1,size:'M',speed_ms_aq:'MD/CR',attacks:[parseCreatureAttack('100LBi100')]},{name:'Fast defender',hits:10000,db:0,armor_type:1,size:'M',speed_ms_aq:'MD/BF',attacks:[parseCreatureAttack('100LCl100')]}];
function fixture(){
  const attack={columns:[{label:'AT 1'}],rows:[{roll:'01-150',values:['1A']}]};
  const crit=initiative=>({rows:[{roll:'01-79',cells:[{description:'No further effects.',effect:'+0H'}]},{roll:'80-100',cells:[{description:initiative?'You gain the initiative. Temporary penalty.':'Temporary penalty.',effect:'(-15) – 2∫'}]}]});
  return {'A-10.9.7':attack,'A-10.10.4':crit(true),'A-10.10.5':crit(false)};
}
test('critical penalty actually expires after its one active round, bleeding continues',()=>{
  const fight=createFight(...creatures),tables=fixture();stepFight(fight,tables,()=>.79);
  const penalties=fight.fighters.map(f=>f.effects.find(e=>e.kind==='penalty'));
  assert.ok(penalties.every(e=>e.roundsLeft===1));
  stepFight(fight,tables,()=>.49);
  assert.ok(fight.fighters.every(f=>!f.effects.some(e=>e.kind==='penalty')));
  assert.ok(fight.fighters.every(f=>f.effects.some(e=>e.kind==='bleed'&&e.roundsLeft===null)));
  assert.ok(fight.log[0].events.filter(e=>e.kind==='attack').every(e=>e.modifier===-15));
  stepFight(fight,tables,()=>.49);
  assert.ok(fight.log[0].events.filter(e=>e.kind==='attack').every(e=>e.modifier===0));
});
test('initiative critical wins next round without rolling; no current-round reorder; then normal order resumes',()=>{
  const fight=createFight(...creatures),tables=fixture();let calls=0;
  stepFight(fight,tables,()=>{calls++;return .79;});
  assert.equal(fight.log[0].initiative[0].side,1);assert.equal(calls,12);
  assert.equal(fight.fighters[0].automaticInitiativeRound,2);
  calls=0;stepFight(fight,tables,()=>{calls++;return .49;});
  assert.equal(fight.log[0].initiative[0].side,0);assert.ok(fight.log[0].initiative.every(e=>e.noRoll));assert.equal(calls,6);
  calls=0;stepFight(fight,tables,()=>{calls++;return .49;});
  assert.equal(fight.log[0].initiative[0].side,1);assert.equal(calls,12);
  assert.equal(createFight(...creatures).fighters[0].automaticInitiativeRound,undefined);
  assert.deepEqual(parseCriticalSymbols('', 'You gain the initiative.'),[{kind:'initiative',nextRound:true}]);
  assert.match(formatCriticalEffect('You gain the initiative.'),/Attacker wins initiative next round \(no roll\)/);
  assert.ok(criticalTokens('You gain the initiative.').some(t=>t.initiative));
});
test('conflicting or multi-combatant automatic initiative requires GM review, not invented rolls',()=>{
  assert.ok(automaticInitiative([{automaticInitiativeRound:2},{automaticInitiativeRound:2}],2).review);
  assert.ok(automaticInitiative([{automaticInitiativeRound:2},{},{}],2).review);
  const fight=createFight(...creatures);fight.fighters.forEach(f=>{f.automaticInitiativeRound=1;});let calls=0;
  assert.throws(()=>stepFight(fight,fixture(),()=>{calls++;return .49;}),/GM review/);assert.equal(calls,0);assert.equal(fight.round,0);
});
