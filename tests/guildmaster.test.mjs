import {creatureCatalog} from '../src/coliseum-rules.js';
import {simulateGuildBattle} from '../src/guild-battle.js';
import {seededRandom} from '../src/adventure-rules.js';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,readdirSync} from 'node:fs';
import {masterCharacterCatalog} from '../src/coliseum-contenders.js';
import {newGuild,equipMember,validGuild,encounterLoot,guildContender,printedContender} from '../src/guild-rules.js';
import {managementState,memberOrder,setMemberOrder,advanceGuildMaster,prepareGuildMaster,availableMemberSpells,setMemberSpells} from '../src/guildmaster-rules.js';
import {knownAutomatedSpells} from '../src/guild-spells.js';
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
test('printed profiles preserve progress but ignore custom equipment and spells',()=>{
 const old=newGuild(catalog);old.gold=37;old.members[0].damage=7;old.members[0].xp=123;
 old.inventory.find(item=>item.id===old.members[0].equipped.weapon).bonus=100;
 old.members[0].db=999;
 const state=prepareGuildMaster(old,catalog),member=state.members[0],template=catalog.find(c=>c.id===member.templateId);
 assert.equal(state.gold,37);assert.equal(member.damage,7);assert.equal(member.xp,123);assert.deepEqual(state.inventory,old.inventory);
 assert.equal(member.db,template.db);assert.equal(guildContender(state,member).attacks[0].ob,template.attacks[0].ob);
 assert.equal(guildContender(state,member).armor_type,template.armor_type);
 assert.equal(guildContender(state,member).db,template.db);
 for(const member of state.members){assert.deepEqual(availableMemberSpells(member,lists),[]);assert.deepEqual(knownAutomatedSpells(guildContender(state,member)),[]);}
 assert.throws(()=>equipMember(state,member.id,'','shield'));
 assert.throws(()=>setMemberSpells(state,member.id,[],lists));
 assert.equal(old.members[0].db,999);assert.ok(validGuild(state));
 assert.deepEqual(prepareGuildMaster(state,catalog),state);
});
test('all monster and animal profiles can resolve with printed attacks',()=>{
 const creatures=creatureCatalog(json('tables/creatures.json'));
 assert.equal(creatures.length,130);
 for(const creature of creatures.filter(c=>c.attacks.some(a=>a&&!a.both))){
  const foe={...printedContender(creature),id:'foe'};
  const member={...printedContender(catalog[0]),id:'member',hits:1000};
  const battle=simulateGuildBattle([member],[foe],tables,seededRandom(creature.id),{roundLimit:5});
  assert.ok(battle.log.length,creature.name);
  assert.ok(battle.units.every(unit=>Number.isFinite(unit.hits)),creature.name);
  assert.ok(battle.log.flatMap(round=>round.events).every(event=>!['spell','prepare'].includes(event.kind)),creature.name);
 }
});
test('GuildMaster can encounter both creature charts and awards no new equipment',()=>{
 const creatures=creatureCatalog(json('tables/creatures.json'));
 for(const group of ['Monster','Animal']){
  let state=fresh();const id=state.members[0].id;state=setMemberOrder(state,id,{action:'adventure'});
  const opponent=creatures.find(c=>c.group===group&&c.level===1&&c.attacks.some(a=>a&&!a.both));
  let found=false;
  for(let i=0;i<100&&!found;i++){
   state.management.seed='creature-'+i;
   const next=advanceGuildMaster(state,[opponent],tables),report=next.management.reports[0].results[0].encounter;
   if(!report?.enemies)continue;
   found=true;assert.ok(report.enemies.every(enemy=>enemy.name.startsWith(opponent.name)));assert.deepEqual(report.items,[]);assert.ok(validGuild(next));
  }
  assert.ok(found,group);
 }
});
test('a failed combat turn is atomic and saved selections survive reload',()=>{
 let s=fresh();const id=s.members[0].id;s=setMemberOrder(s,id,{action:'adventure'});let fixture;
 for(let i=0;i<200;i++){const candidate=structuredClone(s);candidate.management.seed='trial-'+i;const result=advanceGuildMaster(candidate,catalog,tables);if(result.management.reports[0].results.some(r=>r.encounter?.rounds.length)){fixture=candidate;break;}}
 assert.ok(fixture);const before=JSON.stringify(fixture);assert.throws(()=>advanceGuildMaster(fixture,catalog,{}));assert.equal(JSON.stringify(fixture),before);
 const parsed=JSON.parse(before);assert.ok(validGuild(parsed));assert.deepEqual(parsed.members[2].selectedSpells,fixture.members[2].selectedSpells);assert.equal(memberOrder(parsed,id).action,'adventure');assert.ok(validGuild(advanceGuildMaster(parsed,catalog,tables)));
});
