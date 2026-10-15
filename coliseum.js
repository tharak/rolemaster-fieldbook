import {equipmentIcon} from './equipment-art.js';
import {createExperiencePanel} from './coliseum-experience.js';
import './app.js';
import {$,esc} from './dom.js';
import {formatRolls} from './rules.js';
import {creatureSymbol,duelSymbol} from './coliseum-symbols.js';
import {criticalEquipment} from './critical-equipment.js';
import {criticalEffectMarkup,criticalLegend,useEmojis,setUseEmojis} from './critical-presentation.js';
import {ROUND_LIMIT,attackTypes,attackName,creatureCatalog,createFight,stepFight} from './coliseum-rules.js';
import {arenaWeaponStyles,characterContenders,masterCharacterCatalog,configureContender} from './coliseum-contenders.js';
import {battleContender,creatureProfile,playBattleRound,clearBattleAnimation,setBattleHealth,setBattleStatuses} from './coliseum-battle.js';

const sides = ['left','right'];
const storageKey = 'rolemaster-coliseum-v1';

const emojiToggle = $('#coliseum-use-emojis');
emojiToggle.checked = useEmojis();
$('#critical-symbol-legend').innerHTML = criticalLegend.map(([symbol,label,emoji]) => `<li><code>${esc(symbol)}</code><strong>${esc(label)}</strong><span role="img" aria-label="${esc(label)}" title="${esc(label)}">${emoji}</span></li>`).join('');
function symbolMarkup(creature) {
  const icon = creatureSymbol(creature);
  return `<div class="coliseum-crest" role="img" aria-label="${esc(icon.meaning)}" title="${esc(icon.meaning)}">${esc(emojiToggle.checked ? icon.emoji : icon.symbol)}</div>`;
}
function renderSymbols() {
  sides.forEach((side,index) => {
    const crest = $('.coliseum-crest', $(`#coliseum-fighter-${side}`));
    if (crest && selected[index]) crest.outerHTML = symbolMarkup(selected[index]);
  });
  $('#coliseum-duel-symbol').textContent = emojiToggle.checked ? duelSymbol.emoji : duelSymbol.symbol;

}
emojiToggle.addEventListener('change',() => {
  renderSymbols();
  setUseEmojis(emojiToggle.checked);
});
let catalog = [], creatures = [], masterEnemies = [], tables = {}, selected = [], fight = null, running = false, ready = false, loading = null, runVersion = 0, rosterFingerprint='';
let playback=false,playbackController=null;
const battleStage=$('#coliseum-battle');
const playbackSpeed=()=>Number($('#coliseum-speed').value)||1;
const status = text => { $('#coliseum-status').textContent = text; };
const choice = side => $(`#coliseum-select-${side}`);
const search = side => $(`#coliseum-search-${side}`);
const equipmentKey='rolemaster-coliseum-equipment-v1';
const attacksKey='rolemaster-coliseum-attacks-v1';
let equipmentByContender={};
let attacksByContender={};
try {const saved=JSON.parse(localStorage.getItem(equipmentKey));if(saved&&typeof saved==='object'&&!Array.isArray(saved))equipmentByContender=saved;}catch{}
try {const saved=JSON.parse(localStorage.getItem(attacksKey));if(saved&&typeof saved==='object'&&!Array.isArray(saved))attacksByContender=saved;}catch{}
const equipmentFor=(side,index)=>{const value=equipmentByContender[side+':'+selected[index]?.id];return Array.isArray(value)?value:selected[index]?.suggestedEquipment||[];};
function renderEquipment(){sides.forEach((side,index)=>{const list=$(`#coliseum-equipment-${side}`);list.innerHTML=`<legend>Equipment on ${esc(selected[index]?.name||side)}</legend>`+criticalEquipment.map(([key,label])=>`<label><input type="checkbox" data-gear="${esc(key)}"${equipmentFor(side,index).includes(key)?' checked':''}> ${esc(label)}</label>`).join('');});}
for(const [index,side] of sides.entries())$(`#coliseum-equipment-${side}`).addEventListener('change',()=>{equipmentByContender[side+':'+selected[index].id]=[...$(`#coliseum-equipment-${side}`).querySelectorAll('input:checked')].map(el=>el.dataset.gear);try{localStorage.setItem(equipmentKey,JSON.stringify(equipmentByContender));}catch{} if(!fight?.round)resetFight();});

const renderExperience=createExperiencePanel(()=>fight);

function updateCatalog() {
  const characters=characterContenders(window.RolemasterEncounter?.roster()||[]);
  const fingerprint=JSON.stringify(characters),changed=fingerprint!==rosterFingerprint;
  rosterFingerprint=fingerprint;
  catalog=[...characters,...masterEnemies,...creatures];
  $('#coliseum-catalog-count').textContent=`${characters.length} characters · ${masterEnemies.length} T-5.8 enemies · ${creatures.length} creatures`;
  $('#coliseum-character-note').textContent=characters.length?'Your saved characters use their sheet’s hits, AT, DB and equipped weapon bonuses. Unfinished characters show what is missing.':'Saved characters from this browser will appear here. Finish Body Development and equip a weapon on the character sheet to enter.';
  return changed;
}
function renderAttackChoices() {
  sides.forEach((side,index)=>{
    const contender=selected[index],box=$(`#coliseum-attack-picker-${side}`),select=$(`#coliseum-attack-${side}`),styleBox=$(`#coliseum-style-picker-${side}`),styleSelect=$(`#coliseum-style-${side}`);
    box.hidden=!contender?.sourceKind;styleBox.hidden=contender?.sourceKind!=='master';
    const attacks=contender?.sourceKind?contender.attacks:[];
    select.replaceChildren(...attacks.map(attack=>{
      const option=document.createElement('option');option.value=attack.key||'';option.textContent=`${attackName(attack)} · ${attack.ob>=0?'+':''}${attack.ob} OB`;return option;
    }));
    const attack=attacks.find(attack=>attack.chance>0&&!attack.both)||attacks[0];
    select.value=attack?.key||'';
    styleSelect.replaceChildren(...Object.entries(arenaWeaponStyles).filter(([,style])=>style.kind===attack?.rawKind).map(([category,style])=>{
      const option=document.createElement('option');option.value=category;option.textContent=style.label;return option;
    }));
    styleSelect.value=attack?.category||'';
    $(`#coliseum-contender-note-${side}`).textContent=contender?.sourceKind==='master'?'T-5.8 gives generic OBs: choose the weapon style. Printed DB includes its marked shield; extra spell bonuses are not assumed.'+(contender.sourceAttacks.some(attack=>attack.kind==='ds')?' Directed-spell attacks need a specified spell; this duel uses the printed weapon OB.':''):contender?.sourceKind==='character'?`${contender.race} ${contender.profession} · Choose an equipped attack. Combat results do not change your saved sheet.`:'';
  });
}

function filterChoices(side,index) {
  const query = search(side).value.trim().toLowerCase();
  const matches = catalog.filter(creature => `${creature.name} ${creature.group} ${creature.race||''} ${creature.profession||''}`.toLowerCase().includes(query));
  const items = matches.some(item=>item.id===selected[index]?.id) ? matches : [selected[index],...matches].filter(Boolean);
  choice(side).replaceChildren(...['Your characters','T-5.8 enemies','Creatures'].flatMap(label=>{
    const entries=items.filter(item=>(item.sourceKind==='character'?'Your characters':item.sourceKind==='master'?'T-5.8 enemies':'Creatures')===label).sort((a,b)=>a.name.localeCompare(b.name)||a.level-b.level);
    if(!entries.length)return [];
    const group=document.createElement('optgroup');group.label=label;
    group.replaceChildren(...entries.map(creature=>{
      const option=document.createElement('option');option.value=creature.id;option.disabled=!!creature.unavailable;
      option.textContent=(creature.sourceKind==='master'?`${creature.name} · T-5.8`:`${creature.name} · Lvl ${creature.level} · ${creature.group}`)+(creature.unavailable?' — '+creature.unavailable:matches.some(item=>item.id===creature.id)?'':' (selected)');
      return option;
    }));return [group];
  }));
  choice(side).value = selected[index]?.id || '';
  $(`#coliseum-match-${side}`).textContent = `${matches.length} matching contenders${matches.length ? '' : '. Try another name.'}`;
}

function controls() {
  renderExperience();
  const ended = fight?.finished;
  $('#coliseum-simulate').disabled = !ready || running || playback || ended;
  $('#coliseum-step').disabled = !ready || running || playback || ended;
  $('#coliseum-reset').disabled = !ready;
  $('#coliseum-pause').hidden = !running;
  for (const side of sides) { choice(side).disabled = !ready || running || playback; search(side).disabled = !ready || running || playback; }
  for(const side of sides)for(const kind of ['attack','style'])$(`#coliseum-${kind}-${side}`).disabled=!ready||running||playback;
  document.querySelectorAll('[data-gear]').forEach(input=>{input.disabled=!ready||running||fight?.round>0;});
  $('#coliseum-simulate').textContent = fight?.round && !ended ? 'Continue fight' : 'Simulate fight';
}

function syncBattleScene(displayHealth) {
  if(!fight)return;
  battleStage.dataset.playback=playback?'playing':'idle';
  $('#coliseum-battle-round').textContent=fight.round?'ROUND '+String(fight.round).padStart(2,'0'):'PREPARE';
  battleStage.querySelectorAll('.battle-unit').forEach((unit,index)=>{
    const remaining=displayHealth?.[index]??Math.max(0,selected[index].hits-fight.fighters[index].hits);
    setBattleHealth(unit,remaining);
    setBattleStatuses(unit,fight.fighters[index],fight.round,remaining);
    unit.classList.toggle('is-winner',!playback&&fight.finished&&fight.winner===index);
  });
  const outcome=$('#coliseum-battle-outcome');
  outcome.hidden=playback||!fight.finished;
  outcome.querySelector('strong').textContent=fight.finished?(fight.winner===null?'The duel ends in a draw.':selected[fight.winner].name+' wins!'):'';
}
function renderBattleScene() {
  $('#coliseum-battle-fighters').innerHTML=selected.map((creature,side)=>{
    const attack=creature.attacks.find(attack=>attack?.chance>0&&!attack.both)||creature.attacks.find(attack=>attack&&!attack.both);
    return battleContender({name:creature.name,profile:creatureProfile(creature),side,hits:Math.max(0,creature.hits-(fight?.fighters[side].hits||0)),maximum:creature.hits,attack:attackName(attack),ob:attack.ob});
  }).join('');
  battleStage.querySelectorAll('.battle-weapon strong').forEach((label,index)=>{
    const attack=selected[index].attacks.find(attack=>attack?.chance>0&&!attack.both);
    if(selected[index].sourceKind&&attack)label.insertAdjacentHTML('afterbegin',equipmentIcon(attack.name));
  });
  syncBattleScene();
}
function cancelPlayback() {
  playbackController?.abort();playbackController=null;playback=false;
  clearBattleAnimation(battleStage);syncBattleScene();
}

function renderFighterDetails() {
  sides.forEach((side,index) => {
    const creature = selected[index];
    if (!creature) return;
    const fighter = fight?.fighters[index];
    const hits = Math.max(0,creature.hits-(fighter?.hits || 0));
    const card = $(`#coliseum-fighter-${side}`);
    card.classList.toggle('defeated',hits === 0);
    card.classList.toggle('winner',!!fight?.finished && fight.winner === index);
    const effects = fighter?.effects.map(effect => effect.kind === 'bleed' ? `Bleed ${effect.amount}/round` :
      effect.kind === 'penalty' ? `−${effect.amount} OB (${effect.durationLabel||effect.roundsLeft+' round'+(effect.roundsLeft===1?'':'s')})` : effect.kind === 'bonus' ? `+${effect.amount} OB (${effect.durationLabel||effect.roundsLeft+' round'+(effect.roundsLeft===1?'':'s')})` :
      `${effect.kind === 'mustParry' ? 'Must parry' : effect.kind === 'noParry' ? 'No parry' : 'Stunned'} ${effect.durationLabel||effect.roundsLeft+' round'+(effect.roundsLeft===1?'':'s')}`).join(' · ') || '';
    card.innerHTML = `${symbolMarkup(creature)}<span class="coliseum-kind">${creature.group} · Size ${esc(creature.size)}</span><h2>${esc(creature.name)}</h2><dl class="coliseum-stats"><div><dt>Level</dt><dd>${creature.level}</dd></div><div><dt>Armor</dt><dd>${creature.armor_type}</dd></div><div><dt>DB</dt><dd>${creature.db}</dd></div></dl><div class="coliseum-health-label"><span>Hits remaining</span><strong>${hits} / ${creature.hits}</strong></div><progress aria-label="${esc(creature.name)} hits remaining" value="${hits}" max="${creature.hits}"></progress><p class="coliseum-effects">${esc(effects)} ${fighter?.deathRound!==undefined?criticalEffectMarkup('Foe dies in '+Math.max(0,fighter.deathRound-fight.round)+' rounds.') : fighter?.dead?criticalEffectMarkup('Foe dies instantly.') : ''}</p><ul class="coliseum-attacks">${creature.attacks.filter(Boolean).map(attack => `<li>${attack.both ? 'Both attacks' : `${esc(attackTypes[attack.type][0])} · ${attack.ob >= 0 ? '+' : ''}${attack.ob} OB · ${esc(attack.size)}`}${attack.chance ? ` · ${attack.chance}%` : attack.follow ? ` · ${attack.follow === 'same' ? 'same-round' : 'next-round'} follow-up` : ' · optional'}</li>`).join('')}</ul><p class="coliseum-notes">${esc(creature.special || 'No special abilities listed.')}</p>`;
  });
  renderSymbols();
}

function eventText(event) {
  const name = esc(selected[event.side].name);
  if (event.kind === 'dies') return `<p><strong>${name}</strong> ${criticalEffectMarkup('Foe dies instantly.')} Death countdown expired; remaining hits are zero.</p>`;
  if (event.kind === 'bleed') return `<p><strong>${name}</strong> takes ${event.hits} bleeding hits.</p>`;
  if (event.kind === 'stun') return `<p><strong>${name}</strong> cannot attack this round: stunned or forced to parry.</p>`;
  const target = esc(selected[1-event.side].name);
  let html = `<p><strong>${name}</strong> → ${target}: ${esc(event.attack)}. ${formatRolls(event.roll.dice)} + ${event.ob} OB − ${event.db} DB${event.modifier ? ` ${event.modifier >= 0 ? '+' : '−'} ${Math.abs(event.modifier)} effects` : ''} = <strong>${event.total}</strong>. ${esc(event.code)}: <strong>${esc(event.result)}</strong>${event.result === 'F' ? ' · attack fails' : ` · ${event.hits} hits`}.</p>`;
  const critical = event.critical;
  if (critical?.ignored) html += `<p class="coliseum-critical">${critical.severity} critical has no effect on this creature.</p>`;
  else if (critical) html += `<p class="coliseum-critical"><strong>${critical.severity} critical · ${esc(critical.code)} · roll ${critical.roll}</strong><br>${criticalEffectMarkup(critical.description)} ${criticalEffectMarkup(critical.effect,critical.description)}${critical.conditional ? '<br>Unsupported conditional clause needs GM review; supported and unconditional clauses applied.' : ''}</p>`;
  if(critical?.conditional||critical?.equipmentConditions?.length)html+=`<details class="coliseum-critical-source"><summary>Original conditional result</summary><p>${criticalEffectMarkup(critical.sourceDescription)} ${criticalEffectMarkup(critical.sourceEffect,critical.sourceDescription)}</p></details>`;
  if(critical?.recoils?.length)html+=`<p>Recoil ${critical.recoils.join(' / ')} ft requires the Encounters map; arena positions are not simulated.</p>`;
  if(critical?.manualEffects?.length)html+=critical.manualEffects.map(note=>`<p>${esc(note)}</p>`).join('');
  return html;
}

function renderRound(initialHealth) {
  renderFighterDetails();
  // Keep the live HUD and its starting HP until each resolved attack lands.
  // Rebuilding it with final HP first made playback look like healing.
  syncBattleScene(initialHealth);
  battleStage.querySelectorAll('[data-battle-roll],[data-battle-hits],[data-battle-critical]').forEach(field=>{field.textContent='—';});
  $('#coliseum-round').textContent = `Round ${fight.round}`;
  const entry = fight.log[0];
  const log = $('#coliseum-log');
  // Follow only readers already at the live edge; leave earlier rounds untouched.
  const firstRound = fight.round === 1;
  const follow = !firstRound && log.scrollWidth - log.clientWidth - log.scrollLeft <= 24;
  const previousScroll = log.scrollLeft;
  if (firstRound) log.replaceChildren();
  const detail = document.createElement('details');
  detail.className = 'coliseum-log-round'; detail.open = true;
  detail.innerHTML = `<summary>Round ${entry.round} · ${entry.events.filter(event => event.kind === 'attack').reduce((sum,event) => sum+event.hits,0)} attack hits</summary><p class="coliseum-initiative">Initiative: ${entry.initiative.map(({side,total}) => `${esc(selected[side].name)} ${total===null?'no roll':total}`).join(' · ')}</p>${entry.events.map(eventText).join('')}`;
  log.append(detail);
  log.scrollLeft = firstRound ? 0 : follow ? log.scrollWidth : previousScroll;
  if (fight.finished) {
    running = false;
    status(fight.winner === null ? `Draw after ${fight.round} rounds${fight.round >= ROUND_LIMIT ? ' — the arena round limit was reached' : ' — both creatures fell'}.` : `${selected[fight.winner].name} wins in ${fight.round} round${fight.round === 1 ? '' : 's'}!`);
  } else status(`${running ? 'Fighting' : 'Paused'} · round ${fight.round}.`);
  controls();
}

function resetFight() {
  running = false;
  runVersion++;
  cancelPlayback();
  updateCatalog();
  selected=selected.map((previous,index)=>{
    const contender=catalog.find(item=>item.id===previous?.id&&!item.unavailable)||creatures.find(item=>item.name===(index===0?'Wolf':'Tiger'))||creatures[index];
    return configureContender(contender,attacksByContender[sides[index]+':'+contender.id]);
  });
  renderEquipment();renderAttackChoices();sides.forEach(filterChoices);
  fight = createFight(...selected.map((creature,index)=>({...creature,equipment:equipmentFor(sides[index],index)})));
  fight.id=crypto.randomUUID();
  $('#coliseum-round').textContent = 'Ready';
  $('#coliseum-log').innerHTML = '<p class="play-muted">The gates are open. Start the fight or play one round at a time.</p>';
  $('#coliseum-log').scrollLeft = 0;
  status(`${selected[0].name} vs ${selected[1].name}.`);
  renderFighterDetails();renderBattleScene();controls();
  battleStage.querySelector('[data-battle-commentary]').textContent='The gates are open. Start the fight or play the next round.';
  try { localStorage.setItem(storageKey,JSON.stringify(selected.map(creature => creature.id))); } catch { /* Selection remains usable without storage. */ }
}

async function nextRound() {
  if(!ready||playback||fight.finished)return;
  const current=fight,controller=new AbortController();
  const initialHealth=fight.fighters.map(fighter=>Math.max(0,fighter.creature.hits-fighter.hits));
  playbackController=controller;playback=true;controls();
  try {
    stepFight(fight,tables);renderRound(initialHealth);
    await playBattleRound(battleStage,fight.log[0],initialHealth,{signal:controller.signal,speed:playbackSpeed,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches});
  }catch(error){running=false;status(`Fight paused: ${error.message}`);}
  finally {
    if(playbackController===controller&&fight===current){playbackController=null;playback=false;syncBattleScene();controls();}
  }
}

async function simulate() {
  if (!ready || running || playback || fight.finished) return;
  running = true; controls();
  const current = fight;
  const version = ++runVersion;
  while (running && version === runVersion && fight === current && !fight.finished) {
    await nextRound();
    await new Promise(resolve => setTimeout(resolve,90/playbackSpeed()));
  }
}

async function load() {
  if (ready || loading) return loading;
  $('#coliseum-retry').hidden = true;
  status('Loading creatures and combat tables…');
  loading = (async () => {
    try {
      const codes = ['creatures','T-5.8',...Array.from({length:8},(_,i)=>`A-10.9.${i+1}`),...Array.from({length:6},(_,i) => `A-10.10.${i+3}`)];
      const entries = await Promise.all(codes.map(async code => {
        const response = await fetch(`tables/${code}.json`);
        if (!response.ok) throw new Error(`Could not load ${code}`);
        return [code,await response.json()];
      }));
      tables = Object.fromEntries(entries);
      creatures = creatureCatalog(tables.creatures).sort((a,b) => a.name.localeCompare(b.name));
      masterEnemies=masterCharacterCatalog(tables['T-5.8']);updateCatalog();
      let saved;
      try { saved = JSON.parse(localStorage.getItem(storageKey)); } catch { saved = null; }
      selected = [0,1].map(index => catalog.find(creature => Array.isArray(saved) && creature.id === saved[index]) ||
        catalog.find(creature => creature.name === (index === 0 ? 'Wolf' : 'Tiger')) || catalog[index]);
      sides.forEach(filterChoices);
      ready = true; resetFight();
    } catch (error) { ready=false;status(`${error.message}. Retry to open the arena.`); $('#coliseum-retry').hidden = false; }
    finally { loading = null; controls(); }
  })();
  return loading;
}

sides.forEach((side,index) => {
  search(side).addEventListener('input',() => filterChoices(side,index));
  choice(side).addEventListener('change',() => {
    selected[index] = catalog.find(creature => creature.id === choice(side).value);
    resetFight();
  });
  for(const kind of ['attack','style'])$(`#coliseum-${kind}-${side}`).addEventListener('change',()=>{
    attacksByContender[side+':'+selected[index].id]={attackKey:$(`#coliseum-attack-${side}`).value,category:$(`#coliseum-style-${side}`).value};
    try{localStorage.setItem(attacksKey,JSON.stringify(attacksByContender));}catch{}
    resetFight();
  });
});
$('#coliseum-step').addEventListener('click',nextRound);
$('#coliseum-simulate').addEventListener('click',simulate);
$('#coliseum-reset').addEventListener('click',resetFight);
$('#coliseum-pause').addEventListener('click',() => { running = false; status(`Paused at round ${fight.round}.`); controls(); });
$('#coliseum-retry').addEventListener('click',load);
window.addEventListener('rolemaster-view-changed',event => {
  if (event.detail === 'coliseum') {if(ready)refreshCharacters();else load();}
  else if (running||playback) { running = false; runVersion++;cancelPlayback();status(`Paused at round ${fight.round}.`); controls(); }
});
function refreshCharacters() {
  if(!ready||!updateCatalog())return;
  if(!fight?.round)resetFight();
  else {sides.forEach(filterChoices);$('#coliseum-character-note').textContent+=' Character changes apply when you start a new fight.';}
}
window.addEventListener('rolemaster-roster-updated',refreshCharacters);
document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&(running||playback)){running=false;runVersion++;cancelPlayback();status(`Paused at round ${fight.round}.`);controls();}
});
if(location.hash==='#coliseum')document.querySelector('[data-view="coliseum"]').click();

window.addEventListener('rolemaster-coliseum-encounter',async event=>{
  await load();if(!ready)return;
  const foe=catalog.find(item=>item.id===event.detail?.foeId&&!item.unavailable);
  const hero=catalog.find(item=>item.id===event.detail?.heroId&&!item.unavailable);
  if(!foe){status('The generated opponent is unavailable.');return;}
  selected=[hero||selected[0],foe];resetFight();
  document.querySelector('[data-view="coliseum"]').click();
});
