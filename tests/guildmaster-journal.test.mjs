import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {journalKind,journalTurns,guildMasterJournal} from '../src/guildmaster-journal.js';
import {prepareGuildMaster,setMemberOrder,advanceGuildMaster,dismissGuildMember} from '../src/guildmaster-rules.js';
import {newGuild,validGuild,recruitMember} from '../src/guild-rules.js';
import {masterCharacterCatalog} from '../src/coliseum-contenders.js';
const catalog=masterCharacterCatalog(JSON.parse(readFileSync(new URL('../tables/T-5.8.json',import.meta.url))));
const entry={memberId:'one',name:'Fighter <one>',action:'adventure',summary:'Travel <quiet>',hpBefore:50,hpAfter:45,ppBefore:0,ppAfter:0,xp:20,gold:2,items:[],away:true};
const travel={...entry,encounter:{location:'Forest',encounter:{type:'none',label:'No encounter',cell:'-/-'},rounds:[]}};
const combat={...entry,encounter:{location:'Road',encounter:{label:'Hostile group',cell:'h/h'},winner:0,rounds:[],archivedRounds:12,enemies:[{name:'Wolf'}]}};
const base={...entry,memberId:'two',name:'Cleric',action:'rest',summary:'Rested.',xp:0,gold:0};
const reports=[{number:2,hour:8,results:[combat,base]},{number:1,hour:4,results:[travel]}];
test('journal filters intersect while preserving newest-first turns and archived combat',()=>{
 assert.equal(journalKind(combat),'combat');assert.equal(journalKind(travel),'travel');assert.equal(journalKind(base),'base');
 assert.deepEqual(journalTurns(reports,{kind:'combat'}).map(t=>t.number),[2]);
 assert.deepEqual(journalTurns(reports,{member:'one'}).map(t=>t.number),[2,1]);
 assert.deepEqual(journalTurns(reports,{member:'two',kind:'travel'}),[]);
 assert.equal(reports[0].results.length,2);
});
test('journal retains dismissed member names, escapes content and explains archived rounds',()=>{
 const html=guildMasterJournal({members:[],management:{reports}},{limit:1});
 assert.ok(html.includes('Fighter &lt;one&gt;'));assert.ok(!html.includes('Fighter <one>'));
 assert.ok(html.includes('Older round details have been archived'));assert.ok(html.includes('Show older turns'));assert.ok(html.includes('2 gold found'));
 assert.ok(html.includes('value="one"'));assert.ok(!html.includes('PP 0 → 0'));
 const noMatch=guildMasterJournal({members:[],management:{reports}},{member:'two',kind:'travel'});
 assert.ok(noMatch.includes('No entries match'));assert.ok(noMatch.includes('Clear filters'));
 assert.ok(guildMasterJournal({members:[],management:{reports:[]}}).includes('first entry'));
});
test('dismissal removes roster and order, preserves history, gold and inventory, and remains valid',()=>{
 let state=prepareGuildMaster(newGuild(catalog),catalog);const id=state.members[0].id;
 state=setMemberOrder(state,id,{action:'work'});state=advanceGuildMaster(state,catalog,{});
 const before=structuredClone(state),next=dismissGuildMember(state,id);
 assert.equal(next.members.length,state.members.length-1);assert.equal(next.management.orders[id],undefined);
 assert.deepEqual(next.management.reports,state.management.reports);assert.deepEqual(next.inventory,state.inventory);assert.equal(next.gold,state.gold);assert.equal(next.nextId,state.nextId);
 assert.ok(validGuild(next));assert.ok(validGuild(JSON.parse(JSON.stringify(next))));assert.deepEqual(state,before);
 assert.ok(guildMasterJournal(next).includes(state.members[0].name));assert.throws(()=>dismissGuildMember(next,id));
 const recruited=recruitMember(next,catalog[0]);assert.notEqual(recruited.members.at(-1).name,state.members[0].name);assert.notEqual(recruited.members.at(-1).id,id);
 let empty=next;for(const member of next.members)empty=dismissGuildMember(empty,member.id);
 assert.equal(empty.members.length,0);assert.ok(validGuild(empty));assert.ok(empty.management.reports.length);
});
test('away and returning members cannot be dismissed; dead members at base can',()=>{
 const state=prepareGuildMaster(newGuild(catalog),catalog),id=state.members[0].id;
 state.management.journeys[id]={party:[id]};assert.throws(()=>dismissGuildMember(state,id),/return/);
 state.management.orders[id]={action:'return',level:1};assert.throws(()=>dismissGuildMember(state,id),/return/);
 delete state.management.journeys[id];state.members[0].dead=true;assert.ok(!dismissGuildMember(state,id).members.some(m=>m.id===id));
});
