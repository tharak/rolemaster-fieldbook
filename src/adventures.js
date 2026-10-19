import {generateWorld} from './adventure-rules.js';
import {adventureMap} from './adventure-map.js';
import {loadGuildData,loadGuildCombat} from './guild-data.js';
import {guildMemberCard} from './guild-member-view.js';
import {writeGuild,readGuild} from './guild-store.js';
import {newGuild,recruitMember,equipMember,restGuild,departGuild,returnGuild,continueGuild,validGuild,availableMember,atBase} from './guild-rules.js';
import {equipmentIcon} from './equipment-art.js';
import {esc} from './dom.js';
const root=document.querySelector('#adventure-app'),dialog=document.querySelector('#adventure-encounter-dialog'),content=document.querySelector('#adventure-encounter-content');
const key='rolemaster-guild-v1';let state,catalog=[],lists=[],tables=null,busy=false,notice='',selected=new Set(),selection=null,shownReport=null,loadFailed=false,storageInvalid=false;
function save(next){writeGuild(next,'adventures');state=next;}
function message(text){notice=text;const el=root.querySelector('[data-guild-message]');if(el)el.textContent=text;document.querySelector('#adventure-fight-message').textContent=text;}
async function load(){
 try{({catalog,lists}=await loadGuildData());
  const raw=localStorage.getItem(key);if(raw){try{state=readGuild();if(!validGuild(state))throw new Error();}catch{storageInvalid=true;throw new Error('The guild save could not be read. Export it before starting a new guild.');}}
  else save(newGuild(catalog));
  selected=new Set(state.members.filter(availableMember).slice(0,4).map(m=>m.id));loadFailed=false;root.dataset.ready='true';render();
 }catch(error){loadFailed=true;root.innerHTML=`<h1 id="adventure-title">The Wayfarers’ Guild</h1><p role="alert">${esc(error.message)}</p>${storageInvalid?'<button class="button" data-action="export">Export saved guild</button>':'<button class="button" data-action="retry">Retry loading</button>'}`;}
}
function memberCard(member){
 const ready=availableMember(member)&&atBase(state,member.id);
 return guildMemberCard(state,member,lists,{controls:!state.expedition?`<label class="adventure-party-choice"><input name="guild-party" type="checkbox" value="${esc(member.id)}" ${selected.has(member.id)&&ready?'checked':''} ${ready?'':'disabled'}> Send on next adventure</label>`:''});
}

function reportMarkup(report){
 if(!report)return '<p>No encounter report yet.</p>';
 return `<p class="adventure-eyebrow">Stage ${report.stage} · ${esc(report.location)}</p><h3>${esc(report.conclusion)}</h3><p>${esc(report.encounter.label)} · T-5.1 ${esc(report.encounter.cell)}</p>${report.enemies?`<p>Opponents: ${report.enemies.map(e=>esc(e.name)).join(', ')}</p>`:''}<div class="guild-rewards"><strong>${Object.values(report.xp).reduce((a,b)=>a+b,0)} XP gained</strong><strong>${report.gold} gold</strong><span>${report.items.length?report.items.map(i=>equipmentIcon(i.name)+esc(i.name)).join(' · '):'No items dropped'}</span></div>${Object.entries(report.xp).length?`<ul>${Object.entries(report.xp).map(([id,xp])=>`<li>${esc(state.members.find(m=>m.id===id)?.name||id)}: +${xp} XP (recorded)</li>`).join('')}</ul>`:''}<p>${state.expedition?'Loot is carried by the party until it returns to base.':'Expedition loot has been moved to the guild store.'}</p>${report.party?`<ul class="guild-party-result">${report.party.map(m=>`<li>${esc(m.name)}: ${m.dead?'Dead':`${m.hp}/${m.maxHp} HP · ${m.pp} PP`}</li>`).join('')}</ul>`:''}<div class="guild-rounds">${report.rounds.map(r=>`<details ${r.round===report.rounds.length?'open':''}><summary>Round ${r.round} · ${r.events.length} actions</summary><ol>${r.events.map(e=>`<li>${esc(e.text)}</li>`).join('')}</ol></details>`).join('')||(report.archivedRounds?`<p>${report.archivedRounds} rounds archived. The conclusion and rewards are retained.</p>`:'<p>No combat this stage.</p>')}</div>${state.expedition?'<div class="guild-actions"><button class="button button-dark" data-action="continue">Continue adventure</button><button class="button button-quiet" data-action="return">Return to base</button></div>':''}`;
}
function render(){
 if(!state||loadFailed)return;
 const exp=state.expedition,last=exp||state.history[0],world=generateWorld(exp?.seed||'guild-western-roads');
 root.innerHTML=`<header class="adventure-heading"><div><p class="adventure-eyebrow">A hearth to return to. Roads to discover.</p><h1 id="adventure-title">The Wayfarers’ Guild</h1><p>Gather a party, choose an adventure level, and decide how far to go.</p></div><button class="button button-quiet" data-action="recruit-focus">Recruit member</button></header><div class="adventure-topline"><span>${state.members.length} guild members · ${state.gold} gold in store</span><span>${exp?`Level ${exp.level} expedition · Stage ${exp.stage} · ${exp.hours} hours away`:'The party is at base'}</span></div><div class="adventure-layout"><div class="adventure-map-panel"><div class="adventure-map-toolbar"><span>${exp?'The fellowship’s road':'The roads beyond the guild'}</span><small>${exp?esc(exp.seed):'Choose your adventure level'}</small></div>${adventureMap(world,exp,selection||exp?.goal||world.goal)}<details class="adventure-journal" open><summary>Journey journal</summary>${last?.reports.length?`<ol>${last.reports.map(r=>`<li><small>Stage ${r.stage} · ${esc(r.location)}</small><p>${esc(r.conclusion)}</p><button class="button button-quiet" data-action="report" data-report="${esc(r.id)}">View rounds & rewards</button></li>`).join('')}</ol>`:'<p>Send a party to begin. Each stage ends with a report and your next decision.</p>'}</details></div><aside class="adventure-sidebar">${exp?`<p class="adventure-eyebrow">Party on expedition</p><h2>Level ${exp.level} adventure</h2><ul class="adventure-fellowship">${exp.party.map(id=>{const m=state.members.find(m=>m.id===id);return `<li>${esc(m.name)}<small>${m.dead?'Dead':`${Math.max(0,m.hits-m.damage)}/${m.hits} HP · ${m.pp} PP`}</small></li>`;}).join('')}</ul><p>Carrying ${exp.gold} gold and ${exp.items.length} items.</p><button class="button button-dark" data-action="continue" ${exp.stage>=50?'disabled':''}>Continue adventure</button><button class="button button-quiet" data-action="return">Return to base</button><p>Encounters are rolled and fought automatically. You decide after each stage.</p>`:`<form id="guild-depart"><p class="adventure-eyebrow">The next expedition</p><h2>Send a party</h2><label>Adventure level<input name="level" type="number" min="1" max="20" value="1" required></label><label>World seed<input name="seed" maxlength="60" value="guild-western-roads" required></label><p>Select 1–6 ready members below. Opponents use the nearest printed T-5.8 level.</p><button class="button button-dark" type="submit">Send party</button></form>`}<hr><h3>Guild infirmary</h3><p>Members at base can rest and change equipment. Members on expedition keep their current wounds and power points.</p><button class="button button-quiet" data-action="rest">Rest at base · 24 hours</button><p>At base: +24 HP, restore PP, treat bleeding, reduce lasting injury penalties by 5. The dead cannot be healed by rest.</p><details><summary>Guild store · ${state.inventory.length} items</summary><ul>${state.inventory.map(i=>`<li>${equipmentIcon(i.name)}${esc(i.name)}</li>`).join('')}</ul></details></aside></div><p data-guild-message class="adventure-notice" role="status">${esc(notice)}</p><section class="guild-roster"><h2>Guild members</h2><form id="guild-recruit"><label>Recruit from Master Character Table T-5.8<select name="template">${catalog.map(c=>`<option value="${esc(c.id)}">${esc(c.name)} · ${c.hits} HP · ${c.ppMax} PP · ${c.spellRanks} spell ranks</option>`).join('')}</select></label><button class="button button-dark" type="submit" ${state.members.length>=24?'disabled':''}>Recruit</button></form><div class="guild-members">${state.members.map(memberCard).join('')}</div></section><details class="adventure-notes"><summary>Guild campaign rules</summary><p>Free recruitment for this prototype. Character stats and total spell ranks come from T-5.8; named spell lists are guild presets. XP is recorded separately from the original character sheets; level-up advancement is not yet automated.</p><p>T-5.1 rolls an encounter each four-hour stage. Sightings and basic encounters are peaceful; hostile results simulate a whole-party battle using T-5.8 opponents at the nearest printed level (ties are random). Species, party size, routes and loot are campaign choices. Victories award 1–2×adventure-level gold (minimum 1), with a 35% chance of equipment; weapon drops have a 20% chance of a +5 bonus. Rewards are recorded once. The latest 400 combat rounds are retained; older reports keep their conclusions and rewards.</p><p>Guild combat assumes everyone is in range, no movement or tactical parrying, and two preparation rounds followed by a successful cast for supported spells. Hostile spells use basic attack and resistance rolls, with unknown stat RR bonuses treated as zero; known utility spells are reference-only. Core attack/critical tables resolve weapons and bolts. Battles end after 80 rounds if undecided. Mortal wounds are fatal; survivors of defeats are recovered to base.</p><p>Printed DB already includes a marked shield: it is removed when unequipped or using a two-handed weapon. Armor heavier than the template incurs a campaign −5 OB per extra AT. Infirmary recovery and safe return are campaign abstractions: rest heals 1 HP/hour (unknown Co bonus = 0), restores PP after 8 hours and treats ongoing wounds. Existing saved character sheets and earlier journeys are retained separately.</p></details>`;
 if(dialog.open)content.innerHTML=reportMarkup(findReport(shownReport));
 setBusy(busy);
}
function findReport(id){return [state.expedition,...state.history].filter(Boolean).flatMap(e=>e.reports).find(r=>r.id===id);}
function openReport(report){shownReport=report.id;content.innerHTML=reportMarkup(report);document.querySelector('#adventure-fight-message').textContent='';if(!dialog.open)dialog.showModal();}
function setBusy(value){busy=value;for(const b of document.querySelectorAll('#adventure-app button, #adventure-encounter-content button')){if(value){b.dataset.wasDisabled=String(b.disabled);b.disabled=true;}else if(b.dataset.wasDisabled!==undefined){b.disabled=b.dataset.wasDisabled==='true';delete b.dataset.wasDisabled;}}}
async function loadCombat(){tables=await loadGuildCombat();}

async function click(event){
 const button=event.target.closest('[data-action]');if(!button||busy)return;
 try{switch(button.dataset.action){
 case 'retry':await load();break;
 case 'export':{const blob=new Blob([localStorage.getItem(key)||''],{type:'application/json'}),link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='guild-save.json';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);break;}
 case 'recruit-focus':root.querySelector('#guild-recruit').scrollIntoView({behavior:'smooth'});root.querySelector('[name="template"]').focus({preventScroll:true});break;
 case 'rest':save(restGuild(state));notice='Members at base rested for 24 hours.';render();break;
 case 'return':save(returnGuild(state));dialog.close();notice='The party returned. Loot is in the guild store; wounds and XP are retained.';render();break;
 case 'report':openReport(findReport(button.dataset.report));break;
 case 'continue':{
  setBusy(true);message('Simulating the next stage…');await loadCombat();
  const next=continueGuild(state,catalog,tables);save(next);notice='Stage complete. Review the report before continuing.';setBusy(false);render();openReport((state.expedition||state.history[0]).reports[0]);break;
 }
 }}catch(error){setBusy(false);message(error.message);}
}
root.addEventListener('click',click);content.addEventListener('click',click);
root.addEventListener('change',event=>{try{
 if(event.target.name==='guild-party'){event.target.checked?selected.add(event.target.value):selected.delete(event.target.value);}
 if(event.target.dataset.equipment){save(equipMember(state,event.target.dataset.memberId,event.target.value,event.target.dataset.equipment));notice='Equipment updated.';render();}
}catch(error){message(error.message);}});
root.addEventListener('submit',event=>{event.preventDefault();if(busy)return;try{
 const data=new FormData(event.target);
 if(event.target.id==='guild-recruit'){save(recruitMember(state,catalog.find(c=>c.id===data.get('template'))));notice='A new member joined the guild.';}
 if(event.target.id==='guild-depart'){save(departGuild(state,{party:[...selected].filter(id=>state.members.some(m=>m.id===id&&availableMember(m)&&atBase(state,id))),level:Number(data.get('level')),seed:String(data.get('seed')).trim(),id:crypto.randomUUID()}));notice='The party has departed. Continue to simulate its first stage.';selection=null;}
 render();
}catch(error){message(error.message);}});
root.addEventListener('click',event=>{const node=event.target.closest('[data-map-node]');if(node){selection=node.dataset.mapNode;render();}});
root.addEventListener('keydown',event=>{if(event.target.matches('[data-map-node]')&&['Enter',' '].includes(event.key)){event.preventDefault();event.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
document.querySelector('#adventure-close-encounter').addEventListener('click',()=>dialog.close());
window.addEventListener('rolemaster-view-changed',event=>{if(event.detail!=='adventure'&&dialog.open)dialog.close();});
window.addEventListener('rolemaster-guild-updated',event=>{if(event.detail.source==='adventures'||!state)return;state=event.detail.state;render();});
window.addEventListener('storage',event=>{if(event.key!==key||!state)return;try{const latest=readGuild();if(latest){state=latest;render();}}catch(error){message(error.message);}});
await load();
