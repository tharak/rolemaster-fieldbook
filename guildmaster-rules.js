// Per-member orders and one shared clock tick. No DOM, storage, or random globals.
import {availableMember,departGuild,continueGuild,returnGuild,restGuild} from './guild-rules.js';
export const MEMBER_ACTIONS=['adventure','return','rest'];
export const GUILD_TURN_HOURS=4;
export function managementState(state){return state.management||{version:1,turn:0,seed:'guildmaster-roads',orders:{},journeys:{},reports:[]};}
export function memberOrder(state,id){return managementState(state).orders[id]||{action:managementState(state).journeys[id]?'adventure':'rest',level:state.members.find(m=>m.id===id)?.level||1};}
export function setMemberOrder(state,id,{action,level}){
 const member=state.members.find(m=>m.id===id),management=managementState(state);
 if(!member||member.dead)throw new Error('Choose a living guild member.');
 if(state.expedition?.party.includes(id))throw new Error('This member is in the Adventures party. Return that party first.');
 if(!MEMBER_ACTIONS.includes(action))throw new Error('Choose Adventure, Come back, or Rest.');
 if(!Number.isInteger(level)||level<1||level>20)throw new Error('Adventure level must be 1–20.');
 if(action==='adventure'&&!management.journeys[id]&&!availableMember(member))throw new Error('This member needs to rest before adventuring.');
 if(action==='rest'&&management.journeys[id])throw new Error('Order this member to come back before resting.');
 if(action==='return'&&!management.journeys[id])throw new Error('This member is already at base.');
 if(management.journeys[id]&&level!==management.journeys[id].level)throw new Error('Return to base before changing adventure level.');
 const next=structuredClone(state);next.management=structuredClone(management);next.management.orders[id]={action,level};return next;
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
  else if(state.expedition?.party.includes(id)){result.summary='Away with the Adventures party; manage this member on Adventures.';result.action='external';}
  else if(order.action==='rest'&&!journey){
   const rested=restGuild({...next,management:undefined,expedition:null,members:[member]},GUILD_TURN_HOURS).members[0];
   next.members=next.members.map(m=>m.id===id?rested:m);result.summary=`Rested at base for ${GUILD_TURN_HOURS} hours. Recovered ${member.damage-rested.damage} HP and ${rested.pp-member.pp} PP.`;
  }else if(order.action==='return'&&journey){
   const returned=returnGuild({...next,management:undefined,expedition:journey,history:[],gold:0});
   next.inventory=returned.inventory;next.gold+=returned.gold;result.gold=journey.gold;result.items=journey.items;
   result.summary=`Returned to base with ${journey.gold} gold and ${journey.items.length} items. Ready to rest or take a new assignment.`;
   delete management.journeys[id];management.orders[id]={action:'rest',level:order.level};
  }else if(order.action==='adventure'){
   if(!journey&&!availableMember(member)){
    result.summary='Unable to depart because of wounds. Order changed to Rest for the next turn.';management.orders[id]={action:'rest',level:order.level};
   }else if(journey?.stage>=50){
    result.summary='Adventure limit reached. Come back is queued for the next turn.';management.orders[id]={action:'return',level:order.level};
   }else{
    let expedition=journey;
    if(!expedition)expedition=departGuild({...next,management:undefined,expedition:null},{party:[id],level:order.level,seed:management.seed+':'+id,id:`guildmaster:${id}:${turn.number}`}).expedition;
    const simulated=continueGuild({...next,management:undefined,expedition,history:[],gold:0},catalog,tables);
    next.members=simulated.members;next.inventory=simulated.inventory;next.gold+=simulated.gold;
    const finished=simulated.expedition||simulated.history[0],encounter=finished.reports[0];
    // continueGuild can return a wounded member before beginning another stage.
    if(finished.stage>expedition.stage){
     result.encounter=structuredClone(encounter);result.summary=encounter.conclusion;result.xp=encounter.xp[id]||0;result.gold=encounter.gold;result.items=encounter.items;
    }else result.summary=finished.conclusion||'Returned to base to recover.';
    if(simulated.expedition)management.journeys[id]=simulated.expedition;
    else {delete management.journeys[id];management.orders[id]={action:'rest',level:order.level};result.summary+=' Returned to base; Rest is the next order.';}
   }
  }else throw new Error('An order is incompatible with this member’s location. Review their order before advancing.');
  const after=next.members.find(m=>m.id===id);result.hpAfter=Math.max(0,after.hits-after.damage);result.ppAfter=after.pp;result.dead=after.dead;result.away=!!management.journeys[id];
  turn.results.push(result);
 }
 management.turn=turn.number;management.reports.unshift(turn);next.hours=turn.hour;trimReports(management);return next;
}
