import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {assignmentPools,profileAssignments,assignedProfileAttacks,armorNames,armorDescription} from '../src/guildmaster-assignments.js';
import {masterCharacterCatalog} from '../src/coliseum-contenders.js';
import {creatureCatalog,attackLookup} from '../src/coliseum-rules.js';
import {newGuild,recruitMember,printedContender} from '../src/guild-rules.js';
import {prepareGuildMaster,setMemberOrder,advanceGuildMaster} from '../src/guildmaster-rules.js';
import {simulateGuildBattle} from '../src/guild-battle.js';
const json=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const catalog=masterCharacterCatalog(json('tables/T-5.8.json'),{spellPresets:false});
const creatures=creatureCatalog(json('tables/creatures.json'));
const tables=Object.fromEntries(readdirSync(new URL('../tables/',import.meta.url)).filter(n=>n.startsWith('A-10.')).map(n=>[n.slice(0,-5),json('tables/'+n)]));

test('every assignment pool is reachable and maps to loaded attack and critical tables',()=>{
 for(const kind of ['me','ms','ds']){
  const profile={id:'test',sourceKind:'master',sourceAttacks:[{slot:1,kind,ob:50}]},seen=new Set();
  for(let seed=0;seed<500;seed++){
   const assignments=profileAssignments(profile,String(seed));seen.add(assignments.slots[1]);
   const [attack]=assignedProfileAttacks(profile,assignments);
   assert.equal(attack.ob,50);assert.equal(attack.rawKind,kind);assert.ok(tables[attack.attackTable]);assert.ok(tables[attack.criticalTable]);
  }
  assert.deepEqual([...seen].sort(),assignmentPools[kind].map(item=>item.id).sort());
 }
 assert.equal(armorNames.length,21);
 for(let at=1;at<=20;at++)assert.ok(armorDescription({sourceKind:'master',armor_type:at}));
 assert.equal(armorNames[10],'Leather Breastplate & Greaves');assert.equal(armorNames[14],'Chain Shirt & Greaves');assert.equal(armorNames[18],'Metal Breastplate & Greaves');
 assert.equal(armorDescription({group:'Animal',armor_type:4}),'Natural armor · AT 4');
});
test('highest printed OB wins before bolt modifiers; ties use the first slot',()=>{
 const profile={id:'mage',sourceKind:'master',assignments:{version:1,slots:{1:'shock',2:'broadsword'}},sourceAttacks:[{slot:1,kind:'ds',ob:60},{slot:2,kind:'me',ob:50}]};
 assert.equal(assignedProfileAttacks(profile).find(a=>a.chance).slot,1);
 profile.sourceAttacks[1].ob=70;assert.equal(assignedProfileAttacks(profile).find(a=>a.chance).slot,2);
 profile.sourceAttacks[0].ob=70;assert.equal(assignedProfileAttacks(profile).find(a=>a.chance).slot,1);
});
test('migration and recruitment retain independent choices without resetting progress',()=>{
 const old=newGuild(catalog);old.gold=99;old.members[0].damage=7;old.members[0].xp=90;
 const normalized=prepareGuildMaster(old,catalog),again=prepareGuildMaster(JSON.parse(JSON.stringify(normalized)),catalog);
 assert.deepEqual(normalized,again);assert.equal(again.gold,99);assert.equal(again.members[0].damage,7);assert.equal(again.members[0].xp,90);assert.deepEqual(again.inventory,old.inventory);
 assert.ok(old.members.every(m=>!m.assignments));
 const options=new Set();let state=prepareGuildMaster(newGuild(catalog,{tableOnly:true}),catalog);
 for(let i=0;i<12;i++){state=recruitMember(state,catalog[0]);options.add(JSON.stringify(state.members.at(-1).assignments));}
 assert.ok(options.size>1);assert.deepEqual(prepareGuildMaster(state,catalog).members.map(m=>m.assignments),state.members.map(m=>m.assignments));
});
test('creature weapons preserve sizes, probabilities and follow-ups; natural attacks are unchanged',()=>{
 let count=0;
 for(const creature of creatures){
  const attacks=assignedProfileAttacks(creature);
  creature.attacks.forEach((attack,index)=>{
   if(!attack||attack.both){assert.deepEqual(attacks[index],attack);return;}
   for(const key of ['ob','size','chance','follow','optional','type'])assert.equal(attacks[index][key],attack[key]);
   if(attack.type==='Wp'){count++;assert.ok(assignmentPools.me.some(item=>item.name===attacks[index].name));}
   else assert.equal(attacks[index].raw,attack.raw);
  });
 }
 assert.ok(count>0);
});
const expectedBolts={fire:[0,150,'A-10.10.2','E'],ice:[-10,150,'A-10.10.1','E'],lightning:[10,150,'A-10.10.2','E'],shock:[-40,90,'A-10.10.2','C'],water:[-20,120,'A-10.10.3','D']};
function boltBattle(id,ob,unmodified=false){
 const template=catalog.find(c=>c.profession==='Magician');
 const caster=printedContender({...template,id:'caster',hits:10000,pp:0,sourceAttacks:[{slot:1,kind:'ds',ob},{slot:2,kind:'me',ob:-1000}],assignments:{version:1,slots:{1:id,2:'mace'}}});
 const foe=printedContender({...catalog[0],id:'foe',hits:10000,db:0,armor_type:1});
 let calls=0;const random=()=>unmodified&&++calls===8?.999:.5;
 return {battle:simulateGuildBattle([caster],[foe],tables,random,{roundLimit:1}),caster,foe};
}
test('all five bolts use printed modifiers, caps and critical types without PP or preparation',()=>{
 for(const [id,[mod,cap,critical,maxCritical]] of Object.entries(expectedBolts)){
  for(const ob of [70,500]){
   const {battle,caster,foe}=boltBattle(id,ob);const attack=caster.attacks[0];
   assert.equal(attack.obModifier,mod);assert.equal(attack.cap,cap);assert.equal(attack.criticalTable,critical);assert.equal(attack.maxCritical,maxCritical);
   const event=battle.log[0].events.find(e=>e.actor==='caster'&&e.kind==='attack');assert.ok(event);
   const expected=attackLookup(tables['A-10.9.9'],Math.min(cap,51+ob+mod),51,foe.armor_type,'M');
   assert.equal(event.hits,expected.hits);if(event.critical){assert.equal(event.critical.code,critical);assert.ok(event.critical.severity<=maxCritical);}
   assert.match(event.text,new RegExp(`OB ${ob}`));assert.ok(event.text.includes(`${mod>=0?'+':''}${mod} bolt`));
   assert.equal(battle.units[0].pp,0);assert.ok(!battle.log[0].events.some(e=>['spell','prepare'].includes(e.kind)));assert.equal(event.melee,false);
  }
 }
});
test('natural 100 keeps the unmodified bolt result, even for Shock and Water',()=>{
 for(const id of ['shock','water']){
  const {battle,foe}=boltBattle(id,50,true);const event=battle.log[0].events.find(e=>e.actor==='caster'&&e.kind==='attack');
  const expected=attackLookup(tables['A-10.9.9'],0,100,foe.armor_type,'M');
  assert.equal(event.hits,expected.hits);assert.equal(event.critical.severity,'E');
 }
});
test('encounter assignments and reports remain identical on retry',()=>{
 let state=prepareGuildMaster(newGuild(catalog,{tableOnly:true}),catalog);state=setMemberOrder(state,state.members[0].id,{action:'adventure'});
 let found=false;
 for(let i=0;i<100&&!found;i++){
  state.management.seed=`assignment-${i}`;const before=JSON.stringify(state),next=advanceGuildMaster(state,[...catalog,...creatures],tables);
  const report=next.management.reports[0].results[0].encounter;if(!report?.enemies)continue;
  found=true;assert.ok(report.enemies.every(e=>e.assignments&&e.attacks.length&&e.armorName));assert.deepEqual(next,advanceGuildMaster(state,[...catalog,...creatures],tables));assert.equal(JSON.stringify(state),before);
 }
 assert.ok(found);
});
