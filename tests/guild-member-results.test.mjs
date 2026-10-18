import test from 'node:test';
import assert from 'node:assert/strict';
import {latestMemberResult,memberResultCard,combatLog} from '../guild-member-results.js';
const member={id:'one',name:'Rowan'};
const result={memberId:'one',name:'Rowan',action:'adventure',xp:12,gold:5,items:[{name:'Sword <rare>'}],summary:'Victory <script>',encounter:{winner:0,enemies:[{name:'Orc <chief>'}],rounds:[{round:1,events:[{text:'Attack <10>'}]}]}};
const state={management:{reports:[{number:3,results:[{memberId:'one',action:'rest'}]},{number:2,results:[result]}]}};
test('latest adventure rewards survive rest and show only actual rewards',()=>{
 assert.equal(latestMemberResult(state,'one').turn,2);
 const html=memberResultCard(state,member,2);
 assert.match(html,/\+12xp \+5g \+Sword &lt;rare&gt;/);assert.match(html,/result-flash/);assert.match(html,/data-combat-turn="2"/);
 assert.equal(memberResultCard(state,{id:'other'},2),'');
 assert.doesNotMatch(memberResultCard(state,member,null),/result-flash/);
});
test('quiet travel has no combat control and returns label banked gold',()=>{
 const saved=structuredClone(state);saved.management.reports.unshift({number:4,results:[{memberId:'one',action:'return',gold:7,items:[]}]});
 const html=memberResultCard(saved,member,4);assert.match(html,/\+7g banked/);assert.doesNotMatch(html,/data-combat-member|Sword/);
});
test('combat popup escapes names and events and handles archived rounds',()=>{
 const html=combatLog(result);assert.match(html,/Round 1/);assert.match(html,/Attack &lt;10&gt;/);assert.doesNotMatch(html,/<script>/);
 assert.match(combatLog({encounter:{winner:0,rounds:[],archivedRounds:20}}),/archived/);
 assert.match(combatLog(undefined),/No combat log/);
});
