import {loadGuildMasterData,loadGuildCombat} from './guild-data.js';
import {readGuild,writeGuild,guildStorageKey} from './guildmaster-store.js';
import {newGuild,recruitMember,availableMember} from './guild-rules.js';
import {managementState,memberOrder,setMemberOrder,advanceGuildMaster,prepareGuildMaster} from './guildmaster-rules.js';
import {guildMasterMemberCard} from './guildmaster-member-view.js';
import {equipmentIcon} from './equipment-art.js';
import {esc} from './dom.js';
const root=document.querySelector('#guildmaster-app');
let state,catalog=[],opponents=[],busy=false,notice='';
const clock=hours=>`Day ${1+Math.floor(hours/24)} · ${String(hours%24).padStart(2,'0')}:00`;
function save(next){writeGuild(next,'guildmaster');state=next;}
function message(text){notice=text;const box=root.querySelector('[data-manager-message]');if(box)box.textContent=text;}
async function load(){
 try{({catalog,opponents}=await loadGuildMasterData());state=readGuild();if(!state)save(prepareGuildMaster(newGuild(catalog,{tableOnly:true}),catalog));else {const normalized=prepareGuildMaster(state,catalog);if(JSON.stringify(normalized)!==JSON.stringify(state))save(normalized);}root.dataset.ready='true';render();}
 catch(error){root.innerHTML=`<header class="adventure-heading"><h1 id="guildmaster-title">GuildMaster</h1></header><p role="alert">${esc(error.message)}</p><button class="button button-dark" data-manager-action="retry">Retry loading</button><button class="button button-quiet" data-manager-action="export">Export guild save</button>`;}
}
function orderControls(member){
 const order=memberOrder(state,member.id),journey=managementState(state).journeys[member.id],selected=order.action==='return'?order.nextAction:order.action;
 return `<fieldset class="manager-segments" aria-label="${esc(member.name)} action" ${member.dead||order.action==='return'?'disabled':''}><legend class="sr-only">Next action</legend>${[['adventure','Adventure'],['rest','Rest'],['work','Work']].map(([action,label])=>`<button type="button" data-order-action="${action}" data-member-id="${esc(member.id)}" aria-pressed="${selected===action}" ${!journey&&action!=='rest'&&!availableMember(member)?'disabled':''}>${label}</button>`).join('')}</fieldset>${order.action==='return'?'<p class="manager-return-note">Returning next turn. Actions unlock on arrival.</p>':''}`;
}
function resultMarkup(result,{compact=false}={}){
 const report=result.encounter;
 return `<div class="manager-result"><p>${esc(result.summary)}</p><div class="manager-result-stats"><span>HP ${result.hpBefore} → ${result.hpAfter}</span><span>PP ${result.ppBefore} → ${result.ppAfter}</span><span>+${result.xp} XP</span>${result.gold?`<span>${result.gold} gold ${result.away?'found':'banked'}</span>`:''}</div>${result.items.length?`<p class="manager-loot">${result.items.map(i=>equipmentIcon(i.name)+esc(i.name)).join(' · ')}</p>`:''}${report?`<details class="manager-encounter"><summary>${report.rounds.length||report.archivedRounds?`Encounter results · ${report.rounds.length||report.archivedRounds} rounds`:'Travel result'}</summary><p>${esc(report.encounter.label)} · ${esc(report.location)} · T-5.1 ${esc(report.encounter.cell)}</p>${report.enemies?`<p>Opponents: ${report.enemies.map(e=>esc(e.name)).join(', ')}</p>`:''}<p>${report.gold} gold found · ${report.items.length} items dropped. ${result.away?'Carried until this member comes back.':'Rewards are in the guild store.'}</p>${report.rounds.length?`<div class="guild-rounds">${report.rounds.map(r=>`<details><summary>Round ${r.round}</summary><ol>${r.events.map(e=>`<li>${esc(e.text)}</li>`).join('')}</ol></details>`).join('')}</div>`:report.archivedRounds?'<p>Older round details archived; rewards and conclusions retained.</p>':'<p>No combat this turn.</p>'}</details>`:''}${!compact&&result.dead?'<strong>Member lost.</strong>':''}</div>`;
}
function render(){
 if(!state)return;
 const manager=managementState(state),latest=manager.reports[0],away=Object.keys(manager.journeys).length,living=state.members.filter(m=>!m.dead).length;
 root.innerHTML=`<header class="adventure-heading manager-heading"><div><p class="adventure-eyebrow">Your members. Your orders.</p><h1 id="guildmaster-title">GuildMaster</h1><p>Recruit a printed T-5.8 profile, assign an action, and advance time.</p></div><button class="button button-quiet" data-manager-action="recruit-focus">Recruit member</button></header><div class="manager-toolbar"><div class="manager-clock"><strong>${clock(state.hours)}</strong><span>Turn ${manager.turn} · ${living} living members · ${away} away · ${state.gold} gold in store</span></div><button class="button button-dark" data-manager-action="advance" ${living?'':'disabled'}>Advance time · 4 hours →</button></div><p class="adventure-notice" data-manager-message role="status">${esc(notice||'Orders are queued. Nothing changes until you advance time.')}</p><section class="manager-main" aria-labelledby="manager-members-title"><div class="manager-section-heading"><h2 id="manager-members-title">Members</h2><span>${latest?`Last resolved: turn ${latest.number} · ${clock(latest.hour)}`:'Ready for the first turn'}</span></div><div class="guild-members manager-members">${state.members.map(member=>{const result=latest?.results.find(r=>r.memberId===member.id);return guildMasterMemberCard(state,member,[],{controls:orderControls(member),result:result?`<section class="manager-member-result" aria-label="${esc(member.name)} last result"><h4>Last turn</h4>${resultMarkup(result,{compact:true})}</section>`:''});}).join('')}</div></section><div class="manager-secondary"><section class="manager-panel"><h2>Recruit members</h2><form id="manager-recruit"><label>Master Character Table T-5.8<select name="template">${catalog.map(c=>`<option value="${esc(c.id)}">${esc(c.name)} · ${c.hits} HP · ${c.ppMax} PP</option>`).join('')}</select></label><button class="button button-dark" ${state.members.length>=24?'disabled':''}>Recruit member</button></form><p>45 fixed T-5.8 profiles. Recruitment is free; up to 24 members. Opponents come from T-5.8, the Monster Statistics Chart, and the Animal Statistics Chart.</p></section></div><details class="manager-panel manager-history"><summary>Turn journal · ${manager.reports.length} turns</summary>${manager.reports.map(turn=>`<details><summary>Turn ${turn.number} · ${clock(turn.hour)}</summary>${turn.results.map(r=>`<article><h3>${esc(r.name)}</h3>${resultMarkup(r)}</article>`).join('')}</details>`).join('')||'<p>Results from every member appear here after advancing time.</p>'}</details><details class="adventure-notes"><summary>How member turns work</summary><p>Assign Adventure, Rest, or Work, then advance four hours. Each member adventures at their own level. Switching an away member to Rest or Work queues a return; their action control locks until they arrive next turn. Their chosen base action begins on the following turn.</p><p>Work earns 1 gold per turn. Rest restores 4 HP per turn and treats wounds; PP recovers after eight resting hours. Dead members cannot act. Victories award gold; equipment drops and the shop are disabled.</p><p>Members use printed hits, armor type, DB and OB. T-5.8 does not name weapons or spell lists: its first non-spell attack uses the existing edged-melee or missile attack table. Directed-spell OB, PP and spell ranks are shown for reference; spells are not invented or cast. Monster and animal attacks use their printed attack types, chances and follow-ups. Special abilities and group/swarm attacks are not automated.</p><p>Wounds, XP, gold and the turn journal persist. XP does not change the fixed profile. Previously stored items are retained in the save but do not affect these stats.</p></details>`;
 setBusy(busy);
}
function setBusy(value){
 busy=value;
 for(const input of root.querySelectorAll('button,input,select')){
  if(value){if(input.dataset.disabledBefore===undefined)input.dataset.disabledBefore=String(input.disabled);input.disabled=true;}
  else if(input.dataset.disabledBefore!==undefined){input.disabled=input.dataset.disabledBefore==='true';delete input.dataset.disabledBefore;}
 }
}
root.addEventListener('submit',event=>{
 event.preventDefault();if(busy||event.target.id!=='manager-recruit')return;
 try{save(prepareGuildMaster(recruitMember(state,catalog.find(c=>c.id===new FormData(event.target).get('template')))));notice='A new member joined the guild. Assign their next action in the grid.';render();}
 catch(error){message(error.message);}
});
root.addEventListener('click',async event=>{
 if(busy)return;
 const orderButton=event.target.closest('[data-order-action]');
 if(orderButton){try{save(setMemberOrder(state,orderButton.dataset.memberId,{action:orderButton.dataset.orderAction}));notice='Action queued. Advance time to resolve it.';render();root.querySelector(`[data-member-id="${orderButton.dataset.memberId}"][data-order-action="${orderButton.dataset.orderAction}"]`)?.focus();}catch(error){message(error.message);}return;}
 const button=event.target.closest('[data-manager-action]');if(!button)return;
 try{switch(button.dataset.managerAction){
 case 'retry':await load();break;
 case 'export':{const url=URL.createObjectURL(new Blob([localStorage.getItem(guildStorageKey)||''],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='guild-save.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);break;}
 case 'recruit-focus':root.querySelector('#manager-recruit').scrollIntoView({behavior:'smooth'});root.querySelector('#manager-recruit select').focus({preventScroll:true});break;
 case 'advance':{
  setBusy(true);message('Resolving member orders…');
  const before=readGuild();const expected=JSON.stringify(before);
  const needsCombat=before.members.some(m=>!m.dead&&memberOrder(before,m.id).action==='adventure');
  const tables=needsCombat?await loadGuildCombat():{};
  if(JSON.stringify(readGuild())!==expected)throw new Error('The guild changed while loading. Review the orders and advance again.');
  const next=advanceGuildMaster(before,opponents,tables);save(next);
  const reports=managementState(next).reports[0].results,encounters=reports.filter(r=>r.encounter?.rounds.length).length;
  notice=`Turn ${managementState(next).turn} complete. ${encounters} combat encounter${encounters===1?'':'s'}. Review each member’s result and choose their next action.`;
  setBusy(false);render();break;
 }
 }}catch(error){setBusy(false);message(error.message);}
});
window.addEventListener('storage',event=>{if(event.key===guildStorageKey&&!busy)try{const latest=readGuild();if(latest){state=latest;render();}}catch(error){message(error.message);}});
await load();
