import {assignedProfileAttacks,armorDescription} from './guildmaster-assignments.js';
import {managementState,memberOrder} from './guildmaster-rules.js';
import {creatureProfile} from './coliseum-battle.js';
import {esc} from './dom.js';

export function guildMasterMemberCard(state,member,lists,{controls='',result=''}={}){
 const journey=managementState(state).journeys[member.id],order=memberOrder(state,member.id);
 const status=member.dead?'Dead':order.action==='return'?`Returning → ${order.nextAction==='work'?'Work':'Rest'}`:journey?'On expedition':'At base';
 const hp=Math.max(0,member.hits-member.damage);
 const injuries=member.effects.map(e=>e.kind==='bleed'?`${e.amount} bleeding/round`:e.kind==='penalty'?`−${e.amount} injury penalty`:e.kind);
 const attacks=assignedProfileAttacks(member);
 const stats=[['Armor',`${armorDescription(member)} · AT ${member.armor_type}`],['DB',member.db],...attacks.map(attack=>[`OB ${attack.slot} · ${attack.name}${attack.chance?' · Active':''}`,attack.ob]),['PP (reference)',member.ppMax],['Spell ranks (reference)',member.spellRanks]];
 return `<article class="guild-member manager-member" data-member="${esc(member.id)}"><header><svg class="guild-portrait" viewBox="0 0 96 80" aria-hidden="true"><use href="assets/coliseum/creatures.svg#${creatureProfile(member)}"></use></svg><div><h3>${esc(member.name)}</h3><span class="manager-member-status ${order.action==='return'?'is-returning':''}">${esc(status)}</span><p>T-5.8 · ${esc(member.profession)} · Level ${member.level} · ${member.xp} XP</p></div></header><div class="manager-health" role="progressbar" aria-label="${esc(member.name)} HP" aria-valuemin="0" aria-valuemax="${member.hits}" aria-valuenow="${hp}"><span class="manager-health-fill" style="width:${Math.max(0,Math.min(100,hp/member.hits*100))}%"></span><strong>HP ${hp} / ${member.hits}</strong></div><dl class="manager-printed-stats">${stats.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value??'—')}</dd></div>`).join('')}</dl>${injuries.length?`<ul class="guild-status manager-injuries">${injuries.map(s=>`<li>${esc(s)}</li>`).join('')}</ul>`:''}${controls}${journey?`<p class="manager-cargo">Stage ${journey.stage} · ${journey.gold} gold carried</p>`:''}${result}</article>`;
}
