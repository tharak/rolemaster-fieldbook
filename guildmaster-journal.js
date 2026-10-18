import {esc} from './dom.js';
import {equipmentIcon} from './equipment-art.js';
export const journalClock=hours=>`Day ${1+Math.floor(hours/24)} · ${String(hours%24).padStart(2,'0')}:00`;
export function journalKind(result){
 const report=result.encounter;
 if(report&&(report.rounds?.length||report.archivedRounds||Object.hasOwn(report,'winner')))return 'combat';
 return report?'travel':'base';
}
export function journalTurns(reports,{member='all',kind='all'}={}){
 return reports.map(turn=>({...turn,results:turn.results.filter(result=>(member==='all'||result.memberId===member)&&(kind==='all'||journalKind(result)===kind))})).filter(turn=>turn.results.length);
}
function outcome(result){
 if(result.action==='none')return 'No action';
 if(result.dead)return 'Member lost';
 if(journalKind(result)==='combat')return result.encounter.winner===0?'Victory':result.encounter.winner===1?'Defeat':'Withdrawal';
 if(journalKind(result)==='travel')return result.encounter.encounter?.type==='none'?'Quiet journey':'Meeting / sighting';
 return {rest:'Rest',work:'Work',return:'Returned',adventure:'Unable to depart'}[result.action]||'At base';
}
function entryMarkup(result){
 const report=result.encounter,kind=journalKind(result),rounds=report?.rounds||[];
 const changes=[];
 if(result.hpBefore!==result.hpAfter)changes.push(`HP ${result.hpBefore} → ${result.hpAfter}`);
 if(result.ppBefore!==result.ppAfter)changes.push(`PP ${result.ppBefore} → ${result.ppAfter}`);
 if(result.xp)changes.push(`+${result.xp} XP`);
 if(result.gold)changes.push(`${result.gold} gold ${result.action==='work'?'earned':result.action==='return'?'banked':'found'}`);
 const opponents=report?.enemies||[];
 return `<article class="journal-entry journal-entry-${kind}"><header><div><h4>${esc(result.name)}</h4><p class="journal-entry-location">${esc(report?.location||(result.action==='return'?'Back at the guild':result.away?'On expedition':'At the guild'))}</p></div><span class="journal-outcome${result.dead&&result.action!=='none'?' is-loss':''}">${esc(outcome(result))}</span></header><p class="journal-summary">${esc(result.summary)}</p>${changes.length?`<ul class="journal-changes" aria-label="Changes">${changes.map(change=>`<li>${esc(change)}</li>`).join('')}</ul>`:''}${result.items?.length?`<p class="manager-loot">${result.items.map(item=>equipmentIcon(item.name)+esc(item.name)).join(' · ')}</p>`:''}${kind==='combat'?`<details class="journal-combat"><summary>Combat details · ${rounds.length||report.archivedRounds||0} rounds</summary>${opponents.length?`<h5>Opponents</h5><ul class="journal-opponents">${opponents.map(enemy=>`<li><strong>${esc(enemy.name)}</strong>${enemy.attacks?`<span>${enemy.attacks.map(attack=>`${esc(attack.name)} · OB ${attack.ob}`).join(' / ')}</span>`:''}${enemy.armorName?`<span>${esc(enemy.armorName)}${enemy.armorType&&!enemy.armorName.includes(`AT ${enemy.armorType}`)?` · AT ${enemy.armorType}`:''}</span>`:''}</li>`).join('')}</ul>`:''}${rounds.length?`<div class="journal-rounds">${rounds.map(round=>`<details><summary>Round ${round.round}</summary><ol>${round.events.map(event=>`<li>${esc(event.text)}</li>`).join('')}</ol></details>`).join('')}</div>`:`<p>${report.archivedRounds?'Older round details have been archived. The outcome and rewards are retained.':'No combat rounds recorded.'}</p>`}</details>`:''}${report?`<details class="journal-source"><summary>Encounter roll · T-5.1</summary><p>${esc(report.encounter?.label||'Encounter')} · ${esc(report.encounter?.cell||'—')}</p>${report.encounter?.activityTotal!==undefined?`<p>Activity ${report.encounter.activityTotal} − avoidance ${report.encounter.avoidanceTotal} = ${report.encounter.result}</p>`:''}</details>`:''}</article>`;
}
export function guildMasterJournal(state,{member='all',kind='all',limit=5}={}){
 const reports=state.management?.reports||[],turns=journalTurns(reports,{member,kind}),shown=turns.slice(0,limit);
 const members=new Map(state.members.map(item=>[item.id,item.name]));
 for(const turn of reports)for(const result of turn.results)if(!members.has(result.memberId))members.set(result.memberId,result.name);
 return `<div class="journal-heading"><div><p class="adventure-eyebrow">The guild's record</p><h2 id="manager-journal-title">Journal</h2><p>Journeys, encounters, and life at the guild. Latest turns first.</p></div><span>${reports.length} of 30 turns retained</span></div><div class="journal-filters"><label>Member<select data-journal-member><option value="all">All members</option>${[...members].map(([id,name])=>`<option value="${esc(id)}" ${member===id?'selected':''}>${esc(name)}</option>`).join('')}</select></label><div class="journal-kind-filter" role="group" aria-label="Journal activity">${[['all','All activity'],['combat','Combat'],['travel','Travel'],['base','At base']].map(([value,label])=>`<button type="button" data-journal-kind="${value}" aria-pressed="${kind===value}">${label}</button>`).join('')}</div></div><p class="journal-count" role="status">${turns.length?`Showing ${shown.length} of ${turns.length} matching turns`:'No matching turns'}</p>${shown.length?`<div class="journal-timeline">${shown.map(turn=>{
 const counts={combat:0,travel:0,base:0};turn.results.forEach(result=>counts[journalKind(result)]++);
 return `<section class="journal-turn" aria-labelledby="journal-turn-${turn.number}"><header class="journal-turn-heading"><div><h3 id="journal-turn-${turn.number}">Turn ${turn.number}</h3><span>${journalClock(turn.hour)}</span></div><p>${[['combat','combat'],['travel','travel'],['base','at base']].filter(([key])=>counts[key]).map(([key,label])=>`${counts[key]} ${label}`).join(' · ')}</p></header><div class="journal-entries">${turn.results.map(entryMarkup).join('')}</div></section>`;
 }).join('')}</div>${turns.length>limit?'<button type="button" class="button button-quiet journal-older" data-journal-older>Show older turns</button>':''}`:`<div class="journal-empty"><h3>${reports.length?'No entries match these filters':'The journal is waiting for its first entry'}</h3><p>${reports.length?'Choose another member or activity to see more results.':'Assign orders to your members, then advance time to begin.'}</p>${reports.length?'<button type="button" class="button button-quiet" data-journal-reset>Clear filters</button>':''}</div>`}`;
}
