import test from 'node:test';import assert from 'node:assert/strict';
import {resetLegacyBeta,betaSaveKey,betaResetKey,readBeta,writeBeta} from '../guild-beta-store.js';
const storageFor=entries=>{const entriesMap=new Map(entries);return {get length(){return entriesMap.size;},key:index=>[...entriesMap.keys()][index],getItem:key=>entriesMap.get(key)??null,setItem:(key,value)=>entriesMap.set(key,value),removeItem:key=>entriesMap.delete(key)};};
test('beta reset removes every old mode once and does not migrate or remove unrelated saves',()=>{
 const storage=storageFor(['rolemaster-fieldbook-characters-v1','rolemaster-guild-v1','rolemaster-guildmaster-v1','rolemaster-encounters-v2','rolemaster-coliseum-equipment-v1','rolemaster-gm-items'].map(key=>[key,'old']));storage.setItem('unrelated','keep');
 resetLegacyBeta(storage);assert.equal(storage.length,2);assert.equal(storage.getItem('unrelated'),'keep');assert.equal(storage.getItem(betaResetKey),'guild-beta-v2');
 storage.setItem(betaSaveKey,'new game');resetLegacyBeta(storage);assert.equal(storage.getItem(betaSaveKey),'new game');
});
test('new beta state survives reset retries and storage errors do not masquerade as saves',()=>{
 const storage=storageFor([[betaSaveKey,JSON.stringify({version:2})]]);resetLegacyBeta(storage);assert.deepEqual(readBeta(storage,s=>s.version===2),{version:2});
 assert.throws(()=>writeBeta(storage,{version:1},s=>s.version===2));
 assert.throws(()=>writeBeta({setItem(){throw Error('full');}},{version:2},()=>true),/full/);
});
