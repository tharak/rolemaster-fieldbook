import {loadGuildMasterData,loadGuildCombat} from './guild-data.js';
import {readGuild,writeGuild,guildStorageKey} from './guildmaster-store.js';
import {newGuild,recruitMember,availableMember} from './guild-rules.js';
import {managementState,memberOrder,setMemberOrder,advanceGuildMaster,prepareGuildMaster,dismissGuildMember} from './guildmaster-rules.js';
import {guildMasterMemberCard} from './guildmaster-member-view.js';
import {guildMasterJournal} from './guildmaster-journal.js';
import {esc} from './dom.js';
const root=document.querySelector('#guildmaster-app'),manageDialog=document.querySelector('#guildmaster-manage-dialog');
let pendingDismiss=null;
let state,catalog=[],opponents=[],busy=false,notice='';
let managerView='members',journalFilters={member:'all',kind:'all',limit:5};
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
function renderJournal(){
 root.querySelector('#manager-journal-panel').innerHTML=guildMasterJournal(state,journalFilters);
}
function showManagerView(view){
 managerView=view;
 root.querySelectorAll('[data-manager-view]').forEach(button=>{const selected=button.dataset.managerView===view;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;});
 root.querySelector('#manager-members-panel').hidden=view!=='members';
 root.querySelector('#manager-journal-panel').hidden=view!=='journal';
}
function renderManagement(){
 const journeys=managementState(state).journeys;
 document.querySelector('#guildmaster-manage-list').innerHTML=state.members.map(member=>{
  const away=!!journeys[member.id],confirming=pendingDismiss===member.id;
  return `<article class="manager-manage-member"><div><h3>${esc(member.name)}</h3><p>${esc(member.profession)} · Level ${member.level} · ${member.dead?'Dead':away?'On expedition':'At base'}</p></div>${away?'<p class="manager-dismiss-note">Return to base before dismissing.</p>':confirming?`<div class="manager-dismiss-confirm"><p>Dismiss ${esc(member.name)}? This removes them from the roster permanently.</p><button type="button" class="button manager-dismiss-button" data-confirm-dismiss="${esc(member.id)}">Confirm dismissal</button><button type="button" class="button button-quiet" data-cancel-dismiss>Cancel</button></div>`:`<button type="button" class="button manager-dismiss-button" data-dismiss-member="${esc(member.id)}" aria-label="Dismiss ${esc(member.name)}">Dismiss</button>`}</article>`;
 }).join('')||'<p>No members in the guild. Close this window and recruit a member to begin again.</p>';
}
function render(){
 if(!state)return;
 const manager=managementState(state),latest=manager.reports[0],away=Object.keys(manager.journeys).length,living=state.members.filter(m=>!m.dead).length;
 root.innerHTML=`<header class="adventure-heading manager-heading"><div><p class="adventure-eyebrow">Your members. Your orders.</p><h1 id="guildmaster-title">GuildMaster</h1><p>Recruit a printed T-5.8 profile, assign an action, and advance time.</p></div><div class="manager-heading-actions"><button type="button" class="button button-quiet" data-manager-action="manage">Manage guild</button><button type="button" class="button button-quiet" data-manager-action="recruit-focus">Recruit member</button></div></header><div class="manager-toolbar"><div class="manager-clock"><strong>${clock(state.hours)}</strong><span>Turn ${manager.turn} · ${living} living members · ${away} away · ${state.gold} gold in store</span></div><button class="button button-dark" data-manager-action="advance" ${living?'':'disabled'}>Advance time · 4 hours →</button></div><p class="adventure-notice" data-manager-message role="status">${esc(notice||'Orders are queued. Nothing changes until you advance time.')}</p><div class="manager-view-tabs" role="tablist" aria-label="GuildMaster views"><button type="button" id="manager-members-tab" role="tab" aria-controls="manager-members-panel" data-manager-view="members">Members</button><button type="button" id="manager-journal-tab" role="tab" aria-controls="manager-journal-panel" data-manager-view="journal">Journal <span>${manager.reports.length?`Turn ${manager.reports[0].number}`:'No entries'}</span></button></div><div id="manager-members-panel" role="tabpanel" aria-labelledby="manager-members-tab"><section class="manager-main" aria-labelledby="manager-members-title"><div class="manager-section-heading"><h2 id="manager-members-title">Members</h2><span>${latest?`Last resolved: turn ${latest.number} · ${clock(latest.hour)}`:'Ready for the first turn'}</span></div><div class="guild-members manager-members">${state.members.map(member=>guildMasterMemberCard(state,member,[],{controls:orderControls(member)})).join('')}</div></section><div class="manager-secondary"><section class="manager-panel"><h2>Recruit members</h2><form id="manager-recruit"><label>Master Character Table T-5.8<select name="template">${catalog.map(c=>`<option value="${esc(c.id)}">${esc(c.name)} · ${c.hits} HP · ${c.ppMax} PP</option>`).join('')}</select></label><button class="button button-dark" ${state.members.length>=24?'disabled':''}>Recruit member</button></form><p>45 fixed T-5.8 profiles. Recruitment is free; up to 24 members. Opponents come from T-5.8, the Monster Statistics Chart, and the Animal Statistics Chart.</p></section></div></div><section id="manager-journal-panel" role="tabpanel" aria-labelledby="manager-journal-tab"></section><details class="adventure-notes"><summary>How member turns work</summary><p>Assign Adventure, Rest, or Work, then advance four hours. Each member adventures at their own level. Switching an away member to Rest or Work queues a return; their action control locks until they arrive next turn. Their chosen base action begins on the following turn.</p><p>Work earns 1 gold per turn. Rest restores 4 HP per turn and treats wounds; PP recovers after eight resting hours. Dead members cannot act. Victories award gold; equipment drops and the shop are disabled.</p><p>Members use printed hits, armor type, DB and OB. Weapons and bolts are assigned once per member; opponents receive their own assignments per encounter. Combat uses the highest printed OB (ties use slot 1). Bolts attack each round without preparation or PP costs, using their bolt-table adjustments. PP and spell ranks remain reference values. Armor names describe the printed AT and add no extra bonuses. Monster and animal attacks use their printed attack types, chances and follow-ups. Special abilities and group/swarm attacks are not automated.</p><p>Wounds, XP, gold and the turn journal persist. XP does not change the fixed profile. Previously stored items are retained in the save but do not affect these stats.</p></details>`;
 renderJournal();showManagerView(managerView);
 if(manageDialog.open)renderManagement();
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
 const viewButton=event.target.closest('[data-manager-view]');
 if(viewButton){showManagerView(viewButton.dataset.managerView);return;}
 const filter=event.target.closest('[data-journal-kind]');
 if(filter){journalFilters.kind=filter.dataset.journalKind;journalFilters.limit=5;renderJournal();root.querySelector(`[data-journal-kind="${journalFilters.kind}"]`).focus();return;}
 if(event.target.closest('[data-journal-older]')){journalFilters.limit+=5;renderJournal();(root.querySelector('[data-journal-older]')||root.querySelector('#manager-journal-tab')).focus();return;}
 if(event.target.closest('[data-journal-reset]')){journalFilters={member:'all',kind:'all',limit:5};renderJournal();root.querySelector('[data-journal-member]').focus();return;}
 const orderButton=event.target.closest('[data-order-action]');
 if(orderButton){try{save(setMemberOrder(state,orderButton.dataset.memberId,{action:orderButton.dataset.orderAction}));notice='Action queued. Advance time to resolve it.';render();root.querySelector(`[data-member-id="${orderButton.dataset.memberId}"][data-order-action="${orderButton.dataset.orderAction}"]`)?.focus();}catch(error){message(error.message);}return;}
 const button=event.target.closest('[data-manager-action]');if(!button)return;
 try{switch(button.dataset.managerAction){
 case 'retry':await load();break;
 case 'manage':pendingDismiss=null;document.querySelector('#guildmaster-manage-message').textContent='';renderManagement();manageDialog.showModal();break;
 case 'export':{const url=URL.createObjectURL(new Blob([localStorage.getItem(guildStorageKey)||''],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='guild-save.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);break;}
 case 'recruit-focus':showManagerView('members');root.querySelector('#manager-recruit').scrollIntoView({behavior:'smooth'});root.querySelector('#manager-recruit select').focus({preventScroll:true});break;
 case 'advance':{
  setBusy(true);message('Resolving member orders…');
  const before=readGuild();const expected=JSON.stringify(before);
  const needsCombat=before.members.some(m=>!m.dead&&memberOrder(before,m.id).action==='adventure');
  const tables=needsCombat?await loadGuildCombat():{};
  if(JSON.stringify(readGuild())!==expected)throw new Error('The guild changed while loading. Review the orders and advance again.');
  const next=advanceGuildMaster(before,opponents,tables);save(next);
  const reports=managementState(next).reports[0].results,encounters=reports.filter(r=>r.encounter?.rounds.length).length;
  notice=`Turn ${managementState(next).turn} complete. ${encounters} combat encounter${encounters===1?'':'s'}. Review the journal, then return to Members to choose their next actions.`;
  managerView='journal';journalFilters={member:'all',kind:'all',limit:5};
  setBusy(false);render();root.querySelector('#manager-journal-tab').focus();break;
 }
 }}catch(error){setBusy(false);message(error.message);}
});
root.addEventListener('change',event=>{
 if(busy||!event.target.matches('[data-journal-member]'))return;
 journalFilters.member=event.target.value;journalFilters.limit=5;renderJournal();root.querySelector('[data-journal-member]').focus();
});
root.addEventListener('keydown',event=>{
 if(busy||!event.target.matches('[data-manager-view]')||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
 event.preventDefault();const view=event.key==='Home'?'members':event.key==='End'?'journal':managerView==='members'?'journal':'members';
 showManagerView(view);root.querySelector(`[data-manager-view="${view}"]`).focus();
});
manageDialog.addEventListener('click',event=>{
 if(event.target.closest('[data-close-manage]')){manageDialog.close();return;}
 if(event.target.closest('[data-cancel-dismiss]')){const id=pendingDismiss;pendingDismiss=null;renderManagement();manageDialog.querySelector(`[data-dismiss-member="${id}"]`)?.focus();return;}
 const request=event.target.closest('[data-dismiss-member]');
 if(request){pendingDismiss=request.dataset.dismissMember;renderManagement();manageDialog.querySelector('[data-cancel-dismiss]').focus();return;}
 const confirm=event.target.closest('[data-confirm-dismiss]');if(!confirm||pendingDismiss!==confirm.dataset.confirmDismiss)return;
 try{
  const current=readGuild(),member=current.members.find(item=>item.id===pendingDismiss);
  save(dismissGuildMember(current,pendingDismiss));pendingDismiss=null;notice=`${member.name} was dismissed. Their journal entries have been kept.`;
  render();document.querySelector('#guildmaster-manage-message').textContent=notice;manageDialog.querySelector('[data-close-manage]').focus();
 }catch(error){document.querySelector('#guildmaster-manage-message').textContent=error.message;}
});
manageDialog.addEventListener('close',()=>{pendingDismiss=null;root.querySelector('[data-manager-action="manage"]')?.focus({preventScroll:true});});
window.addEventListener('rolemaster-view-changed',()=>{if(manageDialog.open)manageDialog.close();});
window.addEventListener('storage',event=>{if(event.key===guildStorageKey&&!busy)try{const latest=readGuild();if(latest){state=latest;render();}}catch(error){message(error.message);}});
await load();
