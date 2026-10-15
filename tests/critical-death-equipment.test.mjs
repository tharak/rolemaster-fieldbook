import test from 'node:test';
import assert from 'node:assert/strict';
import {criticalDeath,applyCriticalDeath,advanceCriticalDeath,cancelCriticalDeathOnHealing} from '../critical-death.js';
import {criticalEquipment,resolveCriticalEquipment,hasEquipment} from '../critical-equipment.js';
import {parseCriticalSymbols} from '../rules.js';
import {formatCriticalEffect} from '../critical-presentation.js';
import {reviewCell} from '../critical-review-rules.js';
import {createFight,stepFight,parseCreatureAttack} from '../coliseum-rules.js';
test('death countdown expires after X transitions, not during trigger round; damage representation is respected',()=>{
  for(const n of [1,3]){const target={hits:5};applyCriticalDeath(target,100,7,n);assert.equal(target.deathRound,7+n);assert.equal(advanceCriticalDeath(target,100,7),false);for(let r=8;r<7+n;r++)assert.equal(advanceCriticalDeath(target,100,r),false);assert.equal(advanceCriticalDeath(target,100,7+n),true);assert.equal(target.hits,100);assert.equal(target.dead,true);assert.equal(target.deathRound,undefined);}
  const instant={hits:2};applyCriticalDeath(instant,100,1,0);assert.equal(instant.hits,100);assert.ok(instant.statuses.includes('Dead'));
});
test('healing cancels pending death, repeated deaths cannot postpone it, serialization survives',()=>{
  let target={hits:5};applyCriticalDeath(target,100,1,3);applyCriticalDeath(target,100,2,5);assert.equal(target.deathRound,4);target=JSON.parse(JSON.stringify(target));target.hits=4;assert.equal(cancelCriticalDeathOnHealing(target,5),true);assert.equal(advanceCriticalDeath(target,100,10),false);assert.equal(target.dead,undefined);
});
test('explicit fatal variants are recognized; harmless instantly and unknown fatal prose do not invent death',()=>{
  for(const [text,n] of [['Foe dies in 1 round.',1],['He drops and dies after 3 rounds.',3],['He dies of shock in 12 rnds.',12],['He goes into shock and dies 6 rounds later.',6],['Foe dies in two rounds.',2],['Foe dies instantly.',0],['You kill him instantly.',0]]){assert.equal(criticalDeath(text)?.rounds,n,text);assert.equal(parseCriticalSymbols('',text).find(e=>e.kind==='dies')?.roundsLeft,n,text);}
  for(const text of ['Foe is instantly pale.','He feels pain instantly.','Foe drops instantly to the ground.'])assert.equal(criticalDeath(text),null,text);
  assert.match(formatCriticalEffect('Foe dies in 3 rounds.',false),/Dies: in 3 rounds unless healed/);assert.match(formatCriticalEffect('Foe dies instantly.',true),/☠️.*instantly/);
  assert.equal(criticalDeath('Foe dies in 12 inactive rounds.').inactive,true);
  assert.equal(parseCriticalSymbols('', 'Foe dies in 12 inactive rounds.').some(e=>e.kind==='dies'),false);
  assert.ok(reviewCell({description:'Foe dies in 12 inactive rounds.',effect:'—'}).notes.some(note=>note.includes('GM-managed')));
});
test('each inventory equipment key has independent with/without branches, unconditional prefix preserved',()=>{
  for(const [key] of criticalEquipment){
    const raw='+1H with '+key+': +2H w/o '+key+': +3H';
    const present=resolveCriticalEquipment('',raw,[key]),absent=resolveCriticalEquipment('',raw,[]);
    assert.equal(present.unresolved,false,key);assert.equal(absent.unresolved,false,key);
    assert.deepEqual(parseCriticalSymbols(present.effect).filter(e=>e.kind==='hits').map(e=>e.amount),[1,2],key);
    assert.deepEqual(parseCriticalSymbols(absent.effect).filter(e=>e.kind==='hits').map(e=>e.amount),[1,3],key);
  }
  assert.ok(hasEquipment(['plate chest armor'],'chest armor'));assert.ok(hasEquipment(['full helmet'],'helmet'));assert.equal(hasEquipment([], 'helmet'),false);
});
test('scoped natural equipment conditions choose correct death branch and leave unconditional effects',()=>{
  const text='A clear strike. If no chest armor he is dead instantly. Otherwise he dies after 9 rounds. You gain the initiative.';
  for(const [gear,n] of [[[],0],[['chest armor'],9]]){const r=resolveCriticalEquipment(text,'+2H',gear);assert.equal(r.unresolved,false);assert.equal(parseCriticalSymbols(r.effect,r.description).find(e=>e.kind==='dies')?.roundsLeft,n);assert.ok(parseCriticalSymbols(r.effect,r.description).some(e=>e.kind==='initiative'));}
  const abdomen=resolveCriticalEquipment('If foe has abdominal armor, he dies in 2 rounds. If not, he dies instantly.','+1H',['abdomen armor']);assert.equal(parseCriticalSymbols(abdomen.effect,abdomen.description).find(e=>e.kind==='dies').roundsLeft,2);
  for(const alternate of ['If not,','Otherwise,','If not:']){
    const bare=resolveCriticalEquipment('If foe has abdominal armor, he dies in 2 rounds. '+alternate+' he dies instantly.','+1H',[]);
    assert.equal(bare.unresolved,false,alternate);
    assert.equal(parseCriticalSymbols(bare.effect,bare.description).find(e=>e.kind==='dies')?.roundsLeft,0,alternate);
  }
  const compound=resolveCriticalEquipment('If foe has a helm (or hard head), he dies instantly.','+4H',[]);assert.equal(compound.unresolved,true);assert.equal(parseCriticalSymbols(compound.effect,compound.description).some(e=>e.kind==='dies'),false);assert.equal(parseCriticalSymbols(compound.effect)[0].amount,4);
});
const base={hits:10000,db:0,armor_type:1,size:'M'};
test('conditions and fatal clauses spanning source fields stay scoped to foe equipment',()=>{
  const description='If no chest armor he is dead instantly. Otherwise';
  const effect='he dies after 9 rounds of burning. +2H';
  for(const [equipment,rounds,hits] of [[[],0,[]],[['chest armor'],9,[2]]]){
    const result=resolveCriticalEquipment(description,effect,equipment);
    const parsed=parseCriticalSymbols(result.effect,result.description);
    assert.equal(result.unresolved,false);
    assert.equal(parsed.find(e=>e.kind==='dies')?.roundsLeft,rounds);
    assert.deepEqual(parsed.filter(e=>e.kind==='hits').map(e=>e.amount),hits);
  }
  const split=resolveCriticalEquipment('If visored, foe dies in 10 rounds. Without a visor, he dies','instantly. +30H',[]);
  assert.equal(parseCriticalSymbols(split.effect,split.description).find(e=>e.kind==='dies')?.roundsLeft,0);
  for(const [equipment,rounds] of [[[],9],[['neck armor'],undefined]]){
    const neck=resolveCriticalEquipment('If the neck is exposed it','freezes solid and foe dies in 9 rounds. +5H',equipment);
    assert.equal(neck.unresolved,false);
    assert.equal(parseCriticalSymbols(neck.effect,neck.description).find(e=>e.kind==='dies')?.roundsLeft,rounds);
  }
  const unknown=resolveCriticalEquipment('If magical protection fails it','freezes solid and foe dies in 9 rounds. +5H',[]);
  assert.equal(unknown.unresolved,true);
  assert.deepEqual(parseCriticalSymbols(unknown.effect,unknown.description),[]);
});
function fightFor(equipment=[]){return createFight({...base,name:'Attacker',speed_ms_aq:'MD/BF',attacks:[parseCreatureAttack('100LBi100')]},{...base,name:'Foe',speed_ms_aq:'MD/CR',equipment,attacks:[parseCreatureAttack('100LCl100')]});}
function tablesFor(description){const attack={columns:[{label:'AT 1'}],rows:[{roll:'01-150',values:['1A']}]};return {'A-10.9.7':attack,'A-10.10.4':{rows:[{roll:'01-100',cells:[{description,effect:'+0H'}]}]},'A-10.10.5':{rows:[{roll:'01-100',cells:[{description:'No further effects.',effect:'+0H'}]}]}};}
test('conditional instant death prevents later same-round attack, gear on foe not attacker decides',()=>{
  const tables=tablesFor('If no helmet he dies instantly.');const bare=fightFor();stepFight(bare,tables,()=>.49);assert.equal(bare.fighters[1].hits,10000);assert.equal(bare.log[0].events.filter(e=>e.kind==='attack').length,1);assert.equal(bare.finished,true);
  const protectedFight=fightFor(['helmet']);stepFight(protectedFight,tables,()=>.49);assert.equal(protectedFight.fighters[1].dead,undefined);assert.equal(protectedFight.log[0].events.filter(e=>e.kind==='attack').length,2);
  const wrongSide=fightFor();wrongSide.fighters[0].creature.equipment=['helmet'];stepFight(wrongSide,tables,()=>.49);assert.equal(wrongSide.fighters[1].dead,true);
});
test('real duel countdown uses next round transition and new combat is clean',()=>{
 const fight=fightFor(),tables=tablesFor('Foe dies in 1 round.');stepFight(fight,tables,()=>.49);assert.equal(fight.finished,false);assert.equal(fight.fighters[1].deathRound,2);stepFight(fight,tables,()=>.49);assert.equal(fight.finished,true);assert.equal(fight.fighters[1].hits,10000);assert.ok(fight.log[0].events.some(e=>e.kind==='dies'));assert.equal(fightFor().fighters[1].deathRound,undefined);
});
