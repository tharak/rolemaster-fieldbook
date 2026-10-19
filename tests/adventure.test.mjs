import test from 'node:test';
import assert from 'node:assert/strict';
import {generateWorld,findRoute,createAdventure,advanceAdventure,resolveAdventureEncounter,setCourse,completeAdventure,validAdventure,connectingEdge} from '../src/adventure-rules.js';
const party=[{id:'hero',name:'Mira',race:'Wood Elf',profession:'Ranger',level:1}];
const make=(goal='5-1')=>createAdventure({id:'journey',seed:'silver-road',party,goal});
test('seeded worlds are reproducible, varied and entirely connected',()=>{
 assert.deepEqual(generateWorld('a'),generateWorld('a'));assert.notDeepEqual(generateWorld('a').nodes,generateWorld('b').nodes);
 for(let seed=0;seed<40;seed++){
  const world=generateWorld(String(seed));assert.equal(world.nodes.length,18);
  for(const node of world.nodes){let from=world.start;for(const to of findRoute(world,from,node.id)){assert.ok(connectingEdge(world,from,to));from=to;}assert.equal(from,node.id);}
 }
});
test('journeys can reach and complete their mission, pausing for camp',()=>{
 let state=make();let camps=0;
 for(let i=0;state.current!==state.goal&&i<100;i++){
  if(state.travelSinceRest>=16){state=advanceAdventure(state,{camp:true},()=>50);camps++;}
  state=advanceAdventure(state,{},()=>50);assert.equal(state.pending,null);assert.ok(validAdventure(state));
 }
 assert.equal(state.current,state.goal);assert.ok(camps>0);assert.ok(state.miles>0);assert.ok(state.travelXp>=state.miles);
 state=completeAdventure(state);assert.equal(state.completed,true);assert.throws(()=>advanceAdventure(state));assert.throws(()=>completeAdventure(state));
});
test('four-hour progress is immutable, saves mid-route and prevents teleporting or retriggering encounters',()=>{
 const original=make(),before=JSON.stringify(original);let dice=[97,90,10,50];
 const next=advanceAdventure(original,{},()=>dice.shift());assert.equal(JSON.stringify(original),before);assert.ok(next.pending);assert.equal(next.pending.encounter.group.weighted,0.5);
 assert.throws(()=>advanceAdventure(next));assert.throws(()=>setCourse(next,'0-0'));
 const restored=JSON.parse(JSON.stringify(next));assert.ok(validAdventure(restored));
 const resolved=resolveAdventureEncounter(restored,'Negotiated passage.');assert.equal(resolved.pending,null);assert.equal(next.pending.id,restored.pending.id);
 assert.throws(()=>setCourse(resolved,'5-0'),/current stage/);
});
test('repeated routes earn no further travel XP; completion requires arrival',()=>{
 let state=make('0-0');assert.throws(()=>completeAdventure(state));state=advanceAdventure(state,{},()=>50);assert.equal(state.travelXp,12);
 state=setCourse(state,'0-1');state=advanceAdventure(state,{},()=>50);assert.equal(state.miles,24);assert.equal(state.travelXp,12);
 assert.throws(()=>createAdventure({id:'bad',seed:'a',party:[],goal:'1-1'}));assert.equal(validAdventure({...state,route:['bad']}),false);assert.equal(validAdventure({...state,journal:[null]}),false);
});
