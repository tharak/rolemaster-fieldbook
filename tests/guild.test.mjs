import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {masterCharacterCatalog} from '../src/coliseum-contenders.js';
import {newGuild,recruitMember,guildContender,equipMember,departGuild,continueGuild,returnGuild,restGuild,encounterLoot,validGuild,guildItems} from '../src/guild-rules.js';
import {simulateGuildBattle} from '../src/guild-battle.js';import {seededRandom} from '../src/adventure-rules.js';
const json=name=>JSON.parse(readFileSync(new URL('../'+name,import.meta.url)));
const catalog=masterCharacterCatalog(json('tables/T-5.8.json')),lists=json('data/guild/spell-lists.json');
const tables=Object.fromEntries(['A-10.9.1','A-10.9.2','A-10.9.3','A-10.9.4','A-10.9.9','A-10.9.11',...Array.from({length:9},(_,i)=>`A-10.10.${i+1}`)].map(code=>[code,json(`tables/${code}.json`)]));
test('all 45 templates retain exact spell ranks and named lists from the core book',()=>{
 assert.equal(lists.length,96);for(const c of catalog){assert.equal(c.spellLists.reduce((n,l)=>n+l.ranks,0),c.spellRanks);for(const l of c.spellLists){assert.ok(lists.some(s=>s.id===l.id));assert.ok(l.ranks<=c.level);}}
 assert.equal(catalog.find(c=>c.profession==='Cleric'&&c.level===1).spellRanks,13);
 assert.equal(catalog.find(c=>c.profession==='Magician'&&c.level===20).spellRanks,323);
 assert.equal(lists.find(l=>l.id==='A-9.5.2').spells.find(s=>s.level===1).name,'Healing I');
});
test('guild departure validation, equipment exclusivity, shield DB and base-only recovery',()=>{
 let s=newGuild(catalog);assert.ok(validGuild(s));const first=s.members[0],second=s.members[1];
 assert.throws(()=>departGuild(s,{party:[],level:1,id:'x',seed:'x'}));assert.throws(()=>departGuild(s,{party:[first.id],level:0,id:'x',seed:'x'}));
 assert.throws(()=>equipMember(s,second.id,first.equipped.weapon,'weapon'));
 const db=guildContender(s,first).db;s=equipMember(s,first.id,'','shield');assert.equal(guildContender(s,s.members[0]).db,db-25);
 s.members.forEach(m=>{m.damage=20;m.pp=0;});s=departGuild(s,{party:[first.id],level:1,id:'test',seed:'test'});
 assert.throws(()=>equipMember(s,first.id,'','shield'));const rested=restGuild(s);assert.equal(rested.members[0].damage,20);assert.equal(rested.members[0].pp,0);assert.equal(rested.members[1].damage,0);assert.equal(rested.members[1].pp,second.ppMax);
 assert.equal(s.members[1].damage,20,'immutable transition');
 const returned=returnGuild(rested);assert.equal(returned.expedition,null);assert.equal(returned.members[0].damage,20);assert.throws(()=>returnGuild(returned));
});
test('loot is deterministic, has unique IDs, and is banked once on return',()=>{
 const loot=encounterLoot(5,()=>0,'one');assert.equal(loot.items.length,1);assert.equal(loot.items[0].bonus,5);
 let s=newGuild(catalog);s=departGuild(s,{party:[s.members[0].id],level:1,id:'x',seed:'x'});s.expedition.gold=loot.gold;s.expedition.items=loot.items;
 const returned=returnGuild(s);assert.equal(returned.gold,loot.gold);assert.equal(returned.inventory.filter(i=>i.id==='loot-one').length,1);assert.ok(validGuild(JSON.parse(JSON.stringify(returned))));
});
test('multi-character simulation has both sides acting, deterministic criticals and PP use',()=>{
 let s=newGuild(catalog);for(const profession of ['Cleric','Magician','Mentalist','Bard','Dabbler'])s=recruitMember(s,catalog.find(c=>c.profession===profession&&c.level===10));
 const party=s.members.slice(4).map(m=>guildContender(s,m)),foes=s.members.slice(0,3).map(m=>({...guildContender(s,m),id:'foe-'+m.id,hits:500,damage:0}));party[0].damage=25;
 const battle=simulateGuildBattle(party,foes,tables,seededRandom('spells'));assert.ok(battle.log.flatMap(r=>r.events).some(e=>e.kind==='spell'));assert.ok(battle.units.some(u=>u.pp<u.creature.ppMax));assert.ok(battle.log.flatMap(r=>r.events).some(e=>e.team===1));assert.deepEqual(battle,simulateGuildBattle(party,foes,tables,seededRandom('spells')));assert.ok(Object.values(battle.xp).every(x=>Number.isSafeInteger(x)&&x>=0));
});
test('random expeditions persist results, injuries, XP and terminate after defeat',()=>{
 let s=newGuild(catalog);s=recruitMember(s,catalog.find(c=>c.profession==='Fighter'&&c.level===20));
 s=departGuild(s,{party:[s.members.at(-1).id],level:1,id:'integration',seed:'victory'});
 const initial=structuredClone(s);let combats=0;
 for(let i=0;i<30&&s.expedition;i++){
  const before=structuredClone(s);s=continueGuild(s,catalog,tables);assert.deepEqual(s,continueGuild(before,catalog,tables));assert.ok(validGuild(s));const report=(s.expedition||s.history[0]).reports[0];if(report.rounds.length)combats++;
 }
 assert.ok(combats>0);assert.equal(initial.expedition.stage,0);assert.ok(s.members.at(-1).xp>0);assert.ok((s.expedition||s.history[0]).reports.some(r=>r.winner===0));
 let weak=newGuild(catalog);weak=departGuild(weak,{party:[weak.members[2].id],level:20,id:'doomed',seed:'east'});
 for(let i=0;i<30&&weak.expedition;i++)weak=continueGuild(weak,catalog,tables);
 assert.equal(weak.expedition,null);assert.ok(weak.history[0].reports.some(r=>r.winner!==0&&r.rounds.length));
});
test('rest never resurrects the dead and treats injury penalties over days',()=>{
 const s=newGuild(catalog);s.members[0].dead=true;s.members[0].damage=s.members[0].hits;s.members[1].effects=[{kind:'bleed',amount:3,roundsLeft:null},{kind:'penalty',amount:20,roundsLeft:null}];
 const next=restGuild(s,48);assert.equal(next.members[0].damage,s.members[0].hits);assert.ok(next.members[0].dead);assert.deepEqual(next.members[1].effects,[{kind:'penalty',amount:10,roundsLeft:null}]);
});
