import test from 'node:test';
import assert from 'node:assert/strict';
import {buyGuildItem,sellGuildItem,salePrice} from '../src/guild-shop.js';
const base=()=>({gold:20,nextId:1,inventory:[],members:[]});
test('shop purchases persist unique equipment and charge once without mutating input',()=>{
 const original=base(),next=buyGuildItem(original,'sword');assert.equal(next.gold,12);assert.equal(next.inventory[0].id,'item-1');assert.equal(next.inventory[0].bonus,0);assert.equal(original.gold,20);
 const again=buyGuildItem(next,'sword');assert.equal(again.inventory[1].id,'item-2');assert.equal(again.gold,4);assert.throws(()=>buyGuildItem(again,'sword'),/gold/);assert.throws(()=>buyGuildItem(original,'fake'),/not for sale/);
});
test('resale rejects equipped and missing items and removes sold items exactly once',()=>{
 const state=buyGuildItem(base(),'sword'),id=state.inventory[0].id;state.members=[{equipped:{weapon:id}}];assert.throws(()=>sellGuildItem(state,id),/Unequip/);
 state.members=[];const sold=sellGuildItem(state,id);assert.equal(sold.gold,16);assert.equal(sold.inventory.length,0);assert.equal(state.inventory.length,1);assert.throws(()=>sellGuildItem(sold,id),/no longer/);assert.equal(salePrice({key:'sword',bonus:5}),29);
});
