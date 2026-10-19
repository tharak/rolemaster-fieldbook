import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {masterCharacterCatalog} from '../src/coliseum-contenders.js';
import {creatureCatalog,resolveCritical} from '../src/coliseum-rules.js';
import {criticalConsequences} from '../src/critical-consequences.js';
import {newArena,recruitArena,fightArena,restArena,canFight,readArena,saveArena,arenaSaveKey,healArenaInjury,healersFor,validArena} from '../src/arena-rules.js';
import {levelMembers} from '../src/guild-game-rules.js';
import {applyCriticalDeath,advanceCriticalDeath} from '../src/critical-death.js';
const read=n=>JSON.parse(readFileSync(new URL('../tables/'+n+'.json',import.meta.url)));
const catalog=masterCharacterCatalog(read('T-5.8'),{spellPresets:false}),opponents=[...catalog,...creatureCatalog(read('creatures'))];
const allTables=Object.fromEntries(readdirSync(new URL('../tables/',import.meta.url)).filter(n=>n.startsWith('A-10.')).map(n=>[n.slice(0,-5),read(n.slice(0,-5))]));
const row=read('A-10.10.5').rows.find(r=>r.roll==='91-95'),paralysis=row.cells[4],amputation=row.cells[2];
const start=()=>recruitArena(newArena('consequences',opponents),catalog.find(c=>c.profession==='Fighter'&&c.level===1),'Rowan');
function woundFight(state,cell){
 const s=structuredClone(state),tables=structuredClone(allTables),offer=s.arena.offers[0];
 for(const [code,t]of Object.entries(tables))if(code.startsWith('A-10.9.'))for(const r of t.rows||[])if(r.values)r.values=r.values.map(()=> '0');
 tables['test-attack']={columns:Array.from({length:20},(_,i)=>({label:`AT ${i+1}`})),rows:[{roll:'1-100',values:Array(20).fill('0E')}]};
 tables['test-critical']={rows:[{roll:'1-100',cells:Array(5).fill(cell)}]};
 offer.enemies=[{...offer.enemies[0],id:'fatal-enemy',hits:1000,size:'M',attacks:[{name:'Test blade',type:'Wp',size:'M',ob:0,chance:100,attackTable:'test-attack',criticalTable:'test-critical'}]}];
 return fightArena(s,offer.id,[s.members[0].id],catalog,tables,opponents);
}
test('actual severed-spine critical disables immediately and persists through rest, save, reload and leveling',()=>{
 let s=woundFight(start(),paralysis),m=s.members[0];
 assert.equal(m.dead,false);assert.equal(canFight(m),false);assert.ok(m.injuries.some(i=>i.kind==='paralysis'&&i.permanent&&i.days===null));assert.ok(validArena(s));
 const events=s.arena.reports[0].rounds.flatMap(r=>r.events),hit=events.findIndex(e=>e.target===m.id&&e.critical);
 assert.ok(!events.slice(hit+1).some(e=>e.actor===m.id&&e.kind==='attack'));
 for(let i=0;i<10;i++)s=restArena(s);assert.equal(canFight(s.members[0]),false);assert.equal(s.members[0].damage,0);
 s.members[0].xp=100;s=levelMembers(s,catalog);assert.equal(s.members[0].level,5);assert.equal(canFight(s.members[0]),false);
 const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};saveArena(storage,s);s=readArena(storage);assert.equal(canFight(s.members[0]),false);
 assert.throws(()=>fightArena(s,s.arena.offers[0].id,[m.id],catalog,allTables,opponents),/able to fight/);
});
test('actual severed-leg critical expires after six rounds, removes fighter, and never revives during rest or progression',()=>{
 const initial=start(),id=initial.members[0].id,s=woundFight(initial,amputation),report=s.arena.reports[0];
 assert.deepEqual(s.arena.lineup,[]);assert.equal(s.members.length,0);assert.equal(s.arena.fallen.length,1);assert.equal(s.arena.fallen[0].id,id);assert.equal(s.arena.fallen[0].dead,true);assert.equal(s.arena.fallen[0].xp,0);assert.equal(report.rewards[0].dead,true);assert.equal(report.rewards[0].rescued,false);
 const hit=report.rounds.find(r=>r.events.some(e=>e.target===id&&e.critical)),death=report.rounds.find(r=>r.events.some(e=>e.actor===id&&e.kind==='dies'));
 assert.equal(death.round,hit.round+6);assert.equal(report.playback.final.find(u=>u.id===id).dead,true);assert.ok(validArena(s));
 assert.deepEqual(levelMembers(restArena(s),catalog).arena.fallen,s.arena.fallen);
 const recruited=recruitArena(s,catalog.find(c=>c.profession==='Fighter'&&c.level===1),'Replacement');assert.equal(recruited.members.length,1);assert.notEqual(recruited.members[0].id,id);assert.equal(recruited.gold,s.gold-12);
 const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};saveArena(storage,s);assert.deepEqual(readArena(storage),s);
});
test('instant death is permanent; nonfatal HP knockout is not death',()=>{
 const killed=woundFight(start(),{description:'Foe dies instantly.',effect:'+100H'});assert.equal(killed.members.length,0);assert.equal(killed.arena.fallen[0].dead,true);
 const knocked=woundFight(start(),{description:'Blow knocks the wind out of foe.',effect:'+100H'});assert.equal(knocked.members.length,1);assert.equal(knocked.arena.fallen.length,0);assert.equal(knocked.members[0].hits-knocked.members[0].damage,1);
});
test('old personal Cleric shortcut cannot permanently remove paralysis',()=>{
 const s=woundFight(start(),paralysis),m=s.members[0];
 assert.equal(healersFor(s,m.injuries[0]).length,0);
 assert.throws(()=>healArenaInjury(s,m.id,m.injuries[0].id,'member-2'),/Ludus/);
});
test('equipment branches and prose do not invent paralysis or amputations',()=>{
 assert.equal(criticalConsequences('Sever tendons in the leg.').length,0);
 assert.equal(criticalConsequences("Sever an artery in foe's leg.").length,0);
 assert.equal(criticalConsequences('If foe has a helmet, he is paralyzed.').length,0);
 assert.equal(criticalConsequences('Foe is paralyzed for 3 rounds.').length,0);
 const cell={description:'If foe has a throat protector, he is paralyzed from the neck down. If not, he dies in two rounds.',effect:'+25H'};
 for(const protector of [true,false]){
  const target={creature:{hits:100,size:'M',equipment:{'throat protector':protector}},hits:0,effects:[]},attacker={effects:[]};
  const critical=resolveCritical(target,attacker,{type:'Wp',criticalTable:'fixture'},'E',{fixture:{rows:[{roll:'1-100',cells:Array(5).fill(cell)}]}},()=>50,1,{persistentConsequences:true});
  assert.equal(critical.consequences.some(c=>c.kind==='paralysis'),protector);assert.equal(target.deathRound,protector?undefined:3);
 }
});
test('ordinary healing cannot cancel a structural mortal wound and old outstanding paralysis upgrades without retroactive deaths',()=>{
 const unit={hits:20,deathRequiresRepair:true};applyCriticalDeath(unit,100,1,6);unit.hits=0;assert.equal(advanceCriticalDeath(unit,100,7),true);assert.equal(unit.dead,true);
 const s=start();s.members[0].injuries=[{id:'old',description:paralysis.description,penalty:20,days:2}];
 const map=new Map([[arenaSaveKey,JSON.stringify(s)]]),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 const loaded=readArena(storage);assert.equal(loaded.members[0].dead,false);assert.equal(canFight(loaded.members[0]),false);saveArena(storage,restArena(loaded),loaded);assert.equal(readArena(storage).members[0].injuries[0].days,null);
});
