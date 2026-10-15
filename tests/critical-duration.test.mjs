import test from 'node:test';
import assert from 'node:assert/strict';
import {criticalDuration} from '../critical-duration.js';
import {parseCriticalSymbols} from '../rules.js';
import {criticalTokens,formatCriticalEffect} from '../critical-presentation.js';
import {automaticInitiative} from '../critical-initiative.js';
import {createFight,stepFight,parseCreatureAttack} from '../coliseum-rules.js';
test('omitted counts use the book defaults; penalties last until healed while explicit counts win',()=>{
  for(const text of ['∑','∏','∑∏','π','(π-15)','(+10)'])assert.equal(parseCriticalSymbols(text)[0].roundsLeft,1,text);
  for(const text of ['3∑','3∏','3∑∏','3π','3(π-15)','3(-20)','3(+10)'])assert.equal(parseCriticalSymbols(text)[0].roundsLeft,3,text);
  assert.equal(parseCriticalSymbols('(-20)','Penalty lasts for 4 rounds.')[0].roundsLeft,4);
  assert.equal(parseCriticalSymbols('2(-20)','Penalty lasts for 4 rounds.')[0].roundsLeft,2);
  assert.equal(parseCriticalSymbols('(-20)','Death comes in 9 rounds.')[0].roundsLeft,null);
  assert.match(formatCriticalEffect('(-20)'),/Penalty: −20 until healed/);
  assert.match(formatCriticalEffect('(-20)',true),/➖.*−20 until healed/);
});
test('ongoing, until-healed and permanent effects are not truncated; prose does not invent effects',()=>{
  for(const desc of ['Penalty lasts until healed.','Permanent penalty.','Penalty is indefinite.','Arm is useless until the armor is removed.']){
    const effect=parseCriticalSymbols('(-20)',desc)[0];assert.equal(effect.roundsLeft,null);assert.ok(effect.durationLabel);
    assert.doesNotMatch(formatCriticalEffect('(-20)',false,desc),/for 1 round/);
  }
  assert.equal(parseCriticalSymbols('(-20)','Penalty lasts for 2 weeks.')[0].roundsLeft,null);
  assert.equal(parseCriticalSymbols('3∫','Bleeding continues until healed.')[0].roundsLeft,null);
  assert.equal(parseCriticalSymbols('(-20)','A permanent scar remains.')[0].durationLabel,'until healed');
  assert.deepEqual(parseCriticalSymbols('Foe is in pain. A permanent scar remains.'),[]);
  assert.equal(criticalDuration('', 'penalty').roundsLeft,null);
});
test('Core Rules omitted beta and alpha defaults preserve hit amounts, bleeding rates and penalty duration',()=>{
  assert.deepEqual(parseCriticalSymbols('+H'),[{kind:'hits',amount:1}]);
  assert.deepEqual(parseCriticalSymbols('+0H'),[{kind:'hits',amount:0}]);
  assert.deepEqual(parseCriticalSymbols('∫'),[{kind:'bleed',amount:1,roundsLeft:null}]);
  assert.deepEqual(parseCriticalSymbols('(π)'),[{kind:'mustParry',roundsLeft:1,amount:0}]);
  assert.deepEqual(parseCriticalSymbols('3(π)'),[{kind:'mustParry',roundsLeft:3,amount:0}]);
  assert.deepEqual(parseCriticalSymbols('(-20)'),[{kind:'penalty',amount:20,roundsLeft:null,durationLabel:'until healed'}]);
  assert.deepEqual(parseCriticalSymbols('(+10)'),[{kind:'bonus',amount:10,roundsLeft:1}]);
  assert.match(formatCriticalEffect('+H'),/Extra hits: 1/);
  assert.match(formatCriticalEffect('3(π)'),/Must parry: 3 rounds/);
});
const creatures=[{name:'Slow attacker',hits:10000,db:0,armor_type:1,size:'M',speed_ms_aq:'MD/CR',attacks:[parseCreatureAttack('100LBi100')]},{name:'Fast defender',hits:10000,db:0,armor_type:1,size:'M',speed_ms_aq:'MD/BF',attacks:[parseCreatureAttack('100LCl100')]}];
function fixture(){
  const attack={columns:[{label:'AT 1'}],rows:[{roll:'01-150',values:['1A']}]};
  const crit=initiative=>({rows:[{roll:'01-79',cells:[{description:'No further effects.',effect:'+0H'}]},{roll:'80-100',cells:[{description:initiative?'You gain the initiative. Temporary penalty.':'Temporary penalty.',effect:'1(-15) – 2∫'}]}]});
  return {'A-10.9.7':attack,'A-10.10.4':crit(true),'A-10.10.5':crit(false)};
}
test('explicit one-round critical penalty expires after its active round, bleeding continues',()=>{
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
test('bare penalties remain active across rounds, affect initiative and OB, and leave DB unchanged',()=>{
  const fight=createFight(...creatures),tables=fixture();
  for(const table of ['A-10.10.4','A-10.10.5'])tables[table].rows[1].cells[0]={description:'A wound.',effect:'(-15)'};
  stepFight(fight,tables,()=>.79);
  for(let n=0;n<3;n++){
    stepFight(fight,tables,()=>.49);
    assert.ok(fight.fighters.every(f=>f.effects.some(e=>e.kind==='penalty'&&e.roundsLeft===null)));
    const entry=fight.log[0];assert.ok(entry.events.filter(e=>e.kind==='attack').every(e=>e.modifier===-15&&e.db===0));
    assert.deepEqual(entry.initiative.map(item=>item.total),[3,-13]);
  }
});
test('no-parry restricts attacks for its stated rounds and then allows attacks again',()=>{
  const fight=createFight(...creatures),tables=fixture();
  fight.fighters[0].effects.push({kind:'noParry',roundsLeft:2,starts:1});
  for(let n=0;n<2;n++){stepFight(fight,tables,()=>.49);assert.ok(!fight.log[0].events.some(e=>e.side===0&&e.kind==='attack'));}
  stepFight(fight,tables,()=>.49);assert.ok(fight.log[0].events.some(e=>e.side===0&&e.kind==='attack'));
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
