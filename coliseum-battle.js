// Presentation and playback only. Combat outcomes come from coliseum-rules.js.
import {esc} from './dom.js';
import {rustBattleContender} from './rust-components.js';

const profiles=['wolf','tiger','bear','dragon','serpent','bird','insect','humanoid','horse','aquatic','elemental','turtle'];
export function creatureProfile(creature) {
  const name=creature.name.toLowerCase();
  if(/dragon|wyvern|hydra|drake/.test(name))return 'dragon';
  if(/wolf|dog|hound|fox|jackal|rat/.test(name))return 'wolf';
  if(/tiger|lion|cat|cheetah|leopard|panther/.test(name))return 'tiger';
  if(/bear|boar|bull|rhino|elephant/.test(name))return 'bear';
  if(/snake|boa|basilisk|serpent|lizard|alligator/.test(name))return 'serpent';
  if(/eagle|hawk|falcon|condor|roc\b|bird|bat|owl|harpy/.test(name))return 'bird';
  if(/ant\b|beetle|spider|scorpion|crab|lobster|bees/.test(name))return 'insect';
  if(/horse|centaur|unicorn|pegasus|deer|elk|moose/.test(name))return 'horse';
  if(/dolphin|whale|shark|fish|barracuda|pike|piranha|eel|manta|kraken|squid|octopus/.test(name))return 'aquatic';
  if(/elemental|efreet|genie/.test(name))return 'elemental';
  if(/turtle/.test(name))return 'turtle';
  return 'humanoid';
}
export function battleContenderJavaScript(view) {
  const side=view.side===0?0:1,corner=side===0?'Red':'Blue',profile=profiles.includes(view.profile)?view.profile:'humanoid';
  const name=esc(view.name),attack=esc(view.attack),hits=Math.min(view.hits,view.maximum),percent=view.maximum?Math.floor(hits/view.maximum*1000)/10:0;
  return `<div class="battle-unit" data-battle-side="${side}" data-profile="${profile}"><div class="battle-nameplate"><span>${corner} corner</span><strong>${name}</strong></div><div class="battle-sprite-wrap"><span class="battle-shadow"></span><svg class="battle-sprite" viewBox="0 0 96 80" role="img" aria-label="${name}"><use href="assets/coliseum/creatures.svg#${profile}"></use></svg><span class="battle-impact" aria-hidden="true">✦</span><span class="battle-damage" aria-hidden="true"></span></div><div class="battle-hud"><div class="battle-weapon"><strong data-battle-attack>${attack}</strong><span data-battle-ob>OB ${view.ob>=0?'+':''}${view.ob}</span></div><div class="battle-metrics"><span>ROLL <b data-battle-roll>—</b></span><span>HITS <b data-battle-hits>—</b></span><span>CRIT <b data-battle-critical>—</b></span></div><div class="battle-health"><strong data-battle-health>${hits}</strong><div class="battle-health-track" role="meter" aria-label="${name} hits remaining" aria-valuemin="0" aria-valuemax="${view.maximum}" aria-valuenow="${hits}"><span style="width:${percent.toFixed(1)}%"></span></div><small>/ ${view.maximum}</small></div></div></div>`;
}
export const battleContender=view=>rustBattleContender(view)??battleContenderJavaScript(view);

export function setBattleHealth(unit,value) {
  const meter=unit.querySelector('[role="meter"]'),maximum=Number(meter.getAttribute('aria-valuemax'));
  const remaining=Math.max(0,Math.min(maximum,value));
  unit.querySelector('[data-battle-health]').textContent=remaining;
  meter.setAttribute('aria-valuenow',String(remaining));
  meter.firstElementChild.style.width=(maximum?remaining/maximum*100:0)+'%';
  unit.classList.toggle('is-defeated',remaining===0);
}

function delay(milliseconds,signal) {
  if(signal.aborted)return Promise.resolve();
  return new Promise(resolve=>{
    const finish=()=>{clearTimeout(timer);signal.removeEventListener('abort',finish);resolve();};
    const timer=setTimeout(finish,milliseconds);
    signal.addEventListener('abort',finish,{once:true});
  });
}
export function clearBattleAnimation(stage) {
  stage.removeAttribute('data-active-side');
  for(const unit of stage.querySelectorAll('.battle-unit')){
    unit.removeAttribute('data-action');
    unit.querySelector('.battle-damage').textContent='';
  }
}

export async function playBattleRound(stage,entry,initialHealth,{signal,speed=()=>1,reducedMotion=false}) {
  const units=[...stage.querySelectorAll('.battle-unit')],health=[...initialHealth];
  if(units.length!==2)return;
  units.forEach((unit,index)=>setBattleHealth(unit,health[index]));
  for(const event of entry.events){
    if(signal.aborted)return;
    clearBattleAnimation(stage);
    if(!reducedMotion)void stage.offsetWidth;
    const side=event.side,target=event.kind==='attack'?1-side:side,unit=units[side],defender=units[target];
    let text='';
    if(event.kind==='attack'){
      const damage=event.damage??event.hits;
      unit.querySelector('[data-battle-attack]').textContent=event.attack;
      const ob=event.ob+(event.modifier||0);
      unit.querySelector('[data-battle-ob]').textContent='OB '+(ob>=0?'+':'')+ob;
      unit.querySelector('[data-battle-roll]').textContent=event.total;
      unit.querySelector('[data-battle-hits]').textContent=damage;
      unit.querySelector('[data-battle-critical]').textContent=event.critical?.ignored?'—':event.critical?.severity||'—';
      text=`${unit.querySelector('.battle-nameplate strong').textContent} · ${event.attack} · ${damage?damage+' hits':event.result==='F'?'Fumble':'No damage'}${event.critical&&!event.critical.ignored?' · '+event.critical.severity+' critical':''}`;
      stage.dataset.activeSide=String(side);
      unit.dataset.action='attack';
      if(!reducedMotion)await delay(240/speed(),signal);
      if(signal.aborted)return;
      health[target]=Math.max(0,health[target]-damage);
      if(event.result==='F'){
        unit.dataset.action='miss';unit.querySelector('.battle-damage').textContent='FUMBLE';
      }else{
        defender.dataset.action=damage?'hit':'miss';
        defender.querySelector('.battle-damage').textContent=damage?'−'+damage:'MISS';
      }
    }else if(event.kind==='bleed'){
      health[target]=Math.max(0,health[target]-event.hits);
      defender.dataset.action='hit';defender.querySelector('.battle-damage').textContent='−'+event.hits;
      text=unit.querySelector('.battle-nameplate strong').textContent+' · '+event.hits+' bleeding hits';
    }else if(event.kind==='dies'){
      health[target]=0;text=unit.querySelector('.battle-nameplate strong').textContent+' falls';
    }else if(event.kind==='stun'){
      defender.dataset.action='stun';defender.querySelector('.battle-damage').textContent='CANNOT ATTACK';
      text=unit.querySelector('.battle-nameplate strong').textContent+' cannot attack this round';
    }
    setBattleHealth(defender,health[target]);
    stage.querySelector('[data-battle-commentary]').textContent=text;
    if(!reducedMotion)await delay(560/speed(),signal);
  }
  clearBattleAnimation(stage);
}
