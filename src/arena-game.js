import {ludusConfig as C} from './ludus-config.js';
import {upgradeBuilding,promoteLudus,castLudusSpell,selectBlessing,spellById,roundsPerMinute,blessingQuote} from './ludus-rules.js';
import {ludusPage,serviceDialog,blessingPanel} from './ludus-ui.js';
import {mountArenaPlayback} from './arena-playback.js?v=20261019-buildings-2';
import {loadGuildMasterData,loadGuildCombat} from './guild-data.js';
import {arenaSaveKey,newArena,recruitArena,generateOffers,fightArena,restArena,readArena,saveArena,injuryPenalty,difficulty,canFight,readyLineup,setLineup} from './arena-rules.js?v=20261019-buildings-2';
import {renameMember} from './guild-game-rules.js';
import {statBar,memberEquipment} from './guild-ui.js';
import {creatureProfile} from './coliseum-battle.js';
import {formatCriticalEffect} from './critical-presentation.js';
import {esc} from './dom.js';
const root=document.querySelector('#game-app'),dialog=document.querySelector('#game-dialog');
let stopPlayback=null;
let state,catalog,opponents,busy=false,notice='',view=null,back=[],opener=null;
const portrait=m=>`<svg class="pet-portrait" viewBox="0 0 96 80" aria-hidden="true"><use href="assets/coliseum/creatures.svg#${creatureProfile(m)}"></use></svg>`;
function commit(next){saveArena(localStorage,next,state);state=next;}
const outcome=r=>r.winner===0?'Victory':r.winner===1?'Defeat':'Draw';
function openDialog(title,body){stopPlayback?.();stopPlayback=null;dialog.classList.remove('arena-battle-dialog');if(!dialog.open)opener=document.activeElement;dialog.innerHTML=`<header class="dialog-heading"><button data-back aria-label="Back">Back</button><h2 id="game-dialog-title">${esc(title)}</h2><button data-close-dialog aria-label="Close dialog">Close</button></header><div data-modal-message role="status">${esc(notice)}</div><div class="dialog-content">${body}</div>`;if(!dialog.open)dialog.showModal();dialog.querySelector('[data-back]').focus();}
const buildings=[['coliseum','Coliseum'],['roster','Barracks'],['concussion','Infirmary'],['nerve','Nerve Law'],['protections','Protections'],['hall','Ludus Hall']];
function navigate(id,remember=true){if(remember&&view&&view!==id)back.push(view);view=id;refreshDialog();}
function refreshDialog(){
 if(!view)return;
 if(view==='recruit')return recruit();
 if(view.startsWith('spell:')){const spell=spellById(view.slice(6));return openDialog(spell.name,serviceDialog(state,spell));}
 if(view.startsWith('member:')){const m=state.members.find(m=>m.id===view.slice(7));return openDialog(m.name,`${portrait(m)}<p>${esc(m.profession)} · Level ${m.level} · ${m.xp} XP</p>${memberEquipment(m)}${statBar('HP',m.hits-m.damage,m.hits)}${m.ppMax?statBar('PP',m.pp,m.ppMax):''}${injuryList(m)}<button data-rename="${esc(m.id)}">Rename</button>`);}
 if(view.startsWith('rename:')){const m=state.members.find(m=>m.id===view.slice(7));return openDialog('Rename fighter',`<form data-rename-form="${esc(m.id)}"><label>Name<input name="name" maxlength="40" required value="${esc(m.name)}"></label><button class="primary">Save name</button></form>`);}
 if(view==='reset')return openDialog('Start fresh?',`<p>This deletes your current arena roster, gold, injuries, and battle records.</p><button class="danger" data-confirm-reset>Start a new arena company</button>`);
 const title=buildings.find(([id])=>id===view)?.[1]||'Settings';
 const hall=()=>{return ludusPage(state,'hall')+`<div class="building-records"><section class="arena-history"><h2>Battle history</h2>${state.arena.reports.map(r=>`<button data-report="${r.id}">${esc(r.name)} · ${outcome(r)}</button>`).join('')||'<p>No battles yet.</p>'}</section><h2>Memorial</h2>${(state.arena.fallen||[]).map(m=>`<p>${esc(m.name)} · ${esc(m.death.description)}</p>`).join('')||'<p>No fallen fighters.</p>'}</div>`;};
 openDialog(title,view==='coliseum'?arena():view==='roster'?roster():view==='hall'?hall():view==='settings'?`<details><summary>Help and arena rules</summary><p>Select your saved lineup in Barracks, then open Coliseum and tap Fight. Unavailable fighters sit out. Victory awards gold and XP once. Rest treats ordinary wounds; permanent injuries need appropriate magic. Death is permanent.</p><p>Progress is saved on this device. Creature special abilities and swarms are not simulated.</p></details><button data-reset>Start a new arena company</button>`:(view==='concussion'?`<button class="building-action building-rest" data-rest><span class="action-kind">Recovery</span><strong>Rest ${C.time.restDays} day(s)</strong><span>Free · restore HP and PP</span></button><details><summary>About rest</summary><p>Rest restores ${Math.round(C.time.restHpFraction*100)}% maximum HP and shared PP and advances injury recovery. Permanent disabilities require magic.</p></details>`:'')+ludusPage(state,view)+(view==='protections'?`<details class="building-about"><summary>Selected blessings</summary>${blessingPanel(state,readyLineup(state).map(m=>m.id))}</details>`:''));
}
function injuryList(member){return member.injuries.length?`<details class="arena-wounds" open><summary>${member.injuries.length} lasting injuries · −${injuryPenalty(member)} combat modifier</summary>${member.injuries.map(i=>`<p>${esc(i.description)}<br><strong>${esc(i.label||'Ordinary wound')} · ${i.recoveryUntil?'Recovering · '+Math.ceil((i.recoveryUntil-state.ludus.clock)/roundsPerMinute())+' minutes left':i.suppressed?'Paralysis suppressed · '+Math.ceil((i.suppressedUntil-state.ludus.clock)/roundsPerMinute())+' minutes left':i.disabling?'Cannot fight':i.permanent?'Requires treatment':i.days+' treatment days remaining'}</strong></p>`).join('')}<button class="quiet" data-tab="ludus">Visit Ludus healing buildings</button></details>`:'<p class="small">No lasting injuries</p>';}
function roster(){return `<p>Choose your saved lineup. Unavailable fighters keep their selection and sit out.</p><div class="arena-party">${state.members.map(m=>`<article><label class="arena-fighter"><input type="checkbox" data-fighter="${esc(m.id)}" ${state.arena.lineup.includes(m.id)?'checked':''}>${portrait(m)}<span><strong>${esc(m.name)}</strong><span>${esc(m.profession)} · ${m.hits-m.damage}/${m.hits} HP${canFight(m)?'':' · Unavailable'}</span></span></label><button data-member="${esc(m.id)}">Fighter details</button></article>`).join('')}</div><button class="recruit-tile" data-recruit ${state.members.length>=6?'disabled':''}>Recruit a fighter · ${state.founderClaimed?'12 gold':'first one free'} <span>${state.members.length}/6 places</span></button>`;}
function arena(){
 const chosen=readyLineup(state),q=blessingQuote(state,chosen.map(m=>m.id)),unavailable=state.members.filter(m=>state.arena.lineup.includes(m.id)&&!canFight(m));
 return `<div class="lineup-summary"><p><strong>Ready:</strong> ${chosen.map(m=>esc(m.name)).join(', ')||'No fighters'}</p>${unavailable.length?`<p>Unavailable: ${unavailable.map(m=>esc(m.name)).join(', ')}</p>`:''}<p>Blessings: ${q.gold} gold · ${q.pp} PP</p><div class="lineup-links"><button data-tab="roster">Barracks</button><button data-tab="protections">Protections</button><button data-generate aria-label="Generate new opponents for free">↻ Free</button></div>${!chosen.length?'<p>Select or recruit in Barracks, or visit the <button data-tab="concussion">Infirmary</button>.</p>':''}</div><div class="arena-offers">${state.arena.offers.map(o=>`<article class="arena-offer"><div class="offer-title"><div class="enemy-portraits">${o.enemies.slice(0,2).map(portrait).join('')}</div><div><h3>${esc(o.name)}</h3><small>${o.enemies.length} enemies · ${esc(difficulty(o,chosen))}</small></div></div><div class="offer-actions"><span>${o.gold} gold · ${o.xp} XP</span><button class="primary" data-fight="${o.id}" ${!chosen.length||busy?'disabled':''}>Fight</button></div><details><summary>Details</summary><p>${esc(o.description)} XP per surviving fighter on victory.</p>${o.enemies.map(e=>`<p>${esc(e.name)} · Level ${e.level} · ${e.hits} HP · AT ${e.armor_type} · DB ${e.db}<br>${e.attacks.filter(a=>a&&!a.both&&a.chance>0).map(a=>`${esc(a.name)} OB ${a.ob}`).join(' / ')}</p>`).join('')}</details></article>`).join('')}</div>`;
}
function render(){
 root.innerHTML=`<div class="game-shell arena-shell"><header class="game-header"><a href="#ludus">Wayfarers’ Ludus</a><button data-tab="settings" aria-label="Settings">⚙</button></header><div class="game-resources"><strong>${state.gold} gold</strong><span>Day ${state.arena.day}</span><span aria-label="Ludus level ${state.ludus.level}">Lv ${state.ludus.level}</span><span>${state.ludus.pp}/${state.ludus.ppMax} PP</span></div><main id="game-main" class="courtyard"><svg viewBox="0 0 600 700" preserveAspectRatio="none" aria-hidden="true"><defs><pattern id="stone" width="40" height="28" patternUnits="userSpaceOnUse"><rect width="40" height="28" fill="#a69673"/><path d="M0 0H40V28H0Z M20 0V14 M0 14H40" fill="none" stroke="#786e56"/></pattern><pattern id="grass" width="25" height="25" patternUnits="userSpaceOnUse"><rect width="25" height="25" fill="#455b38"/><path d="M4 18l2-5 3 6 M18 7l2-4" stroke="#607747" fill="none"/></pattern></defs><rect width="600" height="700" fill="url(#grass)"/><path d="M270 0H330V700H270Z M0 110H600V160H0Z M0 340H600V390H0Z M0 570H600V620H0Z" fill="url(#stone)"/><circle cx="300" cy="365" r="65" fill="#c1ae84" stroke="#75674d" stroke-width="12"/><circle cx="300" cy="365" r="40" fill="#56827a" stroke="#dfc99a" stroke-width="8"/>${[[35,35],[535,35],[35,650],[535,650],[50,300],[530,450]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="25" fill="#2c492f" stroke="#73834d" stroke-width="6"/>`).join('')}</svg><div class="courtyard-buildings">${buildings.map(([id,label],i)=>`<button class="courtyard-building building-${id}" data-tab="${id}"><svg viewBox="0 0 150 90" aria-hidden="true"><rect x="12" y="20" width="126" height="62" rx="${i===0?25:3}" fill="#9e937c" stroke="#352e27" stroke-width="4"/><path d="M8 24L75 3 142 24Z" fill="${i===0?'#c1af87':'#89604d'}" stroke="#46382d" stroke-width="4"/><path d="M25 30V70 M48 30V70 M102 30V70 M125 30V70" stroke="#d1c6a8" stroke-width="8"/><path d="M62 82V50Q75 32 88 50V82" fill="#342e28"/></svg><span>${label}</span></button>`).join('')}</div><p class="courtyard-caption">Your school. Your champions.</p></main><p class="game-message" data-message role="status">${esc(notice)}</p></div>`;
 document.documentElement.dataset.appReady='true';
}
const criticalType=code=>({'A-10.10.1':'Cold','A-10.10.2':'Heat','A-10.10.3':'Crush','A-10.10.4':'Puncture','A-10.10.5':'Slash','A-10.10.6':'Unbalancing','A-10.10.7':'Large creature','A-10.10.8':'Super-large creature','A-10.10.9':'Spells against creatures'}[code]||code);
function watchBattle(id){
 const report=state.arena.reports.find(r=>r.id===id);
 if(!report?.playback)return showReport(id);
 view=null;back=[];openDialog(report.name,'<div data-playback-root></div>');dialog.classList.add('arena-battle-dialog');dialog.scrollTop=0;
 stopPlayback=mountArenaPlayback(dialog.querySelector('[data-playback-root]'),report,()=>showReport(id));
}
function showReport(id){
 const r=state.arena.reports.find(r=>r.id===id);if(!r)return;
 view=null;back=[];openDialog(`${outcome(r)} · ${r.name}`,`<div class="arena-result">${r.playback?`<button class="quiet" data-replay="${r.id}">Watch battle again</button>`:''}<p class="arena-prize">${r.winner===0?`+${r.gold} gold to your company`:'No gold or XP awarded'}</p>${r.rewards.map(m=>`<p><strong>${esc(m.name)}</strong> · +${m.xp} XP${m.dead?' · Dead — lost from roster':m.rescued?' · Knocked out; recovered with 1 HP':''}${m.level>m.previousLevel?` · Reached level ${m.level}!`:''}</p>`).join('')}${r.ludusXp?`<p>Ludus +${r.ludusXp} XP</p>`:''}${r.services?.length?`<h3>Ludus preparations</h3>${r.services.map(s=>`<p>${esc(s.name)} · ${esc(s.description)}</p>`).join('')}`:''}<h3>Critical moments · ${r.criticals.length}</h3>${r.criticals.length?r.criticals.map(c=>`<article class="arena-critical ${c.suffered?'suffered':''}"><p class="eyebrow">Round ${c.round} · ${esc(c.attacker)} → ${esc(c.defender)}</p><header><strong>${esc(c.severity)} ${esc(criticalType(c.code))} critical</strong><span>Roll ${c.roll}</span></header><p class="critical-description">${esc(c.description)}</p><div>${formatCriticalEffect(c.effect,false,c.description)}</div>${c.conditional?'<p class="small">Some equipment conditions could not be resolved automatically.</p>':''}${c.manualEffects?.length?`<p class="small">${esc(c.manualEffects.join(' '))}</p>`:''}${c.recoils?.length?'<p class="small">Recoil movement is descriptive; positioning is not simulated.</p>':''}</article>`).join(''):'<p>No criticals landed in this fight.</p>'}${r.injuries.length?`<h3>Lasting injuries</h3>${r.injuries.map(w=>`<p><strong>${esc(w.name)} · ${w.permanent?`${esc(w.label)} — requires ${esc(w.treatment)}`:`−${w.penalty} for ${w.days} treatment days`}</strong><br>${esc(w.description)}</p>`).join('')}<p class="small">These are injuries recorded at the end of this battle. Barracks shows remaining treatment today.</p>`:''}<details class="arena-rounds"><summary>Full combat log · ${r.rounds.length} rounds</summary>${r.rounds.map(round=>`<details><summary>Round ${round.round}</summary><ol>${round.events.map(e=>`<li>${esc(e.text)}</li>`).join('')}</ol></details>`).join('')}</details></div>`);
}
function recruit(){openDialog('Recruit a fighter',`<p>${state.founderClaimed?'12 gold':'Your first fighter is free'} · All professions start at level 1.</p><form data-hire><label>Profession<select name="template">${catalog.filter(c=>c.level===1).map(c=>`<option value="${esc(c.id)}">${esc(c.profession)} · ${c.hits} HP</option>`).join('')}</select></label><label>Name (optional)<input name="name" maxlength="40" autocomplete="off"></label><button class="primary" ${state.founderClaimed&&state.gold<12?'disabled':''}>Recruit</button></form>`);}
function errorMessage(error){notice=error.message;if(state)render();dialog.querySelectorAll('[data-busy-disabled]').forEach(el=>{el.disabled=false;delete el.dataset.busyDisabled;});const target=dialog.querySelector('[data-modal-message]');if(dialog.open&&target)target.textContent=notice;}
async function click(event){
 const b=event.target.closest('button');if(!b||busy||b.closest('[data-arena-playback]')||(b.closest('form')&&b.type==='submit'))return;
 try{
  if(b.hasAttribute('data-close-dialog'))return dialog.close();
  if(b.hasAttribute('data-back')){if(back.length){view=back.pop();refreshDialog();}else dialog.close();return;}
  if(b.dataset.tab){navigate(b.dataset.tab==='ludus'?'concussion':b.dataset.tab);return;}
  if(b.dataset.member)return navigate('member:'+b.dataset.member);
  if(b.hasAttribute('data-recruit'))return navigate('recruit');
  if(b.dataset.report)return showReport(b.dataset.report);
  if(b.dataset.replay)return watchBattle(b.dataset.replay);
  if(b.dataset.rename)return navigate('rename:'+b.dataset.rename);
  if(b.hasAttribute('data-generate')){commit(generateOffers(state,opponents));notice=`${C.arena.offerCount} new matchups are ready.`;}
  if(b.dataset.upgradeBuilding){commit(upgradeBuilding(state,b.dataset.upgradeBuilding));notice='Building rank increased.';}
  if(b.hasAttribute('data-promote-ludus')){commit(promoteLudus(state));notice='The Ludus has been promoted.';}
  if(b.dataset.ludusSpell)return navigate('spell:'+b.dataset.ludusSpell);
  if(b.dataset.clearBlessing){commit(selectBlessing(state,b.dataset.clearBlessing,''));notice='Blessing selection cleared.';}
  if(b.hasAttribute('data-rest')){commit(restArena(state));notice='Rest completed; Ludus PP recovered and recovery advanced.';}
  if(b.hasAttribute('data-reset'))return navigate('reset');
  if(b.hasAttribute('data-confirm-reset')){commit(newArena(crypto.randomUUID(),opponents));dialog.close();notice='A fresh arena company awaits.';}
  if(b.hasAttribute('data-fight')){
   busy=true;dialog.querySelectorAll('button:not(:disabled)').forEach(el=>{el.dataset.busyDisabled='true';el.disabled=true;});dialog.querySelector('[data-modal-message]').textContent='Resolving battle…';
   try{const tables=await loadGuildCombat();const id=b.dataset.fight;commit(fightArena(state,id,readyLineup(state).map(m=>m.id),catalog,tables,opponents));notice='Battle saved. Rewards have been applied once.';watchBattle(id);}finally{busy=false;}
  }
  render();if(dialog.open&&!b.hasAttribute('data-fight'))refreshDialog();
 }catch(error){busy=false;errorMessage(error);}
}
dialog.addEventListener('keydown',event=>{
 if(event.key!=='Tab')return;
 const focusable=[...dialog.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled):not([type="hidden"]),select:not(:disabled),summary,[tabindex="0"]')].filter(el=>el.getClientRects().length);
 const first=focusable[0],last=focusable.at(-1);
 if(!first){event.preventDefault();return;}
 if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
 else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
});
dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
dialog.addEventListener('close',()=>{stopPlayback?.();stopPlayback=null;dialog.classList.remove('arena-battle-dialog');view=null;back=[];history.replaceState(null,'','#ludus');render();root.querySelector(`[data-tab="${opener?.dataset?.tab||'coliseum'}"]`)?.focus();});
root.addEventListener('click',click);dialog.addEventListener('click',click);
dialog.addEventListener('change',event=>{const id=event.target.dataset.fighter;if(id&&!busy){try{commit(setLineup(state,event.target.checked?[...state.arena.lineup,id]:state.arena.lineup.filter(p=>p!==id)));}catch(error){event.target.checked=!event.target.checked;errorMessage(error);}}});
dialog.addEventListener('submit',async event=>{event.preventDefault();if(busy)return;try{const form=event.target,data=new FormData(form);if(form.matches('[data-ludus-service]')){
 const id=String(data.get('spellId')),target=String(data.get('targetId')),choice=data.get('choice'),spell=spellById(id);
 if(spell.kind==='blessing'){commit(selectBlessing(state,target,id,choice));notice='Blessing selected; gold and PP are paid when battle starts.';}
 else {busy=true;form.querySelector('button').disabled=true;const tables=await loadGuildCombat();commit(castLudusSpell(state,id,target,{injuryId:data.get('injuryId'),injuryIds:data.getAll('injuryId'),choice,minutes:Number(data.get('minutes'))},tables));notice=state.ludus.history[0].description;busy=false;}
 }else if(form.matches('[data-hire]')){commit(recruitArena(state,catalog.find(c=>c.id===data.get('template')),String(data.get('name')||'')));notice=state.members.length===1&&state.arena.lineup.length?'Your fighter is ready.':'Recruited. Select this fighter to add them to your lineup.';}else if(form.dataset.renameForm){commit(renameMember(state,form.dataset.renameForm,String(data.get('name'))));}view=back.pop()||'roster';render();refreshDialog();}catch(error){busy=false;errorMessage(error);const submit=dialog.querySelector('[data-ludus-service] button');if(submit)submit.disabled=false;}});
window.addEventListener('storage',event=>{if(event.key===arenaSaveKey&&!busy){try{state=readArena(localStorage);if(!state)return location.reload();dialog.close();notice='Company updated from another tab.';render();}catch(error){errorMessage(error);}}});
function route(){if(['#coliseum','#roster'].includes(location.hash))navigate(location.hash.slice(1),false);else if(dialog.open)dialog.close();}
window.addEventListener('hashchange',()=>{if(state)route();});
try{
 ({catalog,opponents}=await loadGuildMasterData());state=readArena(localStorage);if(!state)commit(newArena(crypto.randomUUID(),opponents));
 render();route();
}catch(error){root.innerHTML=`<main class="game-loading"><h1>The arena could not open</h1><p>${esc(error.message)}</p><button data-retry>Retry</button><button data-recovery>Reset arena save</button></main>`;root.querySelector('[data-retry]').onclick=()=>location.reload();root.querySelector('[data-recovery]').onclick=()=>{if(confirm('Delete the arena save and start fresh?')){localStorage.removeItem(arenaSaveKey);location.reload();}};}
