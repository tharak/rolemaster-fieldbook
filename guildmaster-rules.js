// Per-member orders and one shared clock tick. No DOM, storage, or random globals.
import {spellKey} from './guild-spells.js';
import {availableMember,departGuild,continueGuild,returnGuild,restGuild} from './guild-rules.js';
export const MEMBER_ACTIONS=['adventure','rest','work'];
export const WORK_GOLD_PER_TURN=1;
export const GUILD_TURN_HOURS=4;
export function managementState(state){return state.management||{version:1,turn:0,seed:'guildmaster-roads',orders:{},journeys:{},reports:[]};}
export function memberOrder(state,id){return managementState(state).orders[id]||{action:managementState(state).journeys[id]?'adventure':'rest',level:state.members.find(m=>m.id===id)?.level||1};}
export function prepareGuildMaster(state,catalog=[]){
 const next=structuredClone(state);next.mode='guildmaster';next.tableOnly=true;next.expedition=null;next.history=[];
 next.management=structuredClone(managementState(next));
 for(const member of next.members){
  const template=catalog.find(entry=>entry.id===member.templateId);
  if(template)for(const key of ['hits','armor_type','db','level','ppMax','spellRanks','sourceAttacks','attacks','suggestedEquipment','source'])member[key]=structuredClone(template[key]);
  member.spellLists=[];member.selectedSpells=[];member.tableOnly=true;
  const order=memberOrder(next,member.id);next.management.orders[member.id]={...order,level:member.level};
  if(order.action==='return')next.management.orders[member.id].nextAction=order.nextAction||'rest';
  if(next.management.journeys[member.id])next.management.journeys[member.id].level=member.level;
 }
 return next;
}
export function setMemberOrder(state,id,{action}){
 const member=state.members.find(m=>m.id===id),management=managementState(state);
 if(!member||member.dead)throw new Error('Choose a living guild member.');
 if(memberOrder(state,id).action==='return')throw new Error('This member is returning. Change their action after arrival.');
 if(!MEMBER_ACTIONS.includes(action))throw new Error('Choose Adventure, Rest, or Work.');
 if(action==='adventure'&&!management.journeys[id]&&!availableMember(member))throw new Error('This member needs to rest before adventuring.');
 if(action==='work'&&!management.journeys[id]&&!availableMember(member))throw new Error('This member needs to recover before working.');
 const next=structuredClone(state);next.management=structuredClone(management);
 next.management.orders[id]=management.journeys[id]&&action!=='adventure'?{action:'return',nextAction:action,level:member.level}:{action,level:member.level};
 return next;
}
export function availableMemberSpells(member,lists){
 return member.spellLists.flatMap(known=>{const list=lists.find(l=>l.id===known.id);return (list?.spells||[]).filter(s=>s.level<=known.ranks&&s.level<=member.level).map(s=>({...s,list:known.id,listName:list.name,key:spellKey({...s,list:known.id})}));});
}
export function setMemberSpells(state,id,keys,lists){
 if(state.tableOnly)throw new Error('Printed profiles do not define selectable spells.');
 const member=state.members.find(m=>m.id===id);
 if(!member||member.dead||managementState(state).journeys[id])throw new Error('Spell equipment can only change while this member is at base.');
 const available=new Set(availableMemberSpells(member,lists).map(s=>s.key));
 if(!Array.isArray(keys)||new Set(keys).size!==keys.length||keys.some(key=>!available.has(key)))throw new Error('Choose spells from this member’s learned lists and levels.');
 const next=structuredClone(state);next.members.find(m=>m.id===id).selectedSpells=[...keys];return next;
}
function trimReports(management){
 let remaining=400;
 for(const turn of management.reports)for(const result of turn.results){
  if(!result.encounter)continue;
  const report=result.encounter;
  if(report.rounds.length<=remaining)remaining-=report.rounds.length;
  else {report.archivedRounds=report.rounds.length;report.rounds=[];}
 }
 management.reports=management.reports.slice(0,30);
 // Latest encounter detail lives in the turn reports; journeys retain summaries.
 for(const journey of Object.values(management.journeys))journey.reports=journey.reports.slice(0,1).map(r=>({...r,archivedRounds:r.rounds.length||r.archivedRounds,rounds:[]}));
}
export function advanceGuildMaster(state,catalog,tables){
 const next=structuredClone(state);next.management=structuredClone(managementState(state));
 const management=next.management,turn={number:management.turn+1,hour:state.hours+GUILD_TURN_HOURS,results:[]};
 // Snapshot the orders before resolving anyone. Every member gets exactly one action.
 const orders=Object.fromEntries(next.members.map(m=>[m.id,memberOrder(next,m.id)]));
 for(const original of state.members){
  const id=original.id,member=next.members.find(m=>m.id===id),order=orders[id],journey=management.journeys[id];
  const result={memberId:id,name:member.name,action:order.action,hpBefore:Math.max(0,member.hits-member.damage),ppBefore:member.pp,xp:0,gold:0,items:[]};
  if(member.dead){result.summary='Dead — no action taken.';result.action='none';}
  else if(order.action==='rest'&&!journey){
   const rested=restGuild({...next,management:undefined,expedition:null,members:[member]},GUILD_TURN_HOURS).members[0];
   next.members=next.members.map(m=>m.id===id?rested:m);result.summary=`Rested at base for ${GUILD_TURN_HOURS} hours. Recovered ${member.damage-rested.damage} HP and ${rested.pp-member.pp} PP.`;
  }else if(order.action==='work'&&!journey){
   if(availableMember(member)){next.gold+=WORK_GOLD_PER_TURN;result.gold=WORK_GOLD_PER_TURN;member.restHours=0;result.summary=`Worked at base for ${GUILD_TURN_HOURS} hours and earned ${WORK_GOLD_PER_TURN} gold.`;}
   else {management.orders[id]={action:'rest',level:member.level};result.summary='Too injured to work. Rest is queued for the next turn.';}
  }else if(order.action==='return'&&journey){
   const returned=returnGuild({...next,management:undefined,expedition:journey,history:[],gold:0});
   next.inventory=returned.inventory;next.gold+=returned.gold;result.gold=journey.gold;result.items=journey.items;
   result.summary=`Returned to base with ${journey.gold} gold and ${journey.items.length} items. Ready to rest or take a new assignment.`;
   delete management.journeys[id];management.orders[id]={action:order.nextAction||'rest',level:member.level};
  }else if(order.action==='adventure'){
   member.restHours=0;
   if(!journey&&!availableMember(member)){
    result.summary='Unable to depart because of wounds. Order changed to Rest for the next turn.';management.orders[id]={action:'rest',level:member.level};
   }else if(journey?.stage>=50){
    result.summary='Adventure limit reached. Come back is queued for the next turn.';management.orders[id]={action:'return',nextAction:'rest',level:member.level};
   }else{
    let expedition=journey;
    if(!expedition)expedition=departGuild({...next,management:undefined,expedition:null},{party:[id],level:member.level,seed:management.seed+':'+id,id:`guildmaster:${id}:${turn.number}`}).expedition;
    const simulated=continueGuild({...next,management:undefined,expedition,history:[],gold:0},catalog,tables);
    next.members=simulated.members;next.inventory=simulated.inventory;next.gold+=simulated.gold;
    const finished=simulated.expedition||simulated.history[0],encounter=finished.reports[0];
    // continueGuild can return a wounded member before beginning another stage.
    if(finished.stage>expedition.stage){
     result.encounter=structuredClone(encounter);result.summary=encounter.conclusion;result.xp=encounter.xp[id]||0;result.gold=encounter.gold;result.items=encounter.items;
    }else result.summary=finished.conclusion||'Returned to base to recover.';
    if(simulated.expedition)management.journeys[id]=simulated.expedition;
    else {delete management.journeys[id];management.orders[id]={action:'rest',level:member.level};result.summary+=' Returned to base; Rest is the next order.';}
   }
  }else throw new Error('An order is incompatible with this member’s location. Review their order before advancing.');
  const after=next.members.find(m=>m.id===id);result.hpAfter=Math.max(0,after.hits-after.damage);result.ppAfter=after.pp;result.dead=after.dead;result.away=!!management.journeys[id];
  turn.results.push(result);
 }
 management.turn=turn.number;management.reports.unshift(turn);next.hours=turn.hour;trimReports(management);return next;
}
