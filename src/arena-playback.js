import {esc} from './dom.js';
import {creatureProfile} from './coliseum-battle.js';
import {formatCriticalEffect} from './critical-presentation.js';

export const playbackSteps=report=>[...(report.services||[]).map(s=>({kind:'service',round:0,text:`${s.name}: ${s.description}`})),...report.rounds.flatMap(round=>[{kind:'round',round:round.round},...round.events.map(event=>({...event,round:round.round}))])];
export function applyPlaybackChanges(units,changes=[]){
 const updates=new Map(changes.map(u=>[u.id,u]));
 return units.map(u=>structuredClone(updates.get(u.id)||u));
}
export function playbackStatuses(unit){
 if(!unit.standing)return unit.dead?['Dead']:[...(unit.conditions?.length?unit.conditions:[unit.asleep?'Asleep':'Defeated']),...(unit.mortalIn!==undefined?[`Dying · ${unit.mortalIn}r`]:[])];
 const labels=unit.effects.map(e=>{
  const name={bleed:`Bleeding ${e.amount}/round`,stun:'Stunned',stunNoParry:'Stunned · no parry',noParry:'Cannot parry',mustParry:'Must parry',downOrOut:'Down',penalty:`−${e.amount} penalty`,bonus:`+${e.amount} bonus`}[e.kind]||e.kind;
  return name+(e.pending?' · next round':e.roundsLeft===null?'':` · ${e.roundsLeft}r`);
 });
 if(unit.mortalIn!==undefined)labels.push(`Mortal wound · ${unit.mortalIn}r`);
 return [...(unit.conditions||[]),...labels];
}
export function playbackNarration(event,fighters){
 if(event.kind==='round')return `Round ${event.round}`;
 if(event.kind!=='attack')return event.text;
 const name=id=>fighters.find(f=>f.id===id)?.name||'Fighter';
 return `${name(event.actor)} uses ${event.attackName||'an attack'} on ${name(event.target)} — ${event.damage?`${event.damage} damage`:'no damage'}.${event.defeated?' '+name(event.target)+' falls.':''}`;
}
// Rendering only: consumes saved snapshots, never invokes combat or persistence.
export function mountArenaPlayback(root,report,onResult){
 const fighters=report.playback.fighters,steps=playbackSteps(report);
 let units=structuredClone(report.playback.initial),index=-1,paused=false,speed=1,timer=null,disposed=false,finished=false;
 root.innerHTML=`<section data-arena-playback class="arena-playback"><div class="replay-heading"><span data-round-label>Ready</span><span data-action-count>Battle begins</span></div><div class="replay-stage" data-stage></div><div class="replay-message" aria-live="polite" aria-atomic="true" data-narration>Both teams take their positions.</div><div data-critical-focus></div><div class="replay-controls"><button data-pause aria-pressed="false">Pause</button><button data-step>Next action</button><label>Speed <select data-speed aria-label="Battle speed"><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select></label><button data-skip>Skip to result</button></div><button class="primary replay-result" data-view-result hidden>View rewards & injuries</button><details class="replay-recent"><summary>Recent actions</summary><ol data-recent></ol></details></section>`;
 const stage=root.querySelector('[data-stage]'),message=root.querySelector('[data-narration]'),critical=root.querySelector('[data-critical-focus]');
 function draw(event){
  stage.innerHTML=[1,0].map(team=>`<div class="replay-team team-${team}" aria-label="${team?'Opponents':'Your fighters'}">${fighters.filter(f=>f.team===team).map(f=>{
   const u=units.find(u=>u.id===f.id),previous=event?._before?.find(u=>u.id===f.id),delta=previous?u.hp-previous.hp:0,statuses=playbackStatuses(u);
   const target=event?.target===f.id,actor=event?.actor===f.id;
   return `<article class="replay-unit ${!u.standing?'is-down':''} ${actor?'is-acting':''} ${target?'is-target':''}" data-replay-unit="${esc(f.id)}"><div class="replay-sprite"><svg viewBox="0 0 96 80" aria-hidden="true"><use href="assets/coliseum/creatures.svg#${creatureProfile(f)}"></use></svg>${event?.kind==='attack'&&target||delta?`<strong class="replay-damage ${delta>0?'is-heal':''}">${delta>0?'+':''}${delta||(event?.critical&&!event.critical.ignored?'CRIT':'MISS')}</strong>`:''}</div><strong class="replay-name">${esc(f.name)}</strong><div class="replay-hp" role="meter" aria-label="${esc(f.name)} HP" aria-valuemin="0" aria-valuemax="${f.maximum}" aria-valuenow="${u.hp}"><span style="width:${Math.min(100,u.hp/f.maximum*100)}%"></span></div><small>${u.hp}/${f.maximum} HP</small>${statuses.length?`<span class="replay-status">${esc(statuses.join(' · '))}</span>`:''}</article>`;
  }).join('')}</div>`).join('')+'<span class="replay-versus" aria-hidden="true">VS</span>';
 }
 function schedule(delay=1200){clearTimeout(timer);if(!disposed&&!paused&&!finished)timer=setTimeout(advance,delay/speed);}
 function advance(){
  clearTimeout(timer);if(disposed||finished)return;
  index++;
  if(index>=steps.length){
   finished=true;units=applyPlaybackChanges(units,report.playback.final);draw();
   root.querySelector('[data-round-label]').textContent=report.winner===0?'Victory':report.winner===1?'Defeat':'Draw';
   message.textContent=report.winner===0?'The opposition falls. Your company wins!':report.winner===1?'Your company is defeated. Review the casualties and injuries.':'Neither side prevails. Both teams withdraw.';
   critical.innerHTML='';root.querySelector('.replay-controls').hidden=true;root.querySelector('[data-view-result]').hidden=false;root.querySelector('[data-view-result]').focus();return;
  }
  const event=steps[index],before=units;units=applyPlaybackChanges(units,event.changes);
  draw({...event,_before:before});
  root.querySelector('[data-round-label]').textContent=`Round ${event.round}`;
  root.querySelector('[data-action-count]').textContent=`${index+1} / ${steps.length}`;
  message.textContent=playbackNarration(event,fighters);
  const c=event.critical&&!event.critical.ignored?event.critical:null;
  critical.innerHTML=c?`<article class="replay-critical"><header><strong>${esc(c.severity)} CRITICAL</strong><span>Roll ${c.roll}</span></header><p>${esc(c.description)}</p><div>${formatCriticalEffect(c.effect,false,c.description)}</div></article>`:'';
  const recent=document.createElement('li');recent.textContent=message.textContent;const list=root.querySelector('[data-recent]');list.prepend(recent);while(list.children.length>5)list.lastElementChild.remove();
  schedule(c?4200:event.kind==='round'?1000:1500);
 }
 function handle(event){
  const button=event.target.closest('button');if(!button)return;
  if(button.hasAttribute('data-skip')||button.hasAttribute('data-view-result')){dispose();onResult();return;}
  if(button.hasAttribute('data-pause')){paused=!paused;button.textContent=paused?'Resume':'Pause';button.setAttribute('aria-pressed',String(paused));if(paused)clearTimeout(timer);else schedule();}
  if(button.hasAttribute('data-step')){paused=true;const pause=root.querySelector('[data-pause]');pause.textContent='Resume';pause.setAttribute('aria-pressed','true');advance();}
 }
 function change(event){if(event.target.matches('[data-speed]')){speed=Number(event.target.value);schedule();}}
 function visibility(){if(document.hidden&&!paused&&!finished){paused=true;clearTimeout(timer);const b=root.querySelector('[data-pause]');b.textContent='Resume';b.setAttribute('aria-pressed','true');}}
 function dispose(){disposed=true;clearTimeout(timer);root.removeEventListener('click',handle);root.removeEventListener('change',change);document.removeEventListener('visibilitychange',visibility);}
 root.addEventListener('click',handle);root.addEventListener('change',change);document.addEventListener('visibilitychange',visibility);
 draw();schedule();return dispose;
}
