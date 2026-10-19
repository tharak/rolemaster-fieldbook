// Application adapter: combat lives in rolemasterCore; Ludus policy stays here.
import {simulateGuildBattle as simulateCoreBattle} from '../vendor/rolemaster-core/src/guild-battle.js';
import {ludusConfig as C} from './ludus-config.js';
export function simulateGuildBattle(party,enemies,tables,random=Math.random,options={}){
 const {ludusSupport,...rest}=options;
 return simulateCoreBattle(party,enemies,tables,random,{
  ...rest,support:ludusSupport??rest.support??null,geometry:C.arena,elements:C.arena,
 });
}
