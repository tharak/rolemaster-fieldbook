import {esc} from './dom.js';

export function latestMemberResult(state,id){
 for(const turn of state.management?.reports||[]){
  const result=turn.results.find(item=>item.memberId===id&&(item.encounter||item.action==='return'));
  if(result)return {turn:turn.number,result};
 }
 return null;
}
export const hasCombat=result=>!!result?.encounter&&(Object.hasOwn(result.encounter,'winner')||result.encounter.rounds?.length>0||result.encounter.archivedRounds>0);
export function memberResultCard(state,member,flashTurn){
 const latest=latestMemberResult(state,member.id);if(!latest)return '';
 const {turn,result}=latest,rewards=[];
 if(result.xp)rewards.push(`+${result.xp}xp`);
 if(result.gold)rewards.push(`+${result.gold}g${result.action==='return'?' banked':''}`);
 for(const item of result.items||[])rewards.push(`+${item.name}`);
 const outcome=hasCombat(result)?result.encounter.winner===0?'Victory':result.encounter.winner===1?'Rescued':'Draw':result.action==='return'?'Returned':'Explored';
 return `<div class="member-result ${turn===flashTurn?'result-flash':''}" data-member-result="${esc(member.id)}"><div><small>${outcome} · Turn ${turn}</small><strong>${esc(rewards.join(' ')||'No rewards')}</strong></div>${hasCombat(result)?`<button type="button" class="quiet" data-combat-member="${esc(member.id)}" data-combat-turn="${turn}" aria-label="Combat log for ${esc(member.name)}, turn ${turn}">⚔️</button>`:''}</div>`;
}
export function combatLog(result){
 if(!hasCombat(result))return '<p>No combat log is available.</p>';
 const report=result.encounter,rounds=report.rounds||[];
 return `<div class="member-combat-log"><p>${esc(result.summary)}</p>${report.enemies?.length?`<p>Against ${report.enemies.map(enemy=>esc(enemy.name)).join(', ')}</p>`:''}${rounds.length?rounds.map(round=>`<details ${round===rounds[0]?'open':''}><summary>Round ${round.round}</summary><ol>${round.events.map(event=>`<li>${esc(event.text)}</li>`).join('')}</ol></details>`).join(''):`<p>${report.archivedRounds?'Older round details have been archived.':'No combat rounds recorded.'}</p>`}</div>`;
}
