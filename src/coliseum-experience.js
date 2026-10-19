import {mountExperienceCalculator} from './experience-calculator.js';
import {combatExperience,uniqueness} from './experience-rules.js';
import {esc} from './dom.js';
export function createExperiencePanel(getFight){
  const panel=document.createElement('section');panel.className='play-card';panel.id='coliseum-experience';
  document.querySelector('.coliseum-log-card').before(panel);
  panel.innerHTML=`<h2>Experience awards</h2><p>Core Rules §23, pp. 71–74. Review the assumptions after a duel, then record XP on a saved character. Fractions are rounded down once at the total. Practice fights receive no kill XP.</p><label><input type="checkbox" name="conflict"> True conflict (eligible for kill XP)</label> <label>Experience <select name="uniqueness"><option value="normal">Normal ×1</option><option value="first">First time ×5</option><option value="second">Second time ×2</option><option value="routine">Routine ×½</option></select></label><div data-xp-results></div><p data-xp-message role="status"></p><p class="play-muted">Hits and criticals come from the combat log. Choose the foe’s intelligence, race and size below; physical size alone does not establish Large critical status. Spells, maneuvers, ideas, travel and GM adjustments can be recorded through the sheet’s Experience &amp; level panel. Bleeding and death countdowns retain credit for the opponent that caused them.</p>`;
  mountExperienceCalculator(panel);
  let current=null;const applied=new Set();
  const options=[{},{}];
  function render(){
    const fight=getFight(),box=panel.querySelector('[data-xp-results]');
    if(fight!==current){current=fight;options.splice(0,2,...[0,1].map(side=>{const foe=fight?.fighters[1-side]?.creature,self=fight?.fighters[side]?.creature;return {intelligent:!!foe?.sourceKind,sameRace:!!self?.race&&self.race===foe?.race,size:foe?.size==='H*'?'super-large':foe?.size==='L*'?'large':'normal'};}));panel.querySelector('[data-xp-message]').textContent='';}
    if(!fight?.finished){box.textContent='Finish a duel to review its XP awards.';return;}
    box.innerHTML=fight.fighters.map(({creature},side)=>{
      const settings=options[side];
      const award=combatExperience(fight,side,{...settings,trueConflict:panel.querySelector('[name=conflict]').checked,multiplier:uniqueness[panel.querySelector('[name=uniqueness]').value]});
      return `<article data-xp-side="${side}"><h3>${esc(creature.name)} · <strong data-xp-total>${award.total} XP</strong></h3><label><input type="checkbox" name="intelligent" ${settings.intelligent?'checked':''}> Intelligent foe ×1.5 kill EP</label> <label><input type="checkbox" name="sameRace" ${settings.sameRace?'checked':''}> Same race ×2 kill EP</label> <label>Foe critical size <select name="size">${['normal','large','super-large'].map(size=>`<option ${settings.size===size?'selected':''}>${size}</option>`).join('')}</select></label> <label><input type="checkbox" name="revived" ${settings.revived?'checked':''}> Died and later revived ×2 death EP</label><ul>${Object.entries(award.parts).map(([key,value])=>`<li>${esc({hitsDelivered:'Hits delivered',hitsReceived:'Hits received',criticalsDelivered:'Criticals delivered (capped)',criticalsReceived:'Criticals received',defeat:'Kill / knockout',mortalWound:'Mortal wound'}[key])}: ${value}</li>`).join('')}</ul>${creature.sourceKind==='character'?`<button type="button" class="button button-dark" data-xp-apply="${side}" ${applied.has(fight.id+':'+creature.sourceId)||award.total<=0?'disabled':''}>${applied.has(fight.id+':'+creature.sourceId)?'XP recorded':'Record '+award.total+' XP'}</button>`:'<p>Preview only — this contender is not a saved character.</p>'}</article>`;
    }).join('');
  }
  panel.addEventListener('change',e=>{const side=e.target.closest('[data-xp-side]')?.dataset.xpSide;if(side!==undefined)options[Number(side)][e.target.name]=e.target.type==='checkbox'?e.target.checked:e.target.value;render();});
  panel.addEventListener('click',e=>{
    const button=e.target.closest('[data-xp-apply]');if(!button)return;
    const fight=getFight(),side=Number(button.dataset.xpApply),creature=fight.fighters[side].creature;
    if(!fight.finished||creature.sourceKind!=='character')return;
    const award=combatExperience(fight,side,{...options[side],trueConflict:panel.querySelector('[name=conflict]').checked,multiplier:uniqueness[panel.querySelector('[name=uniqueness]').value]});
    try{const id=fight.id+':'+creature.sourceId;const total=window.RolemasterEncounter.awardExperience(creature.sourceId,{id,amount:award.total,reason:`Coliseum vs ${fight.fighters[1-side].creature.name} (§23)`});applied.add(id);render();panel.querySelector('[data-xp-message]').textContent=`Recorded ${award.total} XP for ${creature.name}. Total: ${total}. Undo is available on the character sheet.`;}catch(error){panel.querySelector('[data-xp-message]').textContent=error.message;}
  });
  return render;
}
