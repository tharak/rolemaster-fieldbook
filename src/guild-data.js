import {creatureCatalog} from './coliseum-rules.js';
import {masterCharacterCatalog} from './coliseum-contenders.js';
export async function fetchGuildJson(path){const response=await fetch(path);if(!response.ok)throw new Error('Game data could not load. Retry to continue.');return response.json();}
let dataPromise,combatPromise;
export function loadGuildData(){
 return dataPromise??=(Promise.all([fetchGuildJson('tables/T-5.8.json').then(masterCharacterCatalog),fetchGuildJson('data/guild/spell-lists.json')]).then(([catalog,lists])=>({catalog,lists})).catch(error=>{dataPromise=null;throw error;}));
}
export function loadGuildCombat(){
 const codes=['A-10.9.1','A-10.9.2','A-10.9.3','A-10.9.4','A-10.9.5','A-10.9.6','A-10.9.7','A-10.9.8','A-10.9.9','A-10.9.11',...Array.from({length:9},(_,i)=>`A-10.10.${i+1}`)];
 return combatPromise??=Promise.all(codes.map(async code=>[code,await fetchGuildJson(`tables/${code}.json`)])).then(Object.fromEntries).catch(error=>{combatPromise=null;throw error;});
}

let masterDataPromise;
export function loadGuildMasterData(){
 return masterDataPromise??=Promise.all([fetchGuildJson('tables/T-5.8.json'),fetchGuildJson('tables/creatures.json')]).then(([master,creatures])=>{
  const catalog=masterCharacterCatalog(master,{spellPresets:false}).map(entry=>({...entry,spellLists:[],selectedSpells:[]}));
  const opponents=[...catalog,...creatureCatalog(creatures).filter(entry=>entry.attacks.some(attack=>attack&&!attack.both))];
  return {catalog,opponents};
 }).catch(error=>{masterDataPromise=null;throw error;});
}
