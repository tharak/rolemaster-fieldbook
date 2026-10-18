// Guild campaign state and rules, independent of UI, storage and rendering.
import {generateWorld,seededRandom,findRoute} from './adventure-rules.js';
import {generateEncounter} from './encounter-generation-rules.js';
import {profileAssignments,assignedProfileAttacks,armorDescription} from './guildmaster-assignments.js';
import {arenaWeaponStyles} from './coliseum-contenders.js';
import {simulateGuildBattle} from './guild-battle.js';
import {hitRecovery} from './healing-rules.js';
export const guildItems=[
 {key:'sword',name:'Broadsword',slot:'weapon',category:'Weapon • 1-H Edged',kind:'me'},
 {key:'mace',name:'Mace',slot:'weapon',category:'Weapon • 1-H Concussion',kind:'me'},
 {key:'staff',name:'Quarterstaff',slot:'weapon',category:'Weapon • 2-Handed',kind:'me',twoHanded:true},
 {key:'bow',name:'Short Bow',slot:'weapon',category:'Weapon • Missile',kind:'ms',twoHanded:true},
 {key:'shield',name:'Shield',slot:'shield',db:25},
 {key:'helmet',name:'Helmet',slot:'helmet'},
 {key:'leather',name:'Leather armor (AT 6)',slot:'armor',at:6},
 {key:'chain',name:'Chain armor (AT 13)',slot:'armor',at:13},
 {key:'plate',name:'Plate armor (AT 17)',slot:'armor',at:17}
];
const clone=value=>structuredClone(value);
export const atBase=(state,id)=>!state.expedition?.party.includes(id)&&!state.management?.journeys?.[id];
export const availableMember=m=>!m.dead&&m.damage<m.hits&&!m.effects.some(e=>e.kind==='bleed');
export function newGuild(catalog,{tableOnly=false}={}){
 let state={version:1,...(tableOnly?{tableOnly:true}:{}),members:[],inventory:[],gold:0,hours:0,expedition:null,history:[],nextId:1};
 for(const profession of ['Fighter','Ranger','Cleric','Magician'])state=recruitMember(state,catalog.find(c=>c.profession===profession&&c.level===1));
 if(!tableOnly)for(const key of ['mace','staff','bow','helmet','leather','chain'])state.inventory.push({...guildItems.find(i=>i.key===key),id:`item-${state.nextId++}`,bonus:0});
 return state;
}
export function recruitMember(state,template){
 if(!template||template.sourceKind!=='master')throw new Error('Choose a T-5.8 member template.');
 if(state.members.length>=24)throw new Error('The guild has room for 24 recruits.');
 const next=clone(state),id=`member-${next.nextId++}`,member={...clone(template),id,templateId:template.id,name:`${template.profession} ${next.members.filter(m=>m.profession===template.profession).length+1}`,damage:0,pp:template.ppMax,xp:0,dead:false,effects:[],equipped:{},restHours:0};
 if(next.tableOnly){
  const names=[...next.members,...(next.management?.reports||[]).flatMap(turn=>turn.results)].map(item=>item.name);
  const prefix=template.profession+' ',numbers=names.filter(name=>name.startsWith(prefix)&&/^\d+$/.test(name.slice(prefix.length))).map(name=>Number(name.slice(prefix.length)));
  member.name=prefix+(Math.max(0,...numbers)+1);
  member.tableOnly=true;member.assignments=profileAssignments(member,`${next.management?.seed||'guildmaster'}:${id}:${member.templateId}`);member.spellLists=[];member.selectedSpells=[];next.members.push(member);return next;}
 const first=template.attacks[0];
 for(const key of [first.rawKind==='ms'?'bow':'sword',...(template.suggestedEquipment.includes('shield')?['shield']:[])]){
  const item={...guildItems.find(i=>i.key===key),id:`item-${next.nextId++}`,bonus:0};next.inventory.push(item);member.equipped[item.slot]=item.id;
 }
 next.members.push(member);return next;
}
export function equipMember(state,memberId,itemId,slot){
 if(state.tableOnly)throw new Error('Printed profiles use their fixed armor and attack bonuses.');
 const next=clone(state),member=next.members.find(m=>m.id===memberId);
 if(!member||!atBase(next,memberId)||member.dead)throw new Error('Only living members at base can change equipment.');
 if(!['weapon','shield','helmet','armor'].includes(slot))throw new Error('Invalid equipment slot.');
 if(!itemId){if(slot==='weapon')throw new Error('Equip a weapon before removing this one.');delete member.equipped[slot];return next;}
 const item=next.inventory.find(i=>i.id===itemId);
 if(!item||item.slot!==slot)throw new Error('That item does not fit this slot.');
 if(slot==='weapon'&&!member.sourceAttacks.some(a=>a.kind===item.kind))throw new Error('This character has no printed OB for that weapon.');
 const owner=next.members.find(m=>Object.values(m.equipped).includes(itemId));
 if(owner&&owner.id!==memberId)throw new Error('Unequip this item from its current owner first.');
 member.equipped[slot]=itemId;return next;
}
export function printedContender(member,seed=member.id){
 const assignments=profileAssignments(member,seed),attacks=assignedProfileAttacks(member,assignments);
 return {...clone(member),assignments,attacks,armorName:armorDescription(member),tableOnly:true,spellLists:[],selectedSpells:[],equipment:{shield:member.suggestedEquipment?.includes('shield')||false},pp:member.pp??member.ppMax??0};
}
export function guildContender(state,member){
 if(state.tableOnly)return printedContender(member);
 const item=slot=>state.inventory.find(i=>i.id===member.equipped[slot]);
 const weapon=item('weapon'),armor=item('armor'),shield=item('shield');
 if(!weapon)throw new Error(`${member.name} needs a weapon.`);
 const style=arenaWeaponStyles[weapon.category],ob=member.sourceAttacks.find(a=>a.kind===weapon.kind)?.ob;
 if(ob===undefined)throw new Error(`${member.name} cannot use ${weapon.name}.`);
 const printedShield=member.suggestedEquipment.includes('shield')?25:0;
 return {...clone(member),armor_type:armor?.at??member.armor_type,
  db:member.db-printedShield+(shield&&!weapon.twoHanded?shield.db+(shield.bonus||0):0),
  equipment:{shield:!!shield&&!weapon.twoHanded,helmet:!!item('helmet')},
  attacks:[{key:weapon.id,name:weapon.name,ob:ob+(weapon.bonus||0)-Math.max(0,(armor?.at??member.armor_type)-member.armor_type)*5,type:'Wp',size:'M',rawKind:weapon.kind,attackTable:style.table,criticalTable:style.critical,chance:100}]};
}
export function restGuild(state,hours=24){
 if(!Number.isInteger(hours)||hours<1||hours>168)throw new Error('Rest for 1–168 hours.');
 const next=clone(state);next.hours+=hours;
 for(const member of next.members.filter(m=>atBase(next,m.id)&&!m.dead)){
  member.damage=Math.max(0,member.damage-hitRecovery('rest',hours,0));
  const before=member.restHours;member.restHours+=hours;
  const nights=Math.floor(member.restHours/8)-Math.floor(before/8);
  if(nights)member.pp=member.ppMax;
  const days=Math.floor(member.restHours/24)-Math.floor(before/24);
  // Guild infirmary campaign rule: treatment stops bleeding at base, temporary
  // conditions clear with rest, lasting penalties recover five points per day.
  member.effects=member.effects.flatMap(e=>{
   if(e.kind==='bleed')return [];
   if(e.roundsLeft!==null)return [];
   if(e.kind==='penalty')return e.amount>days*5?[{...e,amount:e.amount-days*5}]:[];
   return [];
  });
 }
 return next;
}
export function departGuild(state,{party,level,seed,id}){
 if(state.expedition)throw new Error('Return the current party before sending another.');
 if(!Number.isInteger(level)||level<1||level>20)throw new Error('Adventure level must be 1–20.');
 if(!Array.isArray(party)||!party.length||party.length>6||new Set(party).size!==party.length||party.some(id=>!state.members.some(m=>m.id===id&&availableMember(m)&&atBase(state,id))))throw new Error('Choose one to six ready guild members.');
 if(!id||!String(seed).trim())throw new Error('An expedition needs an ID and seed.');
 const next=clone(state),world=generateWorld(seed);
 next.expedition={id,seed,level,party:[...party],stage:0,hours:0,current:world.start,goal:world.goal,explored:[world.start],visitedEdges:[],route:findRoute(world,world.start,world.goal),reports:[],gold:0,items:[],xp:{}};
 return next;
}
function compactReports(state){
 let budget=400;
 for(const exp of [state.expedition,...state.history].filter(Boolean))for(const report of exp.reports){
  if(report.rounds.length<=budget)budget-=report.rounds.length;
  else {report.archivedRounds=report.rounds.length;report.rounds=[];}
 }
 return state;
}
export function returnGuild(state,reason='The party returned safely to the guild.'){
 if(!state.expedition)throw new Error('No party is away.');
 const next=clone(state),expedition=next.expedition;
 next.gold+=expedition.gold;next.inventory.push(...expedition.items);
 next.history.unshift({...expedition,conclusion:reason});next.history=next.history.slice(0,20);next.expedition=null;return compactReports(next);
}
export function encounterLoot(level,random,encounterId){
 const gold=1+Math.floor(random()*Math.max(1,level*2));
 const items=[];
 if(random()<.35){const base=guildItems[Math.floor(random()*guildItems.length)],bonus=base.slot==='weapon'&&random()<.2?5:0;items.push({...base,id:`loot-${encounterId}`,bonus,name:base.name+(bonus?` +${bonus}`:'')});}
 return {gold,items};
}
export function continueGuild(state,catalog,tables){
 if(!state.expedition)throw new Error('Send a party first.');
 let next=clone(state);const exp=next.expedition;
 if(state.gameVersion!==2&&exp.stage>=50)throw new Error('This expedition has reached 50 stages. Return to base.');
 const members=next.members.filter(m=>exp.party.includes(m.id));
 if(!members.some(state.gameVersion===2?m=>!m.dead&&m.damage<m.hits:availableMember))return returnGuild(next,'No one remains fit to continue; the expedition ends.');
 const random=seededRandom(`${exp.seed}:${exp.id}:${exp.stage}`),d100=()=>Math.floor(random()*100)+1;
 exp.stage++;exp.hours+=4;next.hours+=4;
 const world=generateWorld(exp.seed),previous=exp.current;
 if(!exp.route.length){const choices=world.nodes.filter(n=>n.id!==exp.current);exp.goal=choices[Math.floor(random()*choices.length)].id;exp.route=findRoute(world,exp.current,exp.goal);}
 exp.current=exp.route.shift();exp.explored=[...new Set([...exp.explored,exp.current])];exp.visitedEdges.push([previous,exp.current].sort().join(':'));
 const half=members.filter(m=>m.profession==='Ranger').length;
 const encounter=generateEncounter({density:'Moderate',terrain:'Open',full:members.length-half,half,hostile:true,night:(exp.hours%24)>=12},d100);
 const report={id:`${exp.id}:${exp.stage}`,stage:exp.stage,location:world.nodes.find(n=>n.id===exp.current).name,encounter,rounds:[],xp:{},gold:0,items:[],conclusion:''};
 if(encounter.type==='none'||encounter.code==='s'||encounter.code==='e'){
  report.conclusion=encounter.type==='none'?'The road was quiet.':encounter.code==='s'?'The party spotted travelers and passed without conflict.':'A peaceful meeting; the party exchanged news and continued.';
 }else{
  // T-5.1 leaves composition and strength to the GM; choose the nearest printed level.
  const distance=Math.min(...catalog.map(c=>Math.abs(c.level-exp.level))),pool=catalog.filter(c=>Math.abs(c.level-exp.level)===distance);
  const count=Math.max(1,Math.min(6,members.filter(availableMember).length-1+Math.floor(random()*3)));
  const enemies=Array.from({length:count},(_,i)=>{
   const template=pool[Math.floor(random()*pool.length)];
   if(next.tableOnly)return {...printedContender(template,`${exp.seed}:${report.id}:enemy:${i}`),id:`enemy-${i}`,name:`${template.name} ${i+1}`};
   const stateWithEnemy=recruitMember({...next,members:[]},template),member=stateWithEnemy.members[0];
   return {...guildContender(stateWithEnemy,member),id:`enemy-${i}`,name:`${template.profession} ${i+1} (L${template.level})`};
  });
  const battle=simulateGuildBattle(members.filter(m=>!m.dead&&m.damage<m.hits).map(m=>guildContender(next,m)),enemies,tables,random);
  report.party=battle.units.filter(u=>u.team===0).map(u=>({name:u.creature.name,hp:Math.max(0,u.creature.hits-u.hits),maxHp:u.creature.hits,pp:u.pp,dead:!!u.dead||u.deathRound!==undefined}));
  report.rounds=battle.log.map(r=>({round:r.round,events:r.events.map(({kind,text})=>({kind,text}))}));report.enemies=enemies.map(e=>({name:e.name,level:e.level,...(next.tableOnly?{armorName:e.armorName,armorType:e.armor_type,assignments:e.assignments,attacks:e.attacks.filter(a=>a&&!a.both).map(a=>({name:a.name,ob:a.ob}))}:{})}));report.winner=battle.winner;report.xp=battle.xp;
  report.conclusion=battle.winner===0?'Victory.':battle.winner===1?'Defeat. The expedition ends; survivors are recovered to base.':'Neither side prevailed. The party withdraws to base.';
  for(const unit of battle.units.filter(u=>u.team===0)){
   const member=next.members.find(m=>m.id===unit.id);member.damage=Math.min(member.hits,unit.hits);member.pp=unit.pp;member.dead=!!unit.dead||unit.deathRound!==undefined;
   member.effects=unit.effects.map(e=>({...e,starts:1}));member.xp+=battle.xp[unit.id]||0;member.restHours=0;exp.xp[unit.id]=(exp.xp[unit.id]||0)+(battle.xp[unit.id]||0);
   if(member.dead)report.conclusion+=` ${member.name} died.`;
  }
  if(battle.winner===0){const loot=encounterLoot(exp.level,random,report.id);report.gold=loot.gold;report.items=next.tableOnly?[]:loot.items;exp.gold+=loot.gold;exp.items.push(...report.items);}
 }
 exp.reports.unshift(report);
 if(report.winner===1||(report.winner===null&&state.gameVersion!==2)||!members.some(m=>!m.dead&&m.damage<m.hits))next=returnGuild(next,report.conclusion);
 return compactReports(next);
}
export function validGuild(state){
 return validManagement(state)&&state?.version===1&&Array.isArray(state.members)&&state.members.length<=24&&state.members.every(m=>typeof m.id==='string'&&m.sourceKind==='master'&&Number.isFinite(m.damage)&&m.damage>=0&&Number.isFinite(m.pp)&&m.pp>=0&&Number.isFinite(m.xp)&&Array.isArray(m.effects)&&Array.isArray(m.spellLists)&&m.equipped&&Array.isArray(m.attacks)&&Array.isArray(m.sourceAttacks)&&(!Object.hasOwn(m,'selectedSpells')||Array.isArray(m.selectedSpells)&&m.selectedSpells.every(s=>typeof s==='string')))&&new Set(state.members.map(m=>m.id)).size===state.members.length&&Array.isArray(state.inventory)&&Array.isArray(state.history)&&Number.isSafeInteger(state.nextId)&&state.nextId>0&&Number.isFinite(state.gold)&&Number.isFinite(state.hours)&&(!state.expedition||Array.isArray(state.expedition.party)&&state.expedition.party.length>0&&state.expedition.party.every(id=>state.members.some(m=>m.id===id))&&Array.isArray(state.expedition.reports)&&Array.isArray(state.expedition.items)&&Number.isInteger(state.expedition.stage)&&typeof state.expedition.seed==='string');
}

function validManagement(state){
 const m=state?.management;if(m===undefined)return true;
 if(!m||m.version!==1||!Number.isSafeInteger(m.turn)||m.turn<0||typeof m.seed!=='string'||!m.orders||!m.journeys||!Array.isArray(m.reports)||!Array.isArray(state.members))return false;
 const ids=new Set(state.members.map(member=>member.id));
 if(!Object.entries(m.orders).every(([id,o])=>ids.has(id)&&o&&['adventure','return','rest','work'].includes(o.action)&&(!o.nextAction||['rest','work'].includes(o.nextAction))&&Number.isInteger(o.level)&&o.level>=1&&o.level<=20))return false;
 if(!Object.entries(m.journeys).every(([id,j])=>ids.has(id)&&j&&j.party?.length===1&&j.party[0]===id&&!state.expedition?.party.includes(id)&&validGuild({...state,management:undefined,expedition:j})&&Array.isArray(j.items)&&Number.isFinite(j.gold)))return false;
 return m.reports.every(t=>t&&Number.isInteger(t.number)&&Number.isFinite(t.hour)&&Array.isArray(t.results)&&t.results.every(r=>r&&typeof r.memberId==='string'&&r.memberId.length>0&&typeof r.summary==='string'&&(!r.encounter||Array.isArray(r.encounter.rounds))));
}
