import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,readdirSync} from 'node:fs';
import {masterCharacterCatalog} from '../coliseum-contenders.js';
import {newGuild,departGuild,equipMember,restGuild,validGuild,encounterLoot} from '../guild-rules.js';
import {managementState,memberOrder,setMemberOrder,advanceGuildMaster} from '../guildmaster-rules.js';
const catalog=masterCharacterCatalog(JSON.parse(readFileSync(new URL('../tables/T-5.8.json',import.meta.url))));
const tables=Object.fromEntries(readdirSync(new URL('../tables/',import.meta.url)).filter(n=>n.startsWith('A-10.')).map(n=>[n.slice(0,-5),JSON.parse(readFileSync(new URL('../tables/'+n,import.meta.url)))]));
test('orders queue without advancing time, healing or paying rewards',()=>{
 const original=newGuild(catalog);original.members[0].damage=12;
 const next=setMemberOrder(original,original.members[0].id,{action:'adventure',level:5});
 assert.equal(next.hours,0);assert.deepEqual(next.members,original.members);assert.equal(next.gold,original.gold);assert.deepEqual(managementState(next).journeys,{});assert.equal(original.management,undefined);assert.ok(validGuild(next));
 assert.throws(()=>setMemberOrder(next,next.members[0].id,{action:'return',level:5}));assert.throws(()=>setMemberOrder(next,next.members[0].id,{action:'adventure',level:21}));
});
test('four hours resolves each rest order once, with PP recovery after eight hours',()=>{
 const s=newGuild(catalog);s.members.forEach(m=>{m.damage=15;m.pp=0;});s.members[0].dead=true;
 const one=advanceGuildMaster(s,catalog,{});assert.equal(one.hours,4);assert.equal(one.management.turn,1);assert.equal(one.management.reports[0].results.length,4);
 assert.equal(one.members[0].damage,15);assert.equal(one.members[1].damage,11);assert.equal(one.members[1].pp,0);
 const two=advanceGuildMaster(one,catalog,{});assert.equal(two.hours,8);assert.equal(two.members[1].damage,7);assert.equal(two.members[1].pp,two.members[1].ppMax);assert.equal(s.hours,0);
});
test('simultaneous adventures are independent and the shared clock advances only once',()=>{
 let s=newGuild(catalog);s.members[2].damage=10;
 for(const m of s.members.slice(0,2))s=setMemberOrder(s,m.id,{action:'adventure',level:1});
 const result=advanceGuildMaster(s,catalog,tables);assert.equal(result.hours,4);assert.equal(result.members[2].damage,6);assert.equal(result.management.reports[0].results.length,4);
 for(const journey of Object.values(result.management.journeys)){assert.equal(journey.party.length,1);assert.equal(journey.stage,1);assert.equal(journey.hours,4);}
 assert.deepEqual(result,advanceGuildMaster(s,catalog,tables));assert.ok(validGuild(JSON.parse(JSON.stringify(result))));
 assert.equal(s.members[2].damage,10);
});
test('come back banks loot on the turn, prevents double payment and does not also rest',()=>{
 let s=newGuild(catalog),id=s.members[0].id;
 const journey=departGuild(s,{party:[id],level:1,seed:'west',id:'return-test'}).expedition;
 const loot=encounterLoot(1,()=>0,'return-item');journey.gold=loot.gold;journey.items=loot.items;
 s.management={...managementState(s),journeys:{[id]:journey}};s.members[0].damage=10;
 s=setMemberOrder(s,id,{action:'return',level:1});assert.equal(s.gold,0);assert.equal(s.inventory.filter(i=>i.id==='loot-return-item').length,0);
 const next=advanceGuildMaster(s,catalog,{});assert.equal(next.gold,loot.gold);assert.equal(next.members[0].damage,10);assert.equal(next.inventory.filter(i=>i.id==='loot-return-item').length,1);assert.equal(next.management.journeys[id],undefined);assert.equal(memberOrder(next,id).action,'rest');
 const rested=advanceGuildMaster(next,catalog,{});assert.equal(rested.gold,next.gold);assert.equal(rested.members[0].damage,6);assert.equal(rested.inventory.filter(i=>i.id==='loot-return-item').length,1);
});
test('both pages respect members already away and equipment remains locked',()=>{
 let s=newGuild(catalog),id=s.members[0].id;
 const journey=departGuild(s,{party:[id],level:1,seed:'west',id:'solo'}).expedition;s.management={...managementState(s),journeys:{[id]:journey}};
 assert.throws(()=>departGuild(s,{party:[id],level:1,seed:'west',id:'party'}));assert.throws(()=>equipMember(s,id,'','shield'));assert.throws(()=>setMemberOrder(s,id,{action:'rest',level:1}));assert.throws(()=>setMemberOrder(s,id,{action:'adventure',level:5}));
 s.members[0].damage=10;assert.equal(restGuild(s).members[0].damage,10);
 s=departGuild(s,{party:[s.members[1].id],level:1,seed:'west',id:'party'});assert.throws(()=>setMemberOrder(s,s.members[1].id,{action:'rest',level:1}));
 const next=advanceGuildMaster(s,catalog,tables);assert.deepEqual(next.expedition,s.expedition);assert.equal(next.management.reports[0].results.find(r=>r.memberId===s.members[1].id).action,'external');assert.ok(validGuild(next));
});
test('failed simulation is atomic and reload preserves pending actions',()=>{
 let s=newGuild(catalog);const id=s.members[0].id;s=setMemberOrder(s,id,{action:'adventure',level:20});
 let combatSeed;
 for(let i=0;i<200;i++){
  const candidate=structuredClone(s);candidate.management.seed='trial-'+i;
  const result=advanceGuildMaster(candidate,catalog,tables);
  if(result.management.reports[0].results.some(r=>r.encounter?.rounds.length)){combatSeed=candidate;break;}
 }
 assert.ok(combatSeed,'expected hostile encounter fixture');const before=JSON.stringify(combatSeed);
 assert.throws(()=>advanceGuildMaster(combatSeed,catalog,{}));assert.equal(JSON.stringify(combatSeed),before);
 const parsed=JSON.parse(before);assert.ok(validGuild(parsed));assert.equal(memberOrder(parsed,id).action,'adventure');
 const finished=advanceGuildMaster(parsed,catalog,tables);assert.ok(finished.management.reports[0].results[0].encounter.rounds.length);assert.equal(finished.management.journeys[id],undefined);assert.equal(memberOrder(finished,id).action,'rest');assert.ok(validGuild(finished));
});
