// GuildMaster's simplified equipment assignments; source-table bonuses stay intact.
import {seededRandom} from './adventure-rules.js';
import {arenaWeaponStyles} from './coliseum-contenders.js';
import {attackName,attackTypes} from './coliseum-rules.js';

const weapons=[
 ['broadsword','Broadsword','1-H Edged'],['short-sword','Short Sword','1-H Edged'],['handaxe','Handaxe','1-H Edged'],
 ['mace','Mace','1-H Concussion'],['war-hammer','War Hammer','1-H Concussion'],
 ['quarterstaff','Quarterstaff','2-Handed'],['two-hand-sword','Two-Hand Sword','2-Handed'],['spear','Spear','Pole Arms'],
 ['short-bow','Short Bow','Missile'],['long-bow','Long Bow','Missile'],['composite-bow','Composite Bow','Missile'],
 ['light-crossbow','Light Crossbow','Missile'],['sling','Sling','Missile'],['javelin','Javelin','Thrown'],['dart','Dart','Thrown']
].map(([id,name,group])=>{
 const category=`Weapon • ${group}`,style=arenaWeaponStyles[category];
 return {id,name,kind:style.kind,category,attackTable:style.table,criticalTable:style.critical};
});
// Bolt parameters printed in A-10.9.9, p. 228.
const bolts=[
 ['fire','Fire Bolt',0,150,'A-10.10.2','E'],['ice','Ice Bolt',-10,150,'A-10.10.1','E'],
 ['lightning','Lightning Bolt',10,150,'A-10.10.2','E'],['shock','Shock Bolt',-40,90,'A-10.10.2','C'],
 ['water','Water Bolt',-20,120,'A-10.10.3','D']
].map(([id,name,obModifier,cap,criticalTable,maxCritical])=>({id,name,kind:'ds',attackTable:'A-10.9.9',criticalTable,obModifier,cap,maxCritical,simpleBolt:true}));
export const assignmentCatalog=[...weapons,...bolts];
export const assignmentPools=Object.fromEntries(['me','ms','ds'].map(kind=>[kind,assignmentCatalog.filter(item=>item.kind===kind)]));
// Core armor descriptions, A-4.1 (not the abbreviated notebook labels).
export const armorNames=[null,'Skin / Normal Clothes','Robes','Light Hide','Heavy Hide','Leather Jerkin','Leather Coat',
 'Reinforced Leather Coat','Reinforced Full-Length Leather Coat','Leather Breastplate','Leather Breastplate & Greaves',
 'Half-Hide Plate','Full-Hide Plate','Chain Shirt','Chain Shirt & Greaves','Full Chain','Chain Hauberk',
 'Metal Breastplate','Metal Breastplate & Greaves','Half Plate','Full Plate'];
export function armorDescription(profile){
 return profile.sourceKind==='master'?armorNames[profile.armor_type]||'Unknown armor':`Natural armor · AT ${profile.armor_type}`;
}
export function profileAssignments(profile,seed=profile.id){
 const previous=profile.assignments?.version===1?profile.assignments.slots||{}:{};
 const slots={};
 const sources=profile.sourceKind==='master'?profile.sourceAttacks.map(attack=>({slot:attack.slot,kind:attack.kind})):
  profile.attacks.flatMap((attack,index)=>attack?.type==='Wp'?[{slot:index+1,kind:'me'}]:[]);
 for(const {slot,kind} of sources){
  const pool=assignmentPools[kind];
  if(!pool)throw new Error(`Unsupported printed attack kind: ${kind}`);
  slots[slot]=pool.some(item=>item.id===previous[slot])?previous[slot]:pool[Math.floor(seededRandom(`${seed}:slot:${slot}`)()*pool.length)].id;
 }
 return {version:1,slots};
}
export function assignedProfileAttacks(profile,assignments=profileAssignments(profile)){
 const assigned=slot=>assignmentCatalog.find(item=>item.id===assignments.slots[slot]);
 if(profile.sourceKind==='master'){
  const best=profile.sourceAttacks.reduce((best,attack)=>attack.ob>best.ob?attack:best);
  return profile.sourceAttacks.map(source=>({...assigned(source.slot),key:`slot-${source.slot}`,slot:source.slot,
   ob:source.ob,rawKind:source.kind,type:'Wp',size:'M',chance:source.slot===best.slot?100:0,optional:source.slot!==best.slot}));
 }
 return profile.attacks.map((attack,index)=>!attack||attack.both?attack:{...attack,
  ...(attack.type==='Wp'?{...assigned(index+1),rawKind:'me'}:{name:attackName(attack),attackTable:attack.attackTable||attackTypes[attack.type][1]})});
}
