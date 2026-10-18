import {loadGuildMasterData,loadGuildCombat} from './guild-data.js';
import {readBeta,writeBeta,betaSaveKey} from './guild-beta-store.js';
import {newGame,validGame,hireMember,careForMember,assignActivity,dismissMember,renameGuild,renameMember,levelMembers,advanceGame,readiness,atGuild,GUILD_CAPACITY,RECRUIT_PRICE} from './guild-game-rules.js?v=20261018-3';
import {memberOrder} from './guildmaster-rules.js';
import {statBar as meter,memberEquipment} from './guild-ui.js?v=20261018-3';
import {guildMasterJournal,journalClock} from './guildmaster-journal.js';
import {creatureProfile} from './coliseum-battle.js';
import {esc} from './dom.js';
const root=document.querySelector('#game-app'),dialog=document.querySelector('#game-dialog');
let state,catalog=[],opponents=[],tab='guild',busy=false,notice='',modal=null,selectedTemplate='',journalFilters={member:'all',kind:'all',limit:5};
const portrait=member=>`<svg class="pet-portrait" viewBox="0 0 96 80" aria-hidden="true"><use href="assets/coliseum/creatures.svg#${creatureProfile(member)}"></use></svg>`;
function commit(next){
 if(state&&JSON.stringify(readBeta(localStorage,validGame))!==JSON.stringify(state))throw new Error('The guild changed in another tab. Reload before making changes.');
 next=levelMembers(next,catalog);writeBeta(localStorage,next,validGame);state=next;
}
function status(member){const order=memberOrder(state,member.id);return order.action==='return'?'Coming home':!atGuild(state,member.id)?'Adventuring':readiness(member)||({work:'Resting',rest:'Resting',adventure:'Ready to depart'}[order.action]);}
function notify(message){notice=message;const target=root.querySelector('[data-game-message]');if(target)target.textContent=message;}
function memberCard(member){
 const order=memberOrder(state,member.id),away=!atGuild(state,member.id),locked=order.action==='return',reason=readiness(member);
 return `<article class="pet-card" data-member="${esc(member.id)}"><header>${portrait(member)}<div><h2>${esc(member.name)}</h2>${memberEquipment(member)}<p>${esc(member.profession)} · Level ${member.level} · ${member.xp} XP</p><span class="pet-status ${reason?'needs-care':''}">${esc(status(member))}</span></div></header>${meter('HP',member.hits-member.damage,member.hits)}<div class="care-meters">${meter('Food',member.care.food)}${meter('Energy',member.care.energy)}${meter('Morale',member.care.morale)}</div><div class="member-actions">${[['rest',away?'Recall':'Rest'],['adventure','Adventure']].map(([action,label])=>`<button type="button" class="quiet" data-order="${action}" data-member-id="${esc(member.id)}" aria-pressed="${((order.nextAction||order.action)==='work'?'rest':(order.nextAction||order.action))===action}" ${locked||!away&&action!=='rest'&&reason?'disabled':''}>${label}</button>`).join('')}<button type="button" class="primary" data-feed="${esc(member.id)}" title="+40 food, +5 morale" ${away||state.gold<1||member.care.food===100&&member.care.morale===100?'disabled':''}>Meal · 1g</button></div></article>`;
}
function guildView(){
 if(!state.members.length)return `<section class="onboarding"><p class="eyebrow">A new beginning</p><div class="founder-portraits">${['Fighter','Magician','Ranger'].map(profession=>portrait({sourceKind:'master',profession})).join('')}</div><h1>A small guild.<br>A big adventure.</h1><p>Recruit your first companion. Keep them fed, rested, and in good spirits. Send them into the world, then welcome them home.</p><button type="button" class="primary" data-recruit>Choose your first member · free</button><p class="small">You start with 20 gold. Time moves only when you tap Next turn.</p><p class="beta-note">Fresh beta: previous characters, guilds, and inventories have been cleared.</p></section>`;
 const needs=state.members.filter(member=>readiness(member)).length;
 return `<section><div class="section-heading"><div><h1>Your guild</h1></div><button type="button" class="quiet" data-manage>Manage guild</button></div><div class="guild-summary"><span>${state.members.length}/${GUILD_CAPACITY} companions</span><span>${needs?`${needs} need care`:'Everyone is doing well'}</span><span>${state.completedTrips} outings completed</span></div><div class="pet-grid">${state.members.map(memberCard).join('')}</div><button type="button" class="recruit-tile" data-recruit ${state.members.length>=GUILD_CAPACITY?'disabled':''}>+ Recruit a companion <span>${RECRUIT_PRICE} gold · level 1</span></button></section>`;
}
function adventureView(){
 const away=state.members.filter(member=>!atGuild(state,member.id)),home=state.members.filter(member=>atGuild(state,member.id));
 return `<section><p class="eyebrow">Beyond the guild door</p><h1>Adventures</h1><p class="intro">Adventures continue until you recall your companions.</p><div class="adventure-explainer"><span>1 stage = 1 turn</span><span>+5 XP & 1 gold per stage</span></div>${away.length?`<h2 class="section-label">Out in the world</h2><div class="pet-grid">${away.map(member=>{const journey=state.management.journeys[member.id],order=memberOrder(state,member.id);return `<article class="outing-card" data-outing="${esc(member.id)}"><header>${portrait(member)}<div><h2>${esc(member.name)}</h2><span class="pet-status">${esc(status(member))}</span></div></header><p class="outing-stage">Stage ${journey.stage}</p><p>${journey.gold} gold carried · ${journey.xp[member.id]||0} XP earned</p>${meter('HP',member.hits-member.damage,member.hits)}<button type="button" class="quiet" data-order="rest" data-member-id="${esc(member.id)}" ${order.action==='return'?'disabled':''}>${order.action==='return'?'Home next turn':'Recall to guild'}</button></article>`;}).join('')}</div>`:'<div class="empty-card"><h2>The road is waiting</h2><p>Choose a rested companion below to start an adventure.</p></div>'}<h2 class="section-label">At the guild</h2><div class="dispatch-list">${home.map(member=>{const reason=readiness(member),queued=memberOrder(state,member.id).action==='adventure';return `<article>${portrait(member)}<div><h3>${esc(member.name)}</h3><p>${esc(reason||`${member.profession} · Level ${member.level}`)}</p></div><button type="button" class="${queued?'quiet':'primary'}" data-order="${queued?'rest':'adventure'}" data-member-id="${esc(member.id)}" ${reason?'disabled':''}>${queued?'Cancel':'Send out'}</button></article>`;}).join('')||'<p class="small">All companions are away. Recall someone or wait for their return.</p>'}</div><p class="small">Battle uses the printed character and creature profiles. Defeated companions are rescued with 1 HP; they can recover at home.</p></section>`;
}
function render(){
 if(!state)return;
 root.innerHTML=`<div class="game-shell"><header class="game-header"><a href="#guild" aria-label="Guild home">${esc(state.name)}</a><span class="beta-badge">BETA</span></header><div class="game-resources"><span>${journalClock(state.hours)}</span><strong>${state.gold} <small>gold</small></strong></div><main id="game-main" tabindex="-1">${tab==='guild'?guildView():tab==='adventures'?adventureView():guildMasterJournal(state,journalFilters)}</main><p class="game-message" data-game-message role="status">${esc(notice)}</p><div class="turn-dock"><div><strong>Turn ${state.management.turn+1}</strong><span>${state.members.length?'Orders are ready':'Recruit a companion to begin'}</span></div><button type="button" class="primary" data-advance ${busy||!state.members.length?'disabled':''}>${busy?'Resolving…':'Next turn · 4h'}</button></div><nav class="game-nav" aria-label="Game navigation">${[['guild','Guild'],['adventures','Adventures'],['journal','Journal']].map(([value,label])=>`<button type="button" data-tab="${value}" ${tab===value?'aria-current="page"':''}>${label}${value==='journal'&&state.management.turn?`<span>${state.management.turn}</span>`:''}</button>`).join('')}</nav></div>`;
 if(busy)root.querySelectorAll('button,select,input').forEach(element=>element.disabled=true);
 document.documentElement.dataset.appReady='true';
}
function modalMessage(text){const target=dialog.querySelector('[data-modal-message]');if(target)target.textContent=text;}
function openModal(value){modal=value;renderModal();if(!dialog.open)dialog.showModal();}
function renderModal(){
 if(!modal)return;
 let title='',body='';
 if(modal.type==='recruit'){
  const options=catalog.filter(item=>item.level===1);if(!options.some(item=>item.id===selectedTemplate))selectedTemplate=options[0].id;
  title=state.founderClaimed?'Recruit a companion':'Meet your first companion';
  body=`<p>${state.founderClaimed?`A new member costs ${RECRUIT_PRICE} gold.`:'Your first member joins for free.'} Every profession starts at level 1.</p><form data-hire><div class="recruit-options" role="group" aria-label="Choose profession">${options.map(item=>`<label class="recruit-option">${portrait(item)}<input type="radio" name="template" value="${esc(item.id)}" ${item.id===selectedTemplate?'checked':''}><strong>${esc(item.profession)}</strong><span>${item.hits} HP</span></label>`).join('')}</div><label class="text-field">Name <small>optional</small><input name="name" maxlength="40" placeholder="Give your companion a name" autocomplete="off"></label><button class="primary" type="submit" ${state.members.length>=GUILD_CAPACITY||state.founderClaimed&&state.gold<RECRUIT_PRICE?'disabled':''}>${state.founderClaimed?`Recruit · ${RECRUIT_PRICE} gold`:'Welcome to the guild'}</button></form>`;
 }else if(modal.type==='manage'){
  title='Manage guild';body=`<form data-rename-guild><label class="text-field">Guild name<input name="name" value="${esc(state.name)}" maxlength="40" required></label><button class="quiet" type="submit">Save name</button></form><h3>Companions · ${state.members.length}/${GUILD_CAPACITY}</h3><p class="small">Keep at least one companion. Away members must return before dismissal. Journal entries stay with the guild.</p>${state.members.map(member=>`<article class="manage-row"><form data-rename-member="${esc(member.id)}"><label class="text-field">Member name<input name="name" value="${esc(member.name)}" maxlength="40" required></label><button class="quiet" type="submit">Save name</button></form><button type="button" class="quiet danger" data-dismiss="${esc(member.id)}" ${!atGuild(state,member.id)||state.members.length<=1?'disabled':''}>Dismiss</button></article>`).join('')}<details class="beta-settings"><summary>About this beta</summary><p>This is one guild game. Adventures share the same companions, clock, gold, and journal. Progress stays in this browser. Nothing changes while you are away.</p><p>Turn orders are resolved together. Recall companions when you want them home. Rest is free. Defeat means a rescue, not permanent death.</p><button type="button" class="quiet danger" data-reset>Start a new guild</button></details>`;
 }else if(modal.type==='dismiss'){
  const member=state.members.find(item=>item.id===modal.id);title=`Dismiss ${member?.name||'member'}?`;body='<p>This removes the companion from your guild. Their previous journal entries remain. This cannot be undone.</p><div class="dialog-actions"><button type="button" class="quiet" data-manage>Keep member</button><button type="button" class="danger" data-confirm-dismiss>Dismiss member</button></div>';
 }else if(modal.type==='reset'){
  title='Start a new guild?';body='<p>Your current beta guild, progress, and journal will be deleted. You will choose a new first companion.</p><div class="dialog-actions"><button type="button" class="quiet" data-close-dialog>Keep my guild</button><button type="button" class="danger" data-confirm-reset>Start fresh</button></div>';
 }
 dialog.innerHTML=`<header class="dialog-heading"><h2 id="game-dialog-title">${esc(title)}</h2><button type="button" class="quiet" data-close-dialog aria-label="Close dialog">Close</button></header><p data-modal-message role="status"></p>${body}`;
}
function apply(action,message){commit(action());notify(message);render();if(dialog.open)renderModal();}
async function handleClick(event){
 if(busy)return;
 const button=event.target.closest('button');if(!button||button.disabled)return;
 try{
  if(button.hasAttribute('data-tab')){tab=button.dataset.tab;location.hash=tab;render();return;}
  if(button.hasAttribute('data-close-dialog')){dialog.close();return;}
  if(button.hasAttribute('data-recruit')){openModal({type:'recruit'});return;}
  if(button.hasAttribute('data-manage')){openModal({type:'manage'});return;}
  if(button.hasAttribute('data-equipment')){
   const group=button.closest('header'),caption=group.querySelector('[data-equipment-caption]'),expanded=button.getAttribute('aria-expanded')==='true';
   group.querySelectorAll('[data-equipment]').forEach(item=>item.setAttribute('aria-expanded','false'));
   button.setAttribute('aria-expanded',String(!expanded));caption.textContent=button.dataset.equipment;caption.hidden=expanded;return;
  }
  if(button.hasAttribute('data-feed')){apply(()=>careForMember(state,button.dataset.feed),'A good meal lifts their spirits.');return;}
  if(button.hasAttribute('data-order')){apply(()=>assignActivity(state,button.dataset.memberId,button.dataset.order),'Order set for the next turn.');return;}
  if(button.hasAttribute('data-dismiss')){openModal({type:'dismiss',id:button.dataset.dismiss});return;}
  if(button.hasAttribute('data-confirm-dismiss')){commit(dismissMember(state,modal.id));modal={type:'manage'};notify('Member dismissed. Their journal is kept.');render();renderModal();return;}
  if(button.hasAttribute('data-reset')){openModal({type:'reset'});return;}
  if(button.hasAttribute('data-confirm-reset')){commit(newGame(crypto.randomUUID()));dialog.close();tab='guild';notice='A fresh start.';render();return;}
  if(button.hasAttribute('data-journal-kind')){journalFilters.kind=button.dataset.journalKind;journalFilters.limit=5;render();return;}
  if(button.hasAttribute('data-journal-older')){journalFilters.limit+=5;render();return;}
  if(button.hasAttribute('data-journal-reset')){journalFilters={member:'all',kind:'all',limit:5};render();return;}
  if(button.hasAttribute('data-advance')){
   busy=true;notify('Your companions are taking their turn…');render();
   try{
    const before=JSON.stringify(state),saved=readBeta(localStorage,validGame);
    if(JSON.stringify(saved)!==before){if(saved)state=saved;throw new Error('The guild changed in another tab. Reload before continuing.');}
    const tables=state.members.some(member=>memberOrder(state,member.id).action==='adventure')?await loadGuildCombat():{};
    if(JSON.stringify(readBeta(localStorage,validGame))!==before)throw new Error('The guild changed in another tab. Reload to continue.');
    commit(advanceGame(state,opponents,tables));
    const results=state.management.reports[0].results,combats=results.filter(result=>result.encounter&&Object.hasOwn(result.encounter,'winner')).length;
    notice=`Turn ${state.management.turn} complete. ${combats?`${combats} battle${combats===1?'':'s'} resolved.`:'Your companions are doing well.'} See the journal for their stories.`;
   }finally{busy=false;render();}
   return;
  }
 }catch(error){notify(error.message);if(dialog.open)modalMessage(error.message);}
}
root.addEventListener('click',handleClick);dialog.addEventListener('click',handleClick);
dialog.addEventListener('close',()=>{modal=null;});
function handleSubmit(event){
 event.preventDefault();if(busy)return;const data=new FormData(event.target);
 try{
  if(event.target.matches('[data-hire]')){commit(hireMember(state,catalog.find(item=>item.id===data.get('template')),String(data.get('name')||'')));dialog.close();tab='guild';notice='Welcome home. Care for your companion and set orders on their card.';render();}
  if(event.target.matches('[data-rename-member]'))apply(()=>renameMember(state,event.target.dataset.renameMember,String(data.get('name'))),'Name saved.');
  if(event.target.matches('[data-rename-guild]'))apply(()=>renameGuild(state,String(data.get('name'))),'Guild name saved.');
 }catch(error){notify(error.message);if(dialog.open)modalMessage(error.message);}
}
root.addEventListener('submit',handleSubmit);
dialog.addEventListener('submit',handleSubmit);
root.addEventListener('change',event=>{if(event.target.matches('[data-journal-member]')){journalFilters.member=event.target.value;journalFilters.limit=5;render();}});
dialog.addEventListener('change',event=>{if(event.target.matches('[name="template"]'))selectedTemplate=event.target.value;});
window.addEventListener('hashchange',()=>{tab=['guild','adventures','journal'].includes(location.hash.slice(1))?location.hash.slice(1):'guild';render();});
window.addEventListener('storage',event=>{if(event.key!==betaSaveKey||busy)return;try{const saved=readBeta(localStorage,validGame);if(saved){state=saved;if(dialog.open)dialog.close();notice='Guild updated from another tab.';render();}}catch(error){notify(error.message);}});
try{
 ({catalog,opponents}=await loadGuildMasterData());state=readBeta(localStorage,validGame);if(!state)commit(newGame(crypto.randomUUID()));else commit(state);
 tab=['guild','adventures','journal'].includes(location.hash.slice(1))?location.hash.slice(1):'guild';render();
}catch(error){
 root.innerHTML=`<main class="game-loading"><h1>The guild doors are closed</h1><p>${esc(error.message)}</p><button type="button" data-retry>Try again</button><button type="button" class="quiet danger" data-recovery>Reset beta save</button></main>`;
 root.querySelector('[data-retry]').addEventListener('click',()=>location.reload());
 root.querySelector('[data-recovery]').addEventListener('click',()=>{if(window.confirm('Delete this beta save and start a new guild?')){localStorage.removeItem(betaSaveKey);location.reload();}});
}
