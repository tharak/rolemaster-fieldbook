import {loadGuildData,loadGuildCombat} from './guild-data.js';
import {readGuild,writeGuild,guildStorageKey} from './guild-store.js';
import {newGuild,recruitMember,equipMember,availableMember} from './guild-rules.js';
import {managementState,memberOrder,setMemberOrder,advanceGuildMaster} from './guildmaster-rules.js';
import {guildMemberCard} from './guild-member-view.js';
import {equipmentIcon} from './equipment-art.js';
import {generateWorld} from './adventure-rules.js';
import {adventureMap} from './adventure-map.js';
import {esc} from './dom.js';
const root=document.querySelector('#guildmaster-app');
let state,catalog=[],lists=[],busy=false,notice='',mapMember=null;
const clock=hours=>`Day ${1+Math.floor(hours/24)} · ${String(hours%24).padStart(2,'0')}:00`;
function save(next){writeGuild(next,'guildmaster');state=next;}
function message(text){notice=text;const box=root.querySelector('[data-manager-message]');if(box)box.textContent=text;}
async function load(){
 try{({catalog,lists}=await loadGuildData());state=readGuild();if(!state)save(newGuild(catalog));root.dataset.ready='true';render();}
 catch(error){root.innerHTML=`<header class="adventure-heading"><h1 id="guildmaster-title">GuildMaster</h1></header><p role="alert">${esc(error.message)}</p><button class="button button-dark" data-manager-action="retry">Retry loading</button><button class="button button-quiet" data-manager-action="export">Export guild save</button>`;}
}
function orderControls(member){
 const order=memberOrder(state,member.id),journey=managementState(state).journeys[member.id],external=state.expedition?.party.includes(member.id);
 if(external)return '<p class="manager-location">With the Adventures party</p><button class="button button-quiet" data-manager-action="adventures">Manage party on Adventures</button>';
 if(member.dead)return '<p class="manager-location">This member has died.</p>';
 return `<div class="manager-orders"><p class="manager-location">${journey?`Away · Level ${journey.level} adventure · Stage ${journey.stage}<br>Carrying ${journey.gold} gold · ${journey.items.length} items`:'At the guild base'}</p><label>Next action<select data-member-order="${esc(member.id)}" aria-label="${esc(member.name)} next action"><option value="adventure" ${order.action==='adventure'?'selected':''} ${!journey&&!availableMember(member)?'disabled':''}>Adventure</option><option value="return" ${order.action==='return'?'selected':''} ${!journey?'disabled':''}>Come back</option><option value="rest" ${order.action==='rest'?'selected':''} ${journey?'disabled':''}>Rest</option></select></label><label>Adventure level<input type="number" min="1" max="20" value="${order.level}" data-member-level="${esc(member.id)}" aria-label="${esc(member.name)} adventure level" ${journey||order.action!=='adventure'?'disabled':''}></label><small>Order takes effect when you advance time.${journey?' Come back before resting or changing adventure level.':''}</small></div>`;
}
function resultMarkup(result,{compact=false}={}){
 const report=result.encounter;
 return `<div class="manager-result"><p>${esc(result.summary)}</p><div class="manager-result-stats"><span>HP ${result.hpBefore} → ${result.hpAfter}</span><span>PP ${result.ppBefore} → ${result.ppAfter}</span><span>+${result.xp} XP</span>${result.gold?`<span>${result.gold} gold ${result.away?'found':'banked'}</span>`:''}</div>${result.items.length?`<p class="manager-loot">${result.items.map(i=>equipmentIcon(i.name)+esc(i.name)).join(' · ')}</p>`:''}${report?`<details class="manager-encounter"><summary>${report.rounds.length||report.archivedRounds?`Encounter results · ${report.rounds.length||report.archivedRounds} rounds`:'Travel result'}</summary><p>${esc(report.encounter.label)} · ${esc(report.location)} · T-5.1 ${esc(report.encounter.cell)}</p>${report.enemies?`<p>Opponents: ${report.enemies.map(e=>esc(e.name)).join(', ')}</p>`:''}<p>${report.gold} gold found · ${report.items.length} items dropped. ${result.away?'Carried until this member comes back.':'Rewards are in the guild store.'}</p>${report.rounds.length?`<div class="guild-rounds">${report.rounds.map(r=>`<details><summary>Round ${r.round}</summary><ol>${r.events.map(e=>`<li>${esc(e.text)}</li>`).join('')}</ol></details>`).join('')}</div>`:report.archivedRounds?'<p>Older round details archived; rewards and conclusions retained.</p>':'<p>No combat this turn.</p>'}</details>`:''}${!compact&&result.dead?'<strong>Member lost.</strong>':''}</div>`;
}
function render(){
 if(!state)return;
 const manager=managementState(state),latest=manager.reports[0],away=Object.keys(manager.journeys).length+(state.expedition?.party.length||0),living=state.members.filter(m=>!m.dead).length;
 const journeys=Object.entries(manager.journeys);if(!journeys.some(([id])=>id===mapMember))mapMember=journeys[0]?.[0]||null;
 root.innerHTML=`<header class="adventure-heading manager-heading"><div><p class="adventure-eyebrow">Your members. Your orders.</p><h1 id="guildmaster-title">GuildMaster</h1><p>Assign each member an action, then advance time to resolve their turn.</p></div><button class="button button-quiet" data-manager-action="recruit-focus">Recruit member</button></header><div class="manager-toolbar"><div class="manager-clock"><strong>${clock(state.hours)}</strong><span>Turn ${manager.turn} · ${living} living members · ${away} away · ${state.gold} gold in store</span></div><button class="button button-dark" data-manager-action="advance" ${living?'':'disabled'}>Advance time · 4 hours →</button></div><p class="adventure-notice" data-manager-message role="status">${esc(notice||'Orders are queued. Nothing changes until you advance time.')}</p><section class="manager-main" aria-labelledby="manager-members-title"><div class="manager-section-heading"><h2 id="manager-members-title">Members</h2><span>${latest?`Last resolved: turn ${latest.number} · ${clock(latest.hour)}`:'Ready for the first turn'}</span></div><div class="guild-members manager-members">${state.members.map(member=>{const result=latest?.results.find(r=>r.memberId===member.id);return guildMemberCard(state,member,lists,{controls:orderControls(member),result:result?`<section class="manager-member-result" aria-label="${esc(member.name)} last result"><h4>Last turn</h4>${resultMarkup(result,{compact:true})}</section>`:''});}).join('')}</div></section><div class="manager-secondary"><section class="manager-panel"><h2>Recruit members</h2><form id="manager-recruit"><label>Master Character Table T-5.8<select name="template">${catalog.map(c=>`<option value="${esc(c.id)}">${esc(c.name)} · ${c.hits} HP · ${c.ppMax} PP</option>`).join('')}</select></label><button class="button button-dark" ${state.members.length>=24?'disabled':''}>Recruit member</button></form><p>Recruitment is free for this prototype. Up to 24 guild members.</p></section><details class="manager-panel"><summary>Guild store · ${state.inventory.length} items</summary><p>Equip stored items from a member’s card while they are at base.</p><ul class="manager-store">${state.inventory.map(i=>{const owner=state.members.find(m=>Object.values(m.equipped).includes(i.id));return `<li>${equipmentIcon(i.name)}<span>${esc(i.name)}<small>${owner?esc(owner.name):'In store'}</small></span></li>`;}).join('')}</ul></details></div><details class="manager-panel manager-history"><summary>Turn journal · ${manager.reports.length} turns</summary>${manager.reports.map(turn=>`<details><summary>Turn ${turn.number} · ${clock(turn.hour)}</summary>${turn.results.map(r=>`<article><h3>${esc(r.name)}</h3>${resultMarkup(r)}</article>`).join('')}</details>`).join('')||'<p>Results from every member appear here after advancing time.</p>'}</details><details class="manager-panel manager-map"><summary>Adventure map</summary><p>The map is a reference. Member orders are managed in the grid above.</p>${journeys.length?`<label>Member on the road<select data-manager-map>${journeys.map(([id])=>`<option value="${esc(id)}" ${id===mapMember?'selected':''}>${esc(state.members.find(m=>m.id===id).name)}</option>`).join('')}</select></label><div class="adventure-map-panel">${adventureMap(generateWorld(manager.journeys[mapMember].seed),manager.journeys[mapMember],manager.journeys[mapMember].goal)}</div>`:'<p>No member is currently on an individual adventure.</p>'}<button class="button button-quiet" data-manager-action="adventures">Open Adventures</button></details><details class="adventure-notes"><summary>How member turns work</summary><p>Each Advance time resolves four hours for every member. Adventure sends a member on an independent journey, or continues their current one at its existing level. Random encounters are simulated automatically; review the results before advancing again. Come back takes one turn and banks carried loot. Rest works only at base: +4 HP per turn, PP recovery after eight resting hours, and wound recovery using the guild infirmary rules. Orders persist; returned members default to Rest.</p><p>The existing Adventures page remains available for party journeys. Members assigned there cannot also take GuildMaster orders. Its party is managed separately; its members are marked on their cards. Members, equipment, XP and gold are shared between both pages. GuildMaster orders run only when you use its Advance time button.</p><p>Combat, spell presets, drops and recovery use the same campaign rules as Adventures. XP accumulates without automatic level advancement. The last 30 turns and up to 400 combat rounds are saved in this browser. Assignment, simulation and rewards save together before the results are shown.</p></details>`;
 // The optional map is a reference here, not an order control.
 for(const node of root.querySelectorAll('[data-map-node]')){node.removeAttribute('role');node.removeAttribute('tabindex');node.removeAttribute('aria-pressed');}
 setBusy(busy);
}
function setBusy(value){
 busy=value;
 for(const input of root.querySelectorAll('button,input,select')){
  if(value){if(input.dataset.disabledBefore===undefined)input.dataset.disabledBefore=String(input.disabled);input.disabled=true;}
  else if(input.dataset.disabledBefore!==undefined){input.disabled=input.dataset.disabledBefore==='true';delete input.dataset.disabledBefore;}
 }
}
root.addEventListener('change',event=>{
 if(busy)return;const input=event.target;
 try{
  const id=input.dataset.memberOrder||input.dataset.memberLevel;
  if(id){
   const order=memberOrder(state,id);save(setMemberOrder(state,id,{action:input.dataset.memberOrder?input.value:order.action,level:input.dataset.memberLevel?Number(input.value):order.level}));
   const level=root.querySelector(`[data-member-level="${id}"]`);level.disabled=!!managementState(state).journeys[id]||memberOrder(state,id).action!=='adventure';
   message('Order saved. Advance time when all members are ready.');return;
  }
  if(input.dataset.equipment){save(equipMember(state,input.dataset.memberId,input.value,input.dataset.equipment));notice='Equipment updated.';render();}
  if(input.matches('[data-manager-map]')){mapMember=input.value;render();root.querySelector('.manager-map').open=true;}
 }catch(error){notice=error.message;render();}
});
root.addEventListener('submit',event=>{
 event.preventDefault();if(busy||event.target.id!=='manager-recruit')return;
 try{save(recruitMember(state,catalog.find(c=>c.id===new FormData(event.target).get('template'))));notice='A new member joined the guild. Assign their next action in the grid.';render();}
 catch(error){message(error.message);}
});
root.addEventListener('click',async event=>{
 const button=event.target.closest('[data-manager-action]');if(!button||busy)return;
 try{switch(button.dataset.managerAction){
 case 'retry':await load();break;
 case 'export':{const url=URL.createObjectURL(new Blob([localStorage.getItem(guildStorageKey)||''],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='guild-save.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);break;}
 case 'adventures':document.querySelector('[data-view="adventure"]').click();break;
 case 'recruit-focus':root.querySelector('#manager-recruit').scrollIntoView({behavior:'smooth'});root.querySelector('#manager-recruit select').focus({preventScroll:true});break;
 case 'advance':{
  setBusy(true);message('Resolving member orders…');
  const before=readGuild();const expected=JSON.stringify(before);
  const needsCombat=before.members.some(m=>!m.dead&&!before.expedition?.party.includes(m.id)&&memberOrder(before,m.id).action==='adventure');
  const tables=needsCombat?await loadGuildCombat():{};
  if(JSON.stringify(readGuild())!==expected)throw new Error('The guild changed while loading. Review the orders and advance again.');
  const next=advanceGuildMaster(before,catalog,tables);save(next);
  const reports=managementState(next).reports[0].results,encounters=reports.filter(r=>r.encounter?.rounds.length).length;
  notice=`Turn ${managementState(next).turn} complete. ${encounters} combat encounter${encounters===1?'':'s'}. Review each member’s result and choose their next action.`;
  setBusy(false);render();break;
 }
 }}catch(error){setBusy(false);message(error.message);}
});
window.addEventListener('rolemaster-guild-updated',event=>{if(event.detail.source==='guildmaster'||!state)return;state=event.detail.state;render();});
window.addEventListener('storage',event=>{if(event.key===guildStorageKey&&!busy)try{const latest=readGuild();if(latest){state=latest;render();}}catch(error){message(error.message);}});
await load();
