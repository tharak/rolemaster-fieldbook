import {recruitMember,validGuild,availableMember} from './guild-rules.js';
import {prepareGuildMaster,advanceGuildMaster,setMemberOrder,dismissGuildMember,memberOrder} from './guildmaster-rules.js?v=20261018-5';
import {profileAssignments} from './guildmaster-assignments.js';
export const GUILD_CAPACITY=6,RECRUIT_PRICE=12,MEAL_PRICE=1;
const clone=state=>structuredClone(state),clamp=value=>Math.max(0,Math.min(100,value));
export const atGuild=(state,id)=>!state.management.journeys[id];
export function readiness(member){
 if(!availableMember(member)||member.damage>member.hits/2)return 'Needs healing';
 if(member.care.food<20)return 'Hungry';
 if(member.care.energy<25)return 'Tired';
 if(member.care.morale<15)return 'Low spirits';
 return '';
}
export function newGame(seed='wayfarers'){
 return {...prepareGuildMaster({version:1,members:[],inventory:[],gold:20,hours:0,expedition:null,history:[],nextId:1}),gameVersion:2,name:'Wayfarers’ Guild',founderClaimed:false,completedTrips:0,management:{version:1,turn:0,seed,orders:{},journeys:{},reports:[]}};
}
export function validGame(state){
 return !!state?.management&&validGuild(state)&&state.gameVersion===2&&state.mode==='guildmaster'&&state.tableOnly===true&&state.expedition===null&&state.inventory.length===0&&state.members.length<=GUILD_CAPACITY&&typeof state.name==='string'&&state.name.trim().length>0&&state.name.length<=40&&typeof state.founderClaimed==='boolean'&&Number.isSafeInteger(state.completedTrips)&&state.completedTrips>=0&&Number.isSafeInteger(state.gold)&&state.gold>=0&&state.members.every(member=>typeof member.name==='string'&&member.name.length<=40&&member.name.trim()&&member.care&&['food','energy','morale'].every(key=>Number.isInteger(member.care[key])&&member.care[key]>=0&&member.care[key]<=100));
}
export function hireMember(state,template,name=''){
 if(state.members.length>=GUILD_CAPACITY)throw new Error('The guild is full. Dismiss a member before recruiting.');
 if(!template||template.sourceKind!=='master'||template.level!==1)throw new Error('Choose a level-one recruit.');
 const cost=state.founderClaimed?RECRUIT_PRICE:0;if(state.gold<cost)throw new Error('Not enough gold to recruit.');
 if(name.trim().length>40)throw new Error('Use a name of 40 characters or fewer.');
 const next=recruitMember(state,template),member=next.members.at(-1);if(name.trim())member.name=name.trim();
 member.care={food:80,energy:100,morale:80};next.gold-=cost;next.founderClaimed=true;next.management.orders[member.id]={action:'rest',level:member.level};return next;
}
export function careForMember(state,id){
 const next=clone(state),member=next.members.find(item=>item.id===id);
 if(!member||!atGuild(next,id))throw new Error('Meals are available at the guild. Recall this member first.');
 if(member.care.food===100&&member.care.morale===100)throw new Error('This member is already fed and happy.');
 if(next.gold<MEAL_PRICE)throw new Error('Not enough gold. Rest includes free meals and recovery.');
 next.gold-=MEAL_PRICE;member.care.food=clamp(member.care.food+40);member.care.morale=clamp(member.care.morale+5);return next;
}
export function assignActivity(state,id,action){
 if(!['rest','adventure'].includes(action))throw new Error('Choose Rest or Adventure.');
 const member=state.members.find(item=>item.id===id);if(!member)throw new Error('Choose a guild member.');
 if(atGuild(state,id)&&action!=='rest'&&readiness(member))throw new Error(`${readiness(member)}. Give this member a meal or time to rest first.`);
 return setMemberOrder(state,id,{action});
}
export function dismissMember(state,id){
 if(state.members.length<=1)throw new Error('Keep at least one member. Recruit a replacement first.');
 return dismissGuildMember(state,id);
}
export function renameGuild(state,name){
 if(!name.trim()||name.trim().length>40)throw new Error('Use a guild name between 1 and 40 characters.');
 return {...clone(state),name:name.trim()};
}
export function renameMember(state,id,name){
 if(!name.trim()||name.trim().length>40)throw new Error('Use a member name between 1 and 40 characters.');
 const next=clone(state),member=next.members.find(item=>item.id===id);if(!member)throw new Error('This member has left the guild.');member.name=name.trim();return next;
}
export function promotion(member,catalog){
 const index=[1,5,10,15,20].indexOf(member.level),level=[5,10,15,20][index];
 if(!level)return null;
 return {level,xp:[100,300,600,1000][index],template:catalog.find(item=>item.profession===member.profession&&item.level===level)};
}
export function levelMembers(state,catalog){
 const next=clone(state);
 for(const member of next.members){
  let upgrade=promotion(member,catalog);
  while(upgrade?.template&&member.xp>=upgrade.xp){
   const currentHP=member.hits-member.damage;
   const progress={id:member.id,name:member.name,damage:member.damage,xp:member.xp,care:member.care,effects:member.effects,restHours:member.restHours,assignments:member.assignments,pp:member.pp};
   Object.assign(member,clone(upgrade.template),progress,{templateId:upgrade.template.id,dead:false,tableOnly:true,spellLists:[],selectedSpells:[],equipped:{}});
   if(progress.damage>0)member.damage=Math.max(0,member.hits-currentHP);
   member.pp=Math.min(member.pp,member.ppMax);member.assignments=profileAssignments(member);
   if(next.management.orders[member.id])next.management.orders[member.id].level=member.level;
   upgrade=promotion(member,catalog);
  }
 }
 return next;
}
export function advanceGame(state,opponents,tables){
 if(!state.members.length)throw new Error('Recruit your first member to begin.');
 const prepared=levelMembers(state,opponents),warnings=new Map();
 for(const member of prepared.members){
  const savedOrder=prepared.management.orders[member.id];
  if(savedOrder?.action==='work')savedOrder.action='rest';
  if(savedOrder?.nextAction==='work')savedOrder.nextAction='rest';
  const order=memberOrder(prepared,member.id),away=!atGuild(prepared,member.id),reason=readiness(member);
  if(!away&&reason&&order.action!=='return'&&order.action!=='rest'){
   prepared.management.orders[member.id]={action:away?'return':'rest',...(away?{nextAction:'rest'}:{}),level:member.level};
   warnings.set(member.id,`${reason}; ${away?'returning for care':'resting instead'}.`);
  }
 }
 const next=advanceGuildMaster(prepared,opponents,tables),results=next.management.reports[0].results;
 for(const member of next.members){
  const original=state.members.find(item=>item.id===member.id),result=results.find(item=>item.memberId===member.id),care=member.care;
  if(result.action==='rest'){
   care.food=clamp(care.food+12);care.energy=clamp(care.energy+25);care.morale=clamp(care.morale+6);
   member.damage=Math.max(0,original.damage-Math.max(4,Math.ceil(member.hits*.2)));
   result.summary=`Rested at the guild: free meals, renewed energy, and ${original.damage-member.damage} HP recovered.`;
  }else if(result.action==='return'){
   care.food=clamp(care.food-8);care.energy=clamp(care.energy-6);care.morale=clamp(care.morale+4);next.completedTrips++;
   result.summary=`Returned to the guild with ${result.gold} gold. Ready for a meal and rest.`;
  }else if(result.action==='adventure'){
   care.food=clamp(care.food-12);care.energy=clamp(care.energy-18);care.morale=clamp(care.morale-3+(result.encounter?.winner===0?8:0));
   if(result.encounter){
    member.xp+=5;result.xp+=5;result.gold+=1;result.encounter.gold+=1;
    result.encounter.xp[member.id]=(result.encounter.xp[member.id]||0)+5;
    const journey=next.management.journeys[member.id];
    if(journey){journey.gold+=1;journey.xp[member.id]=(journey.xp[member.id]||0)+5;}else {next.gold+=1;next.completedTrips++;}
    result.summary+=' Exploration earned 5 XP and 1 gold.';
   }
  }
  if(member.dead||member.damage>=member.hits){
   member.dead=false;member.damage=member.hits-1;member.effects=[];
   result.summary='Defeated, but rescued and brought home with 1 HP. Rest will help them recover.';
   if(result.encounter){result.encounter.conclusion=result.summary;for(const unit of result.encounter.party||[])if(unit.name===member.name){unit.dead=false;unit.hp=1;}}
   delete next.management.journeys[member.id];next.management.orders[member.id]={action:'rest',level:member.level};
  }
  const journey=next.management.journeys[member.id];
  if(warnings.has(member.id))result.summary=warnings.get(member.id)+' '+result.summary;
  result.hpAfter=member.hits-member.damage;result.dead=false;result.away=!!journey;
  result.careBefore=clone(original.care);result.careAfter=clone(care);
 }
 const leveled=levelMembers(next,opponents);
 for(const result of leveled.management.reports[0].results){
  const member=leveled.members.find(item=>item.id===result.memberId),previous=state.members.find(item=>item.id===result.memberId);
  result.hpAfter=member.hits-member.damage;
  if(member.level>previous.level)result.summary+=` Reached level ${member.level}!`;
 }
 return leveled;
}

// Keep the previous named import valid while cached beta clients refresh.
// Leveling remains automatic and never charges gold.
export function promoteMember(state,_id,catalog){
 return levelMembers(state,catalog);
}
