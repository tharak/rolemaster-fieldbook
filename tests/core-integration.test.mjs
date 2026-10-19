import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {simulateGuildBattle as legacyBattle} from '../src/guild-battle.js';
import {simulateGuildBattle as coreBattle} from '../vendor/rolemaster-core/src/guild-battle.js';
import {seededRandom} from '../src/adventure-rules.js';
import {ludusConfig} from '../src/ludus-config.js';
const pkg=JSON.parse(readFileSync(new URL('../vendor/rolemaster-core/package.json',import.meta.url)));
test('fieldbook compatibility modules share the core implementation and module state',async()=>{
 for(const name of Object.keys(pkg.exports).map(n=>n.slice(2)).filter(n=>n&&!['random','combat-support','guild-battle','rust-components'].includes(n))){
  const [legacy,core]=await Promise.all([import('../src/'+name+'.js'),import('../vendor/rolemaster-core/src/'+name+'.js')]);
  for(const key of Object.keys(core))if(key!=='initializeRankBonusEngine')assert.equal(legacy[key],core[key],name+'.'+key);
 }
 const coreRandom=await import('../vendor/rolemaster-core/src/random.js');assert.equal(seededRandom,coreRandom.seededRandom);
});
test('Ludus combat adapter forwards current game policy without modifying core defaults',()=>{
 const unit={id:'p',name:'Fighter',level:1,hits:40,damage:0,pp:0,db:0,armor_type:1,attacks:[],equipment:{},effects:[],conditions:[]};
 const options={roundLimit:1,recordPlayback:true,ludusSupport:{clock:5,auras:[]}},enemies=[{...unit,id:'e'}];
 const legacy=legacyBattle([unit],enemies,{},seededRandom('adapter'),structuredClone(options));
 const core=coreBattle([unit],enemies,{},seededRandom('adapter'),{roundLimit:1,recordPlayback:true,support:structuredClone(options.ludusSupport),geometry:ludusConfig.arena,elements:ludusConfig.arena});
 assert.deepEqual(legacy,core);
});
