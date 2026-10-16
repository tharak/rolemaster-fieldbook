import {loadGuildData,loadGuildCombat} from './guild-data.js';
import {readGuild,writeGuild,guildStorageKey} from './guildmaster-store.js';
import {newGuild,recruitMember,equipMember,availableMember} from './guild-rules.js';
import {managementState,memberOrder,setMemberOrder,advanceGuildMaster,prepareGuildMaster,availableMemberSpells,setMemberSpells} from './guildmaster-rules.js';
import {guildMasterMemberCard,itemName,originalArmor} from './guildmaster-member-view.js';
import {automatedSpells,spellKey} from './guild-spells.js';
import {equipmentIcon} from './equipment-art.js';
import {esc} from './dom.js';
const root=document.querySelector('#guildmaster-app'),picker=document.querySelector('#guildmaster-item-dialog'),pickerContent=document.querySelector('#guildmaster-item-content');
let picking=null,spellDraft=new Set(),pickerTrigger=null;
let state,catalog=[],lists=[],busy=false,notice='';
const clock=hours=>`Day ${1+Math.floor(hours/24)} · ${String(hours%24).padStart(2,'0')}:00`;
function save(next){writeGuild(next,'guildmaster');state=next;}
function message(text){notice=text;const box=root.querySelector('[data-manager-message]');if(box)box.textContent=text;}
async function load(){
 try{({catalog,lists}=await loadGuildData());state=readGuild();if(!state)save(prepareGuildMaster(newGuild(catalog)));else {const normalized=prepareGuildMaster(state);if(JSON.stringify(normalized)!==JSON.stringify(state))save(normalized);}root.dataset.ready='true';render();}
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
 root.innerHTML=`<header class="adventure-heading manager-heading"><div><p class="adventure-eyebrow">Your members. Your orders.</p><h1 id="guildmaster-title">GuildMaster</h1><p>Assign each member an action, then advance time to resolve their turn.</p></div><button class="button button-quiet" data-manager-action="recruit-focus">Recruit member</button></header><div class="manager-toolbar"><div class="manager-clock"><strong>${clock(state.hours)}</strong><span>Turn ${manager.turn} · ${living} living members · ${away} away · ${state.gold} gold in store</span></div><button class="button button-dark" data-manager-action="advance" ${living?'':'disabled'}>Advance time · 4 hours →</button></div><p class="adventure-notice" data-manager-message role="status">${esc(notice||'Orders are queued. Nothing changes until you advance time.')}</p><section class="manager-main" aria-labelledby="manager-members-title"><div class="manager-section-heading"><h2 id="manager-members-title">Members</h2><span>${latest?`Last resolved: turn ${latest.number} · ${clock(latest.hour)}`:'Ready for the first turn'}</span></div><div class="guild-members manager-members">${state.members.map(member=>{const result=latest?.results.find(r=>r.memberId===member.id);return guildMasterMemberCard(state,member,lists,{controls:orderControls(member),result:result?`<section class="manager-member-result" aria-label="${esc(member.name)} last result"><h4>Last turn</h4>${resultMarkup(result,{compact:true})}</section>`:''});}).join('')}</div></section><div class="manager-secondary"><section class="manager-panel"><h2>Recruit members</h2><form id="manager-recruit"><label>Master Character Table T-5.8<select name="template">${catalog.map(c=>`<option value="${esc(c.id)}">${esc(c.name)} · ${c.hits} HP · ${c.ppMax} PP</option>`).join('')}</select></label><button class="button button-dark" ${state.members.length>=24?'disabled':''}>Recruit member</button></form><p>Recruitment is free for this prototype. Up to 24 guild members.</p></section><details class="manager-panel"><summary>Guild store · ${state.inventory.length} items</summary><p>Equip stored items from a member’s card while they are at base.</p><ul class="manager-store">${state.inventory.map(i=>{const owner=state.members.find(m=>Object.values(m.equipped).includes(i.id));return `<li>${equipmentIcon(i.name)}<span>${esc(i.name)}<small>${owner?esc(owner.name):'In store'}</small></span></li>`;}).join('')}</ul></details></div><details class="manager-panel manager-history"><summary>Turn journal · ${manager.reports.length} turns</summary>${manager.reports.map(turn=>`<details><summary>Turn ${turn.number} · ${clock(turn.hour)}</summary>${turn.results.map(r=>`<article><h3>${esc(r.name)}</h3>${resultMarkup(r)}</article>`).join('')}</details>`).join('')||'<p>Results from every member appear here after advancing time.</p>'}</details><details class="adventure-notes"><summary>How member turns work</summary><p>Assign Adventure, Rest, or Work, then advance four hours. Each member adventures at their own level. Switching an away member to Rest or Work queues a return; their action control locks until they arrive next turn. Their chosen base action begins on the following turn.</p><p>Work earns 1 gold per four-hour turn. Working does not restore HP or PP. Rest at base restores 4 HP per turn, with PP recovery after eight resting hours and infirmary wound treatment. Dead members cannot act. Equipment and spell selections can only change at base.</p><p>Select individual spells from the member’s learned lists. Selected supported spells are used automatically in combat; other known spells are labeled reference-only in the picker. GuildMaster has its own members, items, gold and clock. The latest 30 turns and up to 400 combat rounds save in this browser. XP accumulates without automatic level advancement.</p></details>`;
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
 const orderButton=event.target.closest('[data-order-action]'),equipment=event.target.closest('[data-pick-equipment]'),spells=event.target.closest('[data-pick-spells]');
 if(orderButton){try{save(setMemberOrder(state,orderButton.dataset.memberId,{action:orderButton.dataset.orderAction}));notice='Action queued. Advance time to resolve it.';render();root.querySelector(`[data-member-id="${orderButton.dataset.memberId}"][data-order-action="${orderButton.dataset.orderAction}"]`)?.focus();}catch(error){message(error.message);}return;}
 if(equipment||spells){openPicker(equipment||spells);return;}
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
  const next=advanceGuildMaster(before,catalog,tables);save(next);
  const reports=managementState(next).reports[0].results,encounters=reports.filter(r=>r.encounter?.rounds.length).length;
  notice=`Turn ${managementState(next).turn} complete. ${encounters} combat encounter${encounters===1?'':'s'}. Review each member’s result and choose their next action.`;
  setBusy(false);render();break;
 }
 }}catch(error){setBusy(false);message(error.message);}
});
window.addEventListener('storage',event=>{if(event.key===guildStorageKey&&!busy)try{const latest=readGuild();if(latest){state=latest;if(picker.open)picker.close();render();}}catch(error){message(error.message);}});
function openPicker(trigger){
 const id=trigger.dataset.memberId||trigger.dataset.pickSpells,member=state.members.find(m=>m.id===id);
 if(!member||member.dead||managementState(state).journeys[id])return;
 pickerTrigger={id,slot:trigger.dataset.pickEquipment||'spells'};picking={...pickerTrigger};spellDraft=new Set(member.selectedSpells||[]);
 renderPicker();picker.showModal();
}
function renderPicker(){
 const member=state.members.find(m=>m.id===picking.id),slot=picking.slot;
 document.querySelector('#guildmaster-item-title').textContent=`${member.name} · ${slot==='spells'?'Spells':slot[0].toUpperCase()+slot.slice(1)}`;
 document.querySelector('#guildmaster-item-message').textContent='';
 if(slot==='spells'){
  const available=availableMemberSpells(member,lists),groups=[...new Set(available.map(s=>s.list))];
  pickerContent.innerHTML=`<p>Select the spells this member will carry. Only spells within their learned lists and levels are available.</p>${groups.map(id=>{const entries=available.filter(s=>s.list===id);return `<section class="manager-picker-group"><h3>${esc(entries[0].listName)}</h3><div class="manager-picker-grid">${entries.map(spell=>`<button type="button" class="manager-pick-item" data-spell-choice="${esc(spell.key)}" aria-pressed="${spellDraft.has(spell.key)}">${equipmentIcon('Spell book')}<span><strong>${esc(spell.name)}</strong><small>Level ${spell.level} · ${automatedSpells.some(s=>spellKey(s)===spell.key)?'Automatic in combat':'Reference only'}</small></span><span class="manager-choice-mark" aria-hidden="true">${spellDraft.has(spell.key)?'✓':'+'}</span></button>`).join('')}</div></section>`;}).join('')}<div class="manager-picker-actions"><button type="button" class="button button-dark" data-save-spells>Save spells</button><button type="button" class="button button-quiet" data-close-picker>Cancel</button></div>`;
 }else{
  const items=state.inventory.filter(i=>i.slot===slot&&(slot!=='weapon'||member.sourceAttacks.some(a=>a.kind===i.kind)));
  pickerContent.innerHTML=`<div class="manager-picker-grid">${slot!=='weapon'?`<button type="button" class="manager-pick-item" data-item-choice="" aria-pressed="${!member.equipped[slot]}">${equipmentIcon(slot==='armor'?originalArmor(member):slot)}<span><strong>${esc(slot==='armor'?originalArmor(member):`No ${slot}`)}</strong><small>${slot==='armor'?'Original armor':'Unequip'}</small></span></button>`:''}${items.map(item=>{
   const owner=state.members.find(m=>Object.values(m.equipped).includes(item.id)),equipped=member.equipped[slot]===item.id;
   return `<button type="button" class="manager-pick-item" data-item-choice="${esc(item.id)}" aria-pressed="${equipped}" ${owner&&owner.id!==member.id?'disabled':''}>${equipmentIcon(item.name)}<span><strong>${esc(itemName(item))}</strong><small>${owner?equipped?'Equipped':`Used by ${esc(owner.name)}`:'In store'}</small></span>${equipped?'<span aria-hidden="true">✓</span>':''}</button>`;
  }).join('')}</div>`;
 }
}
picker.addEventListener('click',event=>{
 const item=event.target.closest('[data-item-choice]'),spell=event.target.closest('[data-spell-choice]');
 try{
  if(event.target.closest('[data-close-picker]')){picker.close();return;}
  if(item){save(equipMember(state,picking.id,item.dataset.itemChoice,picking.slot));notice='Equipment updated.';render();picker.close();}
  if(spell){const key=spell.dataset.spellChoice;spellDraft.has(key)?spellDraft.delete(key):spellDraft.add(key);spell.setAttribute('aria-pressed',String(spellDraft.has(key)));spell.querySelector('.manager-choice-mark').textContent=spellDraft.has(key)?'✓':'+';}
  if(event.target.closest('[data-save-spells]')){save(setMemberSpells(state,picking.id,[...spellDraft],lists));notice='Spell selection updated.';render();picker.close();}
 }catch(error){document.querySelector('#guildmaster-item-message').textContent=error.message;}
});
picker.addEventListener('close',()=>{const trigger=pickerTrigger;if(trigger)root.querySelector(trigger.slot==='spells'?`[data-pick-spells="${trigger.id}"]`:`[data-member-id="${trigger.id}"][data-pick-equipment="${trigger.slot}"]`)?.focus({preventScroll:true});picking=null;});
window.addEventListener('rolemaster-view-changed',()=>{if(picker.open)picker.close();});
await load();
