import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {masterCharacterCatalog} from '../src/coliseum-contenders.js';
import {creatureCatalog} from '../src/coliseum-rules.js';
import {newArena,recruitArena,generateOffers,fightArena,restArena,validArena,readArena,saveArena,arenaSaveKey,woundsFromBattle,injuryPenalty,difficulty,themes} from '../src/arena-rules.js';
const json=n=>JSON.parse(readFileSync(new URL('../tables/'+n+'.json',import.meta.url)));
const catalog=masterCharacterCatalog(json('T-5.8'),{spellPresets:false}),opponents=[...catalog,...creatureCatalog(json('creatures'))];
const tables=Object.fromEntries(readdirSync(new URL('../tables/',import.meta.url)).filter(n=>n.startsWith('A-10.')).map(n=>[n.slice(0,-5),json(n.slice(0,-5))]));
const fighter=catalog.find(c=>c.profession==='Fighter'&&c.level===1);
const start=seed=>recruitArena(newArena(seed,opponents),fighter,'Rowan');
test('three reproducible, distinct themed groups with fixed previews and no reroll cost',()=>{
 const a=start('offers'),b=generateOffers(a,opponents);
 assert.ok(validArena(a));assert.ok(validArena(b));assert.equal(b.gold,a.gold);assert.equal(a.arena.offers.length,3);
 assert.deepEqual(b,generateOffers(a,opponents));assert.notDeepEqual(a.arena.offers,b.arena.offers);
 assert.equal(new Set(b.arena.offers.map(o=>o.theme)).size,3);
 for(const o of b.arena.offers){const theme=themes.find(t=>t.id===o.theme);assert.ok(o.enemies.every(e=>theme.matches({...e,name:e.name.replace(/ \d+$/,'')})));assert.ok(o.xp>0&&o.gold>0);assert.ok(o.enemies.length<=4);}
 const fixed=JSON.stringify(b.arena.offers);difficulty(b.arena.offers[0],b.members);assert.equal(JSON.stringify(b.arena.offers),fixed);
});
test('battle saves actual critical data, victory rewards once, and leaves nonparticipants unchanged',()=>{
 let victories=0,losses=0;
 for(let i=0;i<12;i++){
  const state=recruitArena(start('match-'+i),fighter,'Bench'),before=structuredClone(state),id=state.arena.offers[0].id;
  const next=fightArena(state,id,[state.members[0].id],catalog,tables),r=next.arena.reports[0];
  assert.ok(validArena(next));assert.deepEqual(state,before);assert.deepEqual(next.members[1],state.members[1]);assert.equal(next.arena.offers.length,2);
  assert.equal(next.gold-state.gold,r.winner===0?state.arena.offers[0].gold:0);
  assert.equal(next.members[0].xp-state.members[0].xp,r.winner===0?state.arena.offers[0].xp:0);
  assert.throws(()=>fightArena(next,id,[state.members[0].id],catalog,tables),/no longer/);
  for(const c of r.criticals){assert.ok(c.code&&c.description&&Number.isFinite(c.roll));assert.ok(c.attacker&&c.defender);}
  if(r.winner===0)victories++;else losses++;
 }
 assert.ok(victories&&losses);
});
test('invalid selections and failed simulations never mutate the roster',()=>{
 const s=start('guard'),id=s.arena.offers[0].id,before=JSON.stringify(s);
 for(const party of [[],['missing'],[s.members[0].id,s.members[0].id]])assert.throws(()=>fightArena(s,id,party,catalog,tables));
 assert.throws(()=>fightArena(s,id,[s.members[0].id],catalog,{}));assert.equal(JSON.stringify(s),before);
});
test('critical wounds stack, persist, and require multiple treatment days',()=>{
 const s=start('injuries'),m=s.members[0];
 const battle={log:[{events:[{target:m.id,critical:{severity:'C',description:'A leg wound'}},{target:m.id,mortal:true,critical:{severity:'B',description:'A mortal wound'}},{target:'foe',critical:{severity:'E'}},{target:m.id,critical:{severity:'E',ignored:true}}]}]};
 m.injuries=woundsFromBattle(m,battle,'fixture');m.damage=m.hits-1;
 assert.equal(m.injuries.length,2);assert.equal(injuryPenalty(m),30);
 const next=restArena(s);assert.equal(next.arena.day,s.arena.day+1);assert.equal(next.gold,s.gold);assert.equal(next.members[0].injuries.length,2);assert.ok(next.members[0].damage<m.damage);
 const twice=restArena(next);assert.equal(injuryPenalty(twice.members[0]),20);
 const done=restArena(restArena(twice));assert.equal(injuryPenalty(done.members[0]),0);assert.equal(done.members[0].damage,0);
});
test('fresh arena storage preserves old saves and rejects stale writes',()=>{
 const map=new Map([['rolemaster-guild-beta-v2','legacy']]),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 const state=start('save');saveArena(storage,state);assert.deepEqual(readArena(storage),state);assert.equal(map.get('rolemaster-guild-beta-v2'),'legacy');
 saveArena(storage,restArena(state),state);assert.throws(()=>saveArena(storage,state,state),/another tab/);
 const before=readArena(storage);assert.throws(()=>saveArena({getItem:storage.getItem,setItem:()=>{throw new Error('quota');}},restArena(before),before),/quota/);assert.deepEqual(readArena(storage),before);
 map.set(arenaSaveKey,'{}');assert.throws(()=>readArena(storage),/could not be read/);
});
test('whole selected party fights and receives XP; promotion preserves lasting wounds',()=>{
 const state=recruitArena(start('party'),fighter,'Willow');
 state.members[0].xp=99;state.members[0].injuries=[{id:'old',description:'Old wound',penalty:10,days:2}];
 // A weak printed profile creates a controlled victory while using the real battle engine.
 state.arena.offers[0].enemies=[{...state.arena.offers[0].enemies[0],hits:1,db:-100,attacks:[{name:'Weak bash',type:'Ba',attackTable:'A-10.9.7',size:'S',ob:-100,chance:100}]}];
 const next=fightArena(state,state.arena.offers[0].id,state.members.map(m=>m.id),catalog,tables),report=next.arena.reports[0];
 assert.equal(report.winner,0);assert.equal(report.rewards.length,2);
 assert.ok(next.members.every(m=>m.xp>0));assert.equal(next.members[0].level,5);assert.deepEqual(next.members[0].injuries[0],state.members[0].injuries[0]);assert.ok(validArena(next));
});
