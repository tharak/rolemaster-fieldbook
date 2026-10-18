import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {masterCharacterCatalog} from '../coliseum-contenders.js';
import {newGame,validGame,hireMember,careForMember,assignActivity,dismissMember,levelMembers,advanceGame} from '../guild-game-rules.js';
const json=name=>JSON.parse(readFileSync(new URL('../'+name,import.meta.url)));
const catalog=masterCharacterCatalog(json('tables/T-5.8.json'));
const tables=Object.fromEntries(readdirSync(new URL('../tables/',import.meta.url)).filter(n=>n.startsWith('A-10.')).map(n=>[n.slice(0,-5),json('tables/'+n)]));
const fresh=()=>hireMember(newGame('care-test'),catalog.find(m=>m.level===1),'Rowan');
test('empty beta, free founder, paid recruitment and capacity',()=>{
 const empty=newGame();assert.ok(validGame(empty));assert.equal(empty.members.length,0);assert.deepEqual(empty.inventory,[]);
 let s=fresh();assert.equal(s.gold,20);assert.equal(s.members[0].name,'Rowan');assert.equal(empty.members.length,0);
 s=hireMember(s,catalog[0]);assert.equal(s.gold,8);assert.throws(()=>hireMember(s,catalog[0]));
 s.gold=100;while(s.members.length<6)s=hireMember(s,catalog[0]);assert.throws(()=>hireMember(s,catalog[0]));assert.ok(validGame(s));
 assert.throws(()=>hireMember(fresh(),catalog.find(m=>m.level===5)));assert.throws(()=>dismissMember(fresh(),fresh().members[0].id));
});
test('work is unavailable, meals are instant, and free rest prevents softlocks',()=>{
 const initial=fresh(),id=initial.members[0].id;
 assert.throws(()=>assignActivity(initial,id,'work'));
 let s=structuredClone(initial);s.management.orders[id]={action:'work',level:1};
 s=advanceGame(s,catalog,{});assert.equal(s.gold,20);assert.equal(s.hours,4);assert.equal(s.management.reports[0].results[0].action,'rest');assert.equal(initial.hours,0);
 s=careForMember(s,id);assert.equal(s.gold,19);assert.equal(s.members[0].care.food,100);
 s.gold=0;s.members[0].care={food:0,energy:0,morale:0};s.members[0].damage=10;
 assert.throws(()=>assignActivity(s,id,'adventure'));s=advanceGame(s,catalog,{});assert.equal(s.management.reports[0].results[0].action,'rest');assert.ok(s.members[0].care.food>0);assert.ok(s.members[0].damage<10);assert.ok(validGame(s));
});
test('three exploration stages queue return and bank rewards exactly once',()=>{
 let completed=false;
 for(let seed=0;seed<200&&!completed;seed++){
  let s=fresh();const id=s.members[0].id;s.management.seed='trip-'+seed;s=assignActivity(s,id,'adventure');
  for(let turn=0;turn<3;turn++)s=advanceGame(s,catalog,tables);
  const journey=s.management.journeys[id];if(journey?.stage!==3)continue;
  assert.equal(s.management.orders[id].action,'return');assert.throws(()=>careForMember(s,id));assert.ok(s.members[0].xp>=15);
  const gold=s.gold,carried=journey.gold;s=advanceGame(s,catalog,tables);assert.equal(s.gold,gold+carried+2);assert.equal(s.completedTrips,1);assert.ok(!s.management.journeys[id]);assert.ok(validGame(s));
  const rested=advanceGame(s,catalog,{});assert.equal(rested.gold,s.gold);completed=true;
 }
 assert.ok(completed);
});
test('XP automatically levels members without gold or recovery requirements',()=>{
 let s=fresh(),m=s.members[0];m.xp=100;s.gold=0;m.care.energy=0;m.damage=10;
 const old=structuredClone(m);s=levelMembers(s,catalog);m=s.members[0];assert.equal(m.level,5);assert.equal(m.id,old.id);assert.equal(m.name,old.name);assert.equal(m.xp,100);assert.equal(m.hits-m.damage,old.hits-old.damage);assert.deepEqual(m.care,old.care);assert.deepEqual(m.assignments,old.assignments);assert.equal(s.gold,0);assert.ok(validGame(s));
 s.members[0].xp=1000;s=levelMembers(s,catalog);assert.equal(s.members[0].level,20);assert.deepEqual(levelMembers(s,catalog),s);
});
test('adventure XP triggers leveling within the same turn',()=>{
 let s=fresh();s.members[0].xp=99;s=assignActivity(s,s.members[0].id,'adventure');
 s=advanceGame(s,catalog,tables);assert.ok(s.members[0].level>=5);assert.ok(validGame(s));
});
test('defeat returns a living wounded member and all simulated states remain valid',()=>{
 let rescued=false;
 for(let seed=0;seed<200&&!rescued;seed++){
  let s=fresh();s.management.seed='rescue-'+seed;s=assignActivity(s,s.members[0].id,'adventure');s=advanceGame(s,catalog,tables);assert.ok(validGame(s));
  if(!s.management.reports[0].results[0].summary.includes('rescued'))continue;
  const m=s.members[0];assert.equal(m.dead,false);assert.equal(m.hits-m.damage,1);assert.ok(!s.management.journeys[m.id]);s=advanceGame(s,catalog,{});assert.ok(s.members[0].hits-s.members[0].damage>1);rescued=true;
 }
 assert.ok(rescued);
});
