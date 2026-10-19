import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {ludusConfig as C,validateLudusConfig} from '../src/ludus-config.js';
import {newLudus,migrateLudus,upgradeBuilding,promoteLudus,castLudusSpell,selectBlessing,blessingQuote,spellById,advanceLudusTime,roundsPerDay,roundsPerMinute,resolveLudusCast,supportBonus,spellRequirement,attackElement} from '../src/ludus-rules.js';
import {newArena,recruitArena,restArena,readArena,saveArena,arenaSaveKey,canFight,generateOffers,fightArena} from '../src/arena-rules.js';
import {masterCharacterCatalog} from '../src/coliseum-contenders.js';
import {creatureCatalog,resolveCritical} from '../src/coliseum-rules.js';
import {simulateGuildBattle} from '../src/guild-battle.js';
import {criticalConsequences} from '../src/critical-consequences.js';
const json=n=>JSON.parse(readFileSync(new URL('../tables/'+n+'.json',import.meta.url)));
const catalog=masterCharacterCatalog(json('T-5.8'),{spellPresets:false}),opponents=[...catalog,...creatureCatalog(json('creatures'))];
const tables=Object.fromEntries(readdirSync(new URL('../tables/',import.meta.url)).filter(n=>n.startsWith('A-10.')).map(n=>[n.slice(0,-5),json(n.slice(0,-5))]));
function base(){return recruitArena(newArena('ludus-test',opponents),catalog.find(c=>c.profession==='Fighter'&&c.level===1),'Rowan');}
function advanced(){const s=base();s.gold=10000;s.ludus.level=10;s.ludus.xp=300;s.ludus.pp=s.ludus.ppMax=73;for(const b of Object.values(s.ludus.buildings))b.rank=10;return migrateLudus(s);}
function injury(kind='nerve',extra={}){return {id:'wound',kind,label:kind,description:'Recorded injury',permanent:true,disabling:false,penalty:10,days:null,treatment:'Magic',nervePenalty:10,...extra};}
function success(s,id,options={}){
 for(let i=0;i<100;i++){
  const before=structuredClone(s);before.management.seed='success-'+i;
  const result=castLudusSpell(before,id,before.members[0].id,options,tables);
  if(result.ludus.history[0].success&&!result.ludus.history[0].wrongSpell)return result;
 }
 throw new Error('Could not obtain a successful deterministic fixture');
}
const sequence=(...rolls)=>{let i=0;return ()=>((rolls[i++]??50)-1)/100;};

test('starting configuration, rank purchases and paid XP promotions preserve expenditure',()=>{
 let s=base();assert.deepEqual(s.ludus,newLudus());
 const original=structuredClone(s);s=upgradeBuilding(s,'nerve');assert.equal(s.gold,15);assert.equal(s.ludus.buildings.nerve.rank,1);assert.deepEqual(original.ludus,newLudus());
 assert.throws(()=>upgradeBuilding(s,'nerve'),/Promote/);assert.throws(()=>promoteLudus(s),/XP or gold/);
 s.ludus.xp=100;s.gold=100;s.ludus.pp-=4;s=promoteLudus(s);
 assert.equal(s.ludus.level,5);assert.equal(s.gold,75);assert.equal(s.ludus.pp,39);
 const pp=s.ludus.pp;s=upgradeBuilding(s,'nerve');assert.equal(s.ludus.pp,pp);
 assert.equal(restArena(s).ludus.pp,43);
});
test('configuration edits control prices, capacities, durations and offer count',()=>{
 const old=structuredClone(C);
 try{
  C.economy.rankPrices[0]=7;assert.equal(upgradeBuilding(base(),'nerve').gold,13);
  C.progression.levels[1].xp=40;C.progression.levels[1].gold=9;C.progression.levels[1].pp=50;
  let s=base();s.ludus.xp=40;s.ludus.pp=10;s=promoteLudus(s);assert.equal(s.gold,11);assert.equal(s.ludus.pp,44);
  C.arena.offerCount=2;assert.equal(generateOffers(s,opponents).arena.offers.length,2);
  C.economy.servicePrices['nerve:10']=3;spellById('nerve:10').durationMinutesPerLevel=2;
  s=advanced();s.members[0].injuries=[injury('paralysis',{disabling:true})];const cast=success(s,'nerve:10',{injuryId:'wound'});
  assert.equal(cast.gold,s.gold-3);assert.equal(cast.members[0].injuries[0].suppressedUntil-cast.ludus.clock,20*roundsPerMinute());
 }finally{Object.assign(C,old);}
});
test('configuration rejects invalid costs, dice, milestones and offer limits with paths',()=>{
 for(const [edit,match] of [
  [c=>c.economy.rankPrices[0]=-1,/rankPrices/],
  [c=>c.spells.find(s=>s.dice).dice=[0,10],/dice/],
  [c=>c.progression.levels[1].xp=0,/levels/],
  [c=>c.arena.offerCount=8,/offerCount/],
 ]){const config=structuredClone(C);edit(config);assert.throws(()=>validateLudusConfig(config),match);}
});
test('migration adds no historical XP, preserves spent PP on tuning, and rejects stale saves',()=>{
 const s=base();delete s.ludus;const map=new Map([[arenaSaveKey,JSON.stringify(s)]]),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 const loaded=readArena(storage);assert.equal(loaded.ludus.xp,0);assert.equal(loaded.gold,s.gold);
 saveArena(storage,upgradeBuilding(loaded,'nerve'),loaded);assert.throws(()=>saveArena(storage,loaded,loaded),/another tab/);
 const old=C.progression.levels[0].pp;
 try{const saved=readArena(storage);saved.ludus.pp-=5;saveArena(storage,saved);C.progression.levels[0].pp=20;assert.equal(readArena(storage).ludus.pp,15);C.progression.levels[0].pp=3;assert.equal(readArena(storage).ludus.pp,0);}finally{C.progression.levels[0].pp=old;}
});
test('nerve diagnosis, repair boundary, recovery, destroyed nerves and temporary paralysis',()=>{
 let s=advanced();s.members[0].injuries=[injury()];
 const diagnosed=success(s,'nerve:1');assert.equal(diagnosed.members[0].injuries[0].diagnosed,true);
 s.members[0].injuries[0].nervePenalty=20;s=success(s,'nerve:4',{injuryId:'wound'});
 assert.equal(s.members[0].injuries.length,1);advanceLudusTime(s,roundsPerDay()-1);assert.equal(s.members[0].injuries.length,1);advanceLudusTime(s,1);assert.equal(s.members[0].injuries.length,0);
 s=advanced();s.members[0].injuries=[injury('nerve',{nervePenalty:21})];assert.throws(()=>castLudusSpell(s,'nerve:4',s.members[0].id,{injuryId:'wound'},tables),/Major/);
 assert.ok(success(s,'nerve:9',{injuryId:'wound'}).members[0].injuries[0].recoveryUntil);
 s.members[0].injuries[0].destroyed=true;assert.throws(()=>castLudusSpell(s,'nerve:9',s.members[0].id,{injuryId:'wound'},tables),/Destroyed/);
 s.members[0].injuries=[injury('paralysis',{destroyed:true,disabling:true})];assert.equal(canFight(s.members[0]),false);
 s=success(s,'nerve:10',{injuryId:'wound'});assert.equal(canFight(s.members[0]),true);assert.equal(s.members[0].injuries.length,1);
 const expires=s.members[0].injuries[0].suppressedUntil;advanceLudusTime(s,expires-s.ludus.clock);assert.equal(canFight(s.members[0]),false);
 assert.match(spellRequirement(s,spellById('nerve:5')),/Blood Law 5/);
});
test('all Concussion spells obey injury targets, healing dice and concentration time',()=>{
 for(const id of ['concussion:1','concussion:4','concussion:8']){
  const s=advanced();s.members[0].damage=25;const result=success(s,id),dice=spellById(id).dice;
  const healed=25-result.members[0].damage;assert.ok(healed>=dice[0]&&healed<=dice[0]*dice[1]);assert.equal(result.ludus.pp,73-spellById(id).level);
 }
 for(const [id,degrees] of [['concussion:2',[1]],['concussion:6',[1,1]],['concussion:9',[1,2]],['concussion:9',[3]]]){
  const s=advanced();s.members[0].injuries=degrees.map((degree,n)=>injury('burn',{id:'burn-'+n,degree}));
  const result=success(s,id,{injuryIds:s.members[0].injuries.map(i=>i.id)});assert.equal(result.members[0].injuries.length,0);
 }
 let s=advanced();s.members[0].injuries=[injury('burn',{degree:3})];assert.throws(()=>castLudusSpell(s,'concussion:2',s.members[0].id,{injuryId:'wound'},tables),/eligible/);
 s=advanced();s.members[0].injuries=[injury('irritation')];assert.equal(success(s,'concussion:3',{injuryId:'wound'}).members[0].injuries.length,0);
 s=advanced();s.members[0].conditions=[{kind:'stun',until:10}];let result=success(s,'concussion:5');assert.equal(result.members[0].conditions[0].until,9);
 s=advanced();s.members[0].damage=20;result=success(s,'concussion:7',{minutes:5});assert.equal(result.members[0].damage,15);assert.equal(result.ludus.clock,1+5*roundsPerMinute());assert.equal(result.ludus.concentration,undefined);
 s=advanced();s.members[0].conditions=[{kind:'sleep',until:100}];assert.equal(success(s,'concussion:10').members[0].conditions.length,0);
 s.members[0].conditions=[{kind:'coma',until:100}];assert.throws(()=>castLudusSpell(s,'concussion:10',s.members[0].id,{},tables),/coma/);
});
test('all Protection spells snapshot effects; selection quotes gold and shared PP',()=>{
 for(const spell of C.spells.filter(s=>s.building==='protections')){
  const s=advanced(),choice=spell.choices?.[0],result=success(s,spell.id,{choice});
  const effect=spell.radius?result.ludus.auras[0]:result.members[0].supportEffects[0];
  assert.equal(effect.until-result.ludus.clock,spell.durationMinutesPerLevel*10*roundsPerMinute());
  assert.equal(effect.spellId,spell.id);
 }
 const s=advanced(),selected=selectBlessing(s,s.members[0].id,'protections:2');assert.equal(selected.gold,s.gold);assert.equal(selected.ludus.pp,s.ludus.pp);
 assert.deepEqual([blessingQuote(selected,[s.members[0].id]).gold,blessingQuote(selected,[s.members[0].id]).pp],[2,2]);
 assert.equal(blessingQuote(selectBlessing(selected,s.members[0].id,''),[s.members[0].id]).gold,0);
});
test('support respects range, sphere membership including enemies, expiry, elements and stacking',()=>{
 const effect={until:100,range:100,db:5,rr:5,group:'protection'};
 const center={id:'one',x:0,dead:false,creature:{supportEffects:[effect,{...effect,db:10}]}},enemy={id:'enemy',x:5,creature:{supportEffects:[]}},far={id:'far',x:40,creature:{supportEffects:[]}};
 const auras=[{...effect,targetId:'one',radius:10,db:5}];
 assert.equal(supportBonus(center,[center,enemy,far],auras,1,'db'),10);
 assert.equal(supportBonus(enemy,[center,enemy,far],auras,1,'db'),5);
 assert.equal(supportBonus(far,[center,enemy,far],auras,1,'db'),0);
 assert.equal(supportBonus(center,[center],auras,100,'db'),0);
 center.creature.supportEffects=[{...effect,element:'heat',db:20}];assert.equal(supportBonus(center,[center],[],1,'db'),0);assert.equal(supportBonus(center,[center],[],1,'db','heat'),20);
 center.x=200;assert.equal(supportBonus(center,[center],[],1,'db','heat'),0);
});
test('casting follows depletion checks, ordinary failure costs, delayed casting and deterministic rolls',()=>{
 let s=advanced(),spell=spellById('concussion:4');
 let result=resolveLudusCast(s,spell,sequence(50),tables);assert.equal(result.success,true);assert.equal(result.maneuver,undefined);assert.equal(s.ludus.pp,69);
 s=advanced();s.ludus.pp=40;result=resolveLudusCast(s,spell,sequence(50,50),tables);assert.ok(result.maneuver);assert.ok(result.modifiers.includes(-10));
 s=advanced();result=resolveLudusCast(s,spell,sequence(1,25),tables);assert.equal(result.success,false);assert.equal(result.pp,0);assert.equal(s.ludus.pp,73);
 s=advanced();result=resolveLudusCast(s,spell,sequence(1,80),tables);assert.equal(result.pp,2);assert.ok(s.ludus.conditions.some(c=>c.kind==='stun'));
 s=advanced();result=resolveLudusCast(s,spell,sequence(1,10),tables);assert.equal(result.success,true);assert.equal(result.pp,4);
 s=advanced();s.members[0].damage=10;assert.deepEqual(castLudusSpell(s,spell.id,s.members[0].id,{},tables),castLudusSpell(s,spell.id,s.members[0].id,{},tables));
});
test('invalid casts never charge; diagnosis failure does not mutate wound facts',()=>{
 const s=advanced(),before=structuredClone(s);
 assert.throws(()=>castLudusSpell(s,'concussion:1',s.members[0].id,{},tables),/no concussion/);assert.deepEqual(s,before);
 assert.throws(()=>castLudusSpell(s,'nerve:5',s.members[0].id,{},tables),/Blood Law/);assert.deepEqual(s,before);
 s.members[0].injuries=[injury()];const facts=structuredClone(s.members[0].injuries);
 const result=resolveLudusCast(s,spellById('nerve:1'),sequence(1,25),tables);assert.equal(result.success,false);assert.deepEqual(s.members[0].injuries,facts);
});
test('critical classification records repairable nerves and burns without disabling every wound',()=>{
 assert.equal(criticalConsequences('Nerve damage in arm.','(-20)')[0].kind,'nerve');
 const burn=criticalConsequences('First degree burns on arm.')[0];assert.equal(burn.kind,'burn');assert.equal(burn.disabling,false);
 const target={creature:{hits:100,size:'M',equipment:{}},hits:0,effects:[]},attacker={effects:[]};
 resolveCritical(target,attacker,{type:'Wp',criticalTable:'test'},'A',{test:{rows:[{roll:'1-100',cells:Array(5).fill({description:'First degree burns on arm.',effect:'+1H'})}]}},()=>50,1,{persistentConsequences:true});
 assert.equal(target.incapacitated,undefined);
});
test('temporary paralysis expires during combat, and purchased blessings do not reroll on replay',()=>{
 const s=advanced();s.members[0].injuries=[injury('paralysis',{disabling:true,suppressed:true,suppressedUntil:2})];
 const template={...s.arena.offers[0].enemies[0],hits:1000,db:1000,attacks:[{name:'Weak',type:'Ba',attackTable:'A-10.9.7',size:'S',ob:-1000,chance:100}]};
 const battle=simulateGuildBattle([{...template,id:'hero',name:'Hero',injuries:s.members[0].injuries}], [{...template,id:'foe'}],tables,()=>0.5,{recordPlayback:true,ludusSupport:{clock:0,auras:[]}});
 assert.equal(battle.units[0].incapacitated,true);assert.ok(!battle.log.filter(r=>r.round>=3).flatMap(r=>r.events).some(e=>e.actor==='hero'&&e.kind==='attack'));
 let selected=selectBlessing(s,s.members[0].id,'protections:2');selected.members[0].injuries=[];
 selected.arena.offers[0].enemies=[{...template,hits:1,db:-100}];
 const result=fightArena(selected,selected.arena.offers[0].id,[selected.members[0].id],catalog,tables,opponents);
 assert.equal(result.arena.reports[0].services.length,1);assert.equal(result.ludus.selections[selected.members[0].id],undefined);
 assert.equal(result.arena.revision,selected.arena.revision+1);
 const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};saveArena(storage,result);assert.deepEqual(readArena(storage),result);
});

test('elemental protection distinguishes electricity from heat even on a shared critical table',()=>{
 assert.equal(attackElement({name:'Shock Bolt',criticalTable:'A-10.10.2'}),'electricity');
 assert.equal(attackElement({name:'Fire Bolt',criticalTable:'A-10.10.2'}),'heat');
 assert.equal(attackElement({name:'Ice Bolt',criticalTable:'A-10.10.1'}),'cold');
});

test('legacy permanent paralysis retains destroyed-nerve classification during migration',()=>{
 const s=advanced();s.members[0].injuries=[injury('paralysis',{description:'Strike severs spine. Foe is paralyzed.',disabling:true})];
 const map=new Map([[arenaSaveKey,JSON.stringify(s)]]),storage={getItem:k=>map.get(k)??null};
 const loaded=readArena(storage);assert.equal(loaded.members[0].injuries[0].destroyed,true);
 assert.throws(()=>castLudusSpell(loaded,'nerve:9',loaded.members[0].id,{injuryId:'wound'},tables),/Destroyed/);
});
