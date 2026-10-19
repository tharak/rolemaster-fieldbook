import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {masterCharacterCatalog} from '../src/coliseum-contenders.js';
import {printedContender} from '../src/guild-rules.js';
import {simulateGuildBattle} from '../src/guild-battle.js';
import {seededRandom} from '../src/adventure-rules.js';
import {applyPlaybackChanges,playbackSteps,playbackStatuses,playbackNarration} from '../src/arena-playback.js';
const read=n=>JSON.parse(readFileSync(new URL('../tables/'+n+'.json',import.meta.url)));
const tables=Object.fromEntries(readdirSync(new URL('../tables/',import.meta.url)).filter(n=>n.startsWith('A-10.')).map(n=>[n.slice(0,-5),read(n.slice(0,-5))]));
const template=masterCharacterCatalog(read('T-5.8')).find(c=>c.profession==='Fighter'&&c.level===1);
const combatant=(id)=>({...printedContender(template),id,name:id});
test('recording playback does not change seeded combat, rewards, or random consumption',()=>{
 const party=[combatant('one'),combatant('two')],enemies=[combatant('enemy')];
 const a=simulateGuildBattle(party,enemies,tables,seededRandom('record'));
 const b=simulateGuildBattle(party,enemies,tables,seededRandom('record'),{recordPlayback:true});
 assert.deepEqual({...b,playback:undefined,log:b.log.map(r=>({...r,events:r.events.map(({changes,...e})=>e)}))},{...a,playback:undefined});
 let frame=b.playback.initial;
 for(const round of b.log)for(const e of round.events){
  const old=frame;frame=applyPlaybackChanges(frame,e.changes);
  if(e.kind==='attack')assert.equal(frame.find(u=>u.id===e.target).hp,Math.max(0,old.find(u=>u.id===e.target).hp-e.damage));
  if(e.kind==='bleed')assert.equal(frame.find(u=>u.id===e.target).hp,Math.max(0,old.find(u=>u.id===e.target).hp-e.hits));
 }
 frame=applyPlaybackChanges(frame,b.playback.final);
 for(const u of b.units){const shown=frame.find(f=>f.id===u.id);assert.equal(shown.hp,Math.max(0,u.creature.hits-u.hits));assert.equal(shown.pp,u.pp);assert.equal(shown.dead,!!u.dead);}
 assert.equal(playbackSteps({rounds:b.log}).length,b.log.length+b.log.reduce((n,r)=>n+r.events.length,0));
});
test('playback captures existing wounds, bleeding, and healing without deriving HP from prose',()=>{
 const healer={...combatant('healer'),level:1,damage:20,pp:5,spellLists:[{id:'A-9.5.2',ranks:1}],selectedSpells:['A-9.5.2:1'],effects:[{kind:'bleed',amount:1,roundsLeft:null}]};
 const enemy=combatant('enemy');enemy.attacks=enemy.attacks.map(a=>({...a,ob:-100}));enemy.db=1000;
 const battle=simulateGuildBattle([healer],[enemy],tables,seededRandom('healing'),{recordPlayback:true,roundLimit:4});
 assert.equal(battle.playback.initial[0].hp,healer.hits-20);
 let frame=battle.playback.initial,healed=false,bled=false;
 for(const r of battle.log)for(const event of r.events){const before=frame;frame=applyPlaybackChanges(frame,event.changes);if(event.kind==='bleed'){bled=true;assert.equal(frame[0].hp,before[0].hp-1);}if(event.kind==='spell'&&event.success){healed=true;assert.ok(frame[0].hp>before[0].hp);assert.ok(frame[0].pp<before[0].pp);}}
 assert.ok(healed&&bled);
});
test('timelines include empty rounds and statuses distinguish being down from zero HP',()=>{
 assert.deepEqual(playbackSteps({rounds:[{round:1,events:[]}]}),[{kind:'round',round:1}]);
 assert.deepEqual(playbackStatuses({standing:false,dead:false,asleep:true,hp:20}),['Asleep']);
 assert.deepEqual(playbackStatuses({standing:false,dead:true,hp:20}),['Fallen']);
 const units=[{id:'x',hp:5}],changed=applyPlaybackChanges(units,[{id:'x',hp:8}]);assert.equal(units[0].hp,5);assert.equal(changed[0].hp,8);
 assert.match(playbackNarration({kind:'attack',actor:'a',target:'b',attackName:'Sword',damage:7},[{id:'a',name:'One'},{id:'b',name:'Two'}]),/One uses Sword on Two — 7 damage/);
});
