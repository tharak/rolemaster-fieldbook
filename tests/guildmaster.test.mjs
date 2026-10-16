import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,readdirSync} from 'node:fs';
import {masterCharacterCatalog} from '../coliseum-contenders.js';
import {newGuild,equipMember,validGuild,encounterLoot} from '../guild-rules.js';
import {managementState,memberOrder,setMemberOrder,advanceGuildMaster,prepareGuildMaster,availableMemberSpells,setMemberSpells} from '../guildmaster-rules.js';
import {knownAutomatedSpells} from '../guild-spells.js';
import {splitLegacyGuild,adventureGuildKey,guildMasterKey} from '../guild-save-migration.js';
const json=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const catalog=masterCharacterCatalog(json('tables/T-5.8.json')),lists=json('data/guild/spell-lists.json');
const tables=Object.fromEntries(readdirSync(new URL('../tables/',import.meta.url)).filter(n=>n.startsWith('A-10.')).map(n=>[n.slice(0,-5),json('tables/'+n)]));
const fresh=()=>prepareGuildMaster(newGuild(catalog));
test('orders queue without acting, and adventures always use the member level',()=>{
 const original=fresh();original.members[0].damage=12;
 const next=setMemberOrder(original,original.members[0].id,{action:'adventure',level:20});
 assert.equal(next.hours,0);assert.deepEqual(next.members,original.members);assert.equal(next.gold,original.gold);assert.deepEqual(managementState(next).journeys,{});assert.ok(validGuild(next));
 assert.equal(memberOrder(next,next.members[0].id).level,1);assert.equal(memberOrder(original,original.members[0].id).action,'rest');assert.throws(()=>setMemberOrder(next,next.members[0].id,{action:'return'}));
});
test('rest, work and dead members resolve once on the shared four-hour clock',()=>{
 let s=fresh();s.members.forEach(m=>{m.damage=15;m.pp=0;});s.members[0].dead=true;s=setMemberOrder(s,s.members[1].id,{action:'work'});
 const one=advanceGuildMaster(s,catalog,{});assert.equal(one.hours,4);assert.equal(one.management.turn,1);assert.equal(one.management.reports[0].results.length,4);
 assert.equal(one.members[0].damage,15);assert.equal(one.members[1].damage,15);assert.equal(one.members[1].pp,0);assert.equal(one.gold,1);assert.equal(one.members[2].damage,11);
 const two=advanceGuildMaster(one,catalog,{});assert.equal(two.hours,8);assert.equal(two.gold,2);assert.equal(two.members[2].damage,7);assert.equal(two.members[2].pp,two.members[2].ppMax);assert.equal(two.members[1].pp,0);assert.equal(s.hours,0);
});
test('simultaneous adventures are independent, with one global clock increment',()=>{
 let s=fresh();s.members[2].damage=10;
 for(const m of s.members.slice(0,2))s=setMemberOrder(s,m.id,{action:'adventure'});
 const result=advanceGuildMaster(s,catalog,tables);assert.equal(result.hours,4);assert.equal(result.members[2].damage,6);assert.equal(result.management.reports[0].results.length,4);
 for(const journey of Object.values(result.management.journeys)){assert.equal(journey.party.length,1);assert.equal(journey.stage,1);assert.equal(journey.hours,4);assert.equal(journey.level,result.members.find(m=>m.id===journey.party[0]).level);}
 assert.deepEqual(result,advanceGuildMaster(s,catalog,tables));assert.ok(validGuild(JSON.parse(JSON.stringify(result))));
});
test('switching an away member to work queues a locked return and banks loot once',()=>{
 let s=fresh(),id=s.members[0].id;s=setMemberOrder(s,id,{action:'adventure'});s=advanceGuildMaster(s,catalog,tables);
 assert.ok(s.management.journeys[id]);const loot=encounterLoot(1,()=>0,'return-item');s.management.journeys[id].gold=loot.gold;s.management.journeys[id].items=loot.items;s.members[0].damage=10;
 assert.throws(()=>equipMember(s,id,'','shield'));
 s=setMemberOrder(s,id,{action:'work'});assert.equal(memberOrder(s,id).action,'return');assert.equal(memberOrder(s,id).nextAction,'work');assert.throws(()=>setMemberOrder(s,id,{action:'rest'}));
 assert.equal(s.gold,0);const next=advanceGuildMaster(s,catalog,{});assert.equal(next.gold,loot.gold);assert.equal(next.members[0].damage,10);assert.equal(next.inventory.filter(i=>i.id==='loot-return-item').length,1);assert.equal(next.management.journeys[id],undefined);assert.equal(memberOrder(next,id).action,'work');
 const worked=advanceGuildMaster(next,catalog,{});assert.equal(worked.gold,next.gold+1);assert.equal(worked.members[0].damage,10);assert.equal(worked.inventory.filter(i=>i.id==='loot-return-item').length,1);
});
test('spell equipment is limited to learned lists and levels and controls automatic casting',()=>{
 const s=fresh(),member=s.members.find(m=>m.profession==='Cleric'),available=availableMemberSpells(member,lists);
 assert.ok(available.every(spell=>spell.level===1));assert.ok(available.some(spell=>spell.key==='A-9.5.2:1'));
 const empty=setMemberSpells(s,member.id,[],lists);assert.deepEqual(knownAutomatedSpells(empty.members.find(m=>m.id===member.id)),[]);
 const selected=setMemberSpells(empty,member.id,['A-9.5.2:1'],lists);assert.equal(knownAutomatedSpells(selected.members.find(m=>m.id===member.id))[0].name,'Healing I');
 assert.throws(()=>setMemberSpells(s,member.id,['A-9.5.2:8'],lists));assert.throws(()=>setMemberSpells(s,member.id,['A-9.15.1:1'],lists));assert.throws(()=>setMemberSpells(s,member.id,['A-9.5.2:1','A-9.5.2:1'],lists));assert.equal(availableMemberSpells(s.members[0],lists).length,0);
 let away=setMemberOrder(s,member.id,{action:'adventure'});away=advanceGuildMaster(away,catalog,tables);if(away.management.journeys[member.id])assert.throws(()=>setMemberSpells(away,member.id,[],lists));
});
test('legacy progress forks once, preserving independent saves and no duplicate transfers',()=>{
 const old=fresh();delete old.mode;old.gold=37;old.management.turn=4;old.management.orders[old.members[0].id]={action:'return',level:5};
 const values=new Map([[adventureGuildKey,JSON.stringify(old)]]),storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
 splitLegacyGuild(storage);const manager=JSON.parse(storage.getItem(guildMasterKey)),adventure=JSON.parse(storage.getItem(adventureGuildKey));
 assert.equal(manager.gold,37);assert.equal(manager.management.turn,4);assert.equal(manager.management.orders[manager.members[0].id].level,1);assert.equal(manager.management.orders[manager.members[0].id].nextAction,'rest');assert.equal(manager.mode,'guildmaster');assert.equal(manager.expedition,null);assert.equal(adventure.management,undefined);assert.equal(adventure.gold,37);
 manager.gold=99;storage.setItem(guildMasterKey,JSON.stringify(manager));splitLegacyGuild(storage);assert.equal(JSON.parse(storage.getItem(guildMasterKey)).gold,99);assert.equal(JSON.parse(storage.getItem(adventureGuildKey)).gold,37);
 const untouched=JSON.stringify(old),failing={getItem:key=>key===adventureGuildKey?untouched:null,setItem:()=>{throw new Error('full');}};assert.throws(()=>splitLegacyGuild(failing));assert.equal(failing.getItem(adventureGuildKey),untouched);
});
test('a failed combat turn is atomic and saved selections survive reload',()=>{
 let s=fresh();const id=s.members[0].id;s=setMemberOrder(s,id,{action:'adventure'});let fixture;
 for(let i=0;i<200;i++){const candidate=structuredClone(s);candidate.management.seed='trial-'+i;const result=advanceGuildMaster(candidate,catalog,tables);if(result.management.reports[0].results.some(r=>r.encounter?.rounds.length)){fixture=candidate;break;}}
 assert.ok(fixture);const before=JSON.stringify(fixture);assert.throws(()=>advanceGuildMaster(fixture,catalog,{}));assert.equal(JSON.stringify(fixture),before);
 const parsed=JSON.parse(before);assert.ok(validGuild(parsed));assert.deepEqual(parsed.members[2].selectedSpells,fixture.members[2].selectedSpells);assert.equal(memberOrder(parsed,id).action,'adventure');assert.ok(validGuild(advanceGuildMaster(parsed,catalog,tables)));
});
