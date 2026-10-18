import {esc} from './dom.js';
import {equipmentIcon} from './equipment-art.js';
import {assignedProfileAttacks,armorDescription} from './guildmaster-assignments.js';

export function statBar(label,value,max=100){
 const limit=Number.isFinite(max)&&max>0?max:1;
 const current=Math.max(0,Math.min(limit,Number.isFinite(value)?value:0));
 return `<div class="stat-bar" role="meter" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="${limit}" aria-valuenow="${current}"><span class="stat-bar-fill" style="width:${current/limit*100}%"></span><span class="stat-bar-text">${esc(label)} <strong>${current}/${limit}</strong></span></div>`;
}
export function memberEquipment(member){
 const items=assignedProfileAttacks(member).map(attack=>({icon:attack.rawKind==='ds'?'spell book':attack.name,text:`${attack.name} · OB ${attack.ob}${attack.chance?' · Active':''}`}));
 items.push({icon:'shield',text:member.suggestedEquipment?.includes('shield')?`Shield · included in DB ${member.db}`:'No shield',absent:!member.suggestedEquipment?.includes('shield')});
 items.push({icon:armorDescription(member)+' armor',text:`${armorDescription(member)} · AT ${member.armor_type} · DB ${member.db}`});
 return `<div class="member-equipment-icons">${items.map(item=>`<button type="button" class="quiet equipment-button ${item.absent?'unequipped':''}" data-equipment="${esc(item.text)}" aria-label="${esc(item.text)}" aria-expanded="false" title="${esc(item.text)}">${equipmentIcon(item.icon)}</button>`).join('')}</div><p class="equipment-caption" data-equipment-caption hidden></p>`;
}
