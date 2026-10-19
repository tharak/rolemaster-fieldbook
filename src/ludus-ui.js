import {esc} from './dom.js';
import {ludusConfig as C} from './ludus-config.js';
import {nextPromotion,servicePrice,spellPp,spellRequirement,spellById,roundsPerMinute,blessingQuote} from './ludus-rules.js';

export function spellDescription(s){
 switch(s.kind){
  case 'diagnose':return 'Diagnose nerve injuries and the treatment they require. Diagnosis does not repair damage.';
  case 'nerveRepair':return `${s.maxPenalty===undefined?'Repair one damaged nerve; totally destroyed nerves cannot be restored.':`Repair one minor nerve injury with a penalty up to −${s.maxPenalty}.`} Recovery: ${s.recoveryDays} day(s).`;
  case 'preserve':return `Preserve one severed limb for ${s.durationDaysPerLevel} day(s) per level. Also requires ${s.prerequisites.join(', ')}.`;
  case 'unparalysis':return `Suppress one paralysis condition for ${s.durationMinutesPerLevel} minutes per level. Does not repair the underlying injury.`;
  case 'heal':return `Heal ${s.dice.join('d')} concussion hits. Does not repair structural wounds.`;
  case 'burn':return `Treat burn/frostbite areas with a total severity cost up to ${s.capacity}: ${Object.entries(s.degreeCosts).map(([degree,cost])=>`degree ${degree} costs ${cost}`).join('; ')}.`;
  case 'irritation':return 'Heal one minor irritation, such as a headache, toothache, or bee sting.';
  case 'stun':return `Remove ${s.rounds} round of accumulated stun.`;
  case 'regenerate':return `Heal ${s.hitsPerMinute} HP per minute while the Ludus concentrates. Other timed effects continue to expire.`;
  case 'awaken':return 'Awaken a sleeping fighter. Does not heal a coma, concussion damage, or death.';
  case 'blessing':return `${s.radius?`A ${s.radius}-foot sphere grants one selected effect to everyone inside, including opponents. `:''}${s.db?`+${s.db} DB. `:''}${s.rr?`+${s.rr} resistance rolls. `:''}${s.maneuver?`+${s.maneuver} maneuvers. `:''}${s.element?`Applies to ${s.element}; includes natural temperature protection. `:''}Duration: ${s.durationMinutesPerLevel} minute(s) per level. Must remain within ${s.tetherRange??s.range} feet of the attendant. Same-family bonuses do not stack.`;
 }
 return '';
}
export function ludusPage(state,building=null){
 const l=state.ludus,p=nextPromotion(state);
 return `<section class="ludus">${building&&building!=='hall'?'':`<div class="ludus-summary"><strong>Level ${l.level}</strong><span>${l.xp} XP</span><strong>${l.pp}/${l.ppMax} PP</strong><span>${Math.max(0,l.hits-l.damage)}/${l.hits} caster HP</span><button data-rest>Rest ${C.time.restDays} day(s)</button></div>
 <details><summary>About the Ludus</summary><p>Buildings are the Ludus’s spell-list skills. They share its power points. A resident currently contributes +${C.starting.residentBonus}; gladiator assignments will come later.</p></details>
 ${p?`<button class="building-action building-promotion" data-promote-ludus ${l.xp<p.xp||state.gold<p.gold?'disabled':''}><span class="action-kind">Ludus upgrade</span><strong>Promote to level ${p.level}</strong><span>${p.gold} gold · ${l.xp}/${p.xp} XP</span></button>`:'<p>Maximum Ludus level reached.</p>'}
 ${l.conditions.length?`<p role="status">Caster recovery: ${l.conditions.map(c=>`${esc(c.kind)} (${Math.ceil((c.until-l.clock)/roundsPerMinute())} min remaining)`).join(', ')}</p>`:''}
 ${l.disorder?`<p>${esc(l.disorder)}</p>`:''}
 `}<div class="ludus-buildings">${Object.entries(C.buildings).filter(([id])=>!building||id===building).map(([id,b])=>{
 const owned=l.buildings[id],cost=C.economy.rankPrices[owned.rank],capped=owned.rank>=Math.min(l.level,C.progression.maxRank);
 return `<article class="ludus-building"><div class="building-status"><span>Rank <strong>${owned.rank}</strong></span><span>${state.gold} gold</span><span>${l.pp}/${l.ppMax} shared PP</span></div><div class="building-actions">
 <button class="building-action building-upgrade" data-upgrade-building="${id}" ${capped||state.gold<cost?'disabled':''}><span class="action-kind">Building</span><strong>Upgrade</strong><span>${owned.rank>=C.progression.maxRank?'Fully upgraded':capped?'Promote Ludus first':`Rank ${owned.rank+1} · ${cost} gold`}</span></button>
 ${C.spells.filter(s=>s.building===id).map(s=>{
 const reason=spellRequirement(state,s);
 return `<button class="building-action ludus-spell ${reason?'is-locked':''}" data-ludus-spell="${s.id}"><span class="action-kind">${reason?'Locked · ':''}Level ${s.level}</span><strong>${esc(s.name)}</strong><span>${servicePrice(s)} gold · ${spellPp(s)} PP</span></button>`;
 }).join('')}</div><details class="building-about"><summary>About this building</summary><p>${esc(b.name)} · Resident +${owned.residentBonus}</p><p>${esc(b.source)}</p><p>Upgrade the building to learn higher-level spells. Building ranks cannot exceed the Ludus level.</p></details></article>`;
 }).join('')}</div>
 ${building&&building!=='hall'?'':`<details class="ludus-history"><summary>Recent services</summary>${l.history.map(r=>`<article><strong>${esc(r.name)} · ${esc(r.target)}</strong><p>${esc(r.description)}</p><p class="small">${r.success?'Completed':'Failed'} · ${r.gold} gold · ${r.pp??0} PP${r.failureCheck!==undefined?` · casting roll ${r.failureCheck}`:''}${r.maneuver?` · maneuver ${r.maneuver.total}`:''}${r.roll!==undefined?` · failure table ${r.roll}`:''}</p></article>`).join('')||'<p>No services yet.</p>'}</details>`}</section>`;
}
export function serviceDialog(state,s){
 const reason=spellRequirement(state,s);
 if(reason)return `<div class="spell-detail"><p>${esc(spellDescription(s))}</p><p>${servicePrice(s)} gold · ${spellPp(s)} PP</p><p class="spell-locked" role="status">${esc(reason)}</p></div>`;
 return `<p>${esc(spellDescription(s))}</p><p>${servicePrice(s)} gold per attempt · ${spellPp(s)} PP before failure adjustments. Casting can fail.</p>${state.members.length?'':'<p>Recruit a living gladiator first.</p>'}${state.members.filter(m=>!m.dead).map(m=>`<details class="ludus-target" ${state.members.length===1?'open':''}><summary>${esc(m.name)} · ${m.hits-m.damage}/${m.hits} HP</summary><form data-ludus-service><input type="hidden" name="spellId" value="${s.id}"><input type="hidden" name="targetId" value="${esc(m.id)}">
 ${['nerveRepair','unparalysis','burn','irritation'].includes(s.kind)?`<fieldset><legend>Select ${s.kind==='burn'?'affected areas':'one injury'}</legend>${m.injuries.map(i=>`<label><input type="${s.kind==='burn'?'checkbox':'radio'}" name="injuryId" value="${esc(i.id)}"> ${esc(i.label||i.description)}${i.destroyed?' · destroyed':''}${i.suppressed?' · temporarily suppressed':''}${i.recoveryUntil?' · recovering':''}</label>`).join('')||'<p>No recorded injuries.</p>'}</fieldset>`:''}
 ${s.choices?`<label>Effect<select name="choice">${s.choices.map(id=>`<option value="${id}">${esc(spellById(id).name)}</option>`).join('')}</select></label>`:''}
 ${s.kind==='regenerate'?`<label>Concentration time (minutes)<input type="number" name="minutes" min="1" max="${C.time.maxRegenerationMinutes}" value="${C.time.defaultRegenerationMinutes}" required></label>`:''}
 <button class="primary">${s.kind==='blessing'?'Select blessing (paid when battle starts)':'Cast · '+servicePrice(s)+' gold'}</button></form></details>`).join('')}`;
}
export function blessingPanel(state,party){
 const q=blessingQuote(state,party);
 return `<section class="ludus-blessings"><h3>Ludus blessings</h3>${state.members.filter(m=>party.includes(m.id)).map(m=>{
 const selections=state.ludus.selections[m.id]||[];
 return `<p>${esc(m.name)}: ${selections.map(o=>esc(spellById(o.spellId)?.name||o.spellId)).join(', ')||'None'}${selections.length?` <button class="quiet" data-clear-blessing="${esc(m.id)}">Clear</button>`:''}</p>`;
 }).join('')}<p>Preparation: ${q.gold} gold · ${q.pp} PP. Current Ludus PP: ${state.ludus.pp}/${state.ludus.ppMax}.</p></section>`;
}
