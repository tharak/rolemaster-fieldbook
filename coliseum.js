import './app.js';
import {$,esc} from './dom.js';
import {formatRolls} from './rules.js';
import {creatureSymbol,duelSymbol} from './coliseum-symbols.js';
import {criticalEquipment} from './critical-equipment.js';
import {criticalEffectMarkup,criticalLegend,useEmojis,setUseEmojis} from './critical-presentation.js';
import {ROUND_LIMIT,attackTypes,creatureCatalog,createFight,stepFight} from './coliseum-rules.js';

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
let catalog = [], tables = {}, selected = [], fight = null, running = false, ready = false, loading = null, runVersion = 0;
const status = text => { $('#coliseum-status').textContent = text; };
const choice = side => $(`#coliseum-select-${side}`);
const search = side => $(`#coliseum-search-${side}`);
const equipmentKey='rolemaster-coliseum-equipment-v1';
let equipmentByContender={};
try {const saved=JSON.parse(localStorage.getItem(equipmentKey));if(saved&&typeof saved==='object'&&!Array.isArray(saved))equipmentByContender=saved;}catch{}
const equipmentFor=(side,index)=>{const value=equipmentByContender[side+':'+selected[index]?.id];return Array.isArray(value)?value:[];};
function renderEquipment(){sides.forEach((side,index)=>{const list=$(`#coliseum-equipment-${side}`);list.innerHTML=`<legend>Equipment on ${esc(selected[index]?.name||side)}</legend>`+criticalEquipment.map(([key,label])=>`<label><input type="checkbox" data-gear="${esc(key)}"${equipmentFor(side,index).includes(key)?' checked':''}> ${esc(label)}</label>`).join('');});}
for(const [index,side] of sides.entries())$(`#coliseum-equipment-${side}`).addEventListener('change',()=>{equipmentByContender[side+':'+selected[index].id]=[...$(`#coliseum-equipment-${side}`).querySelectorAll('input:checked')].map(el=>el.dataset.gear);try{localStorage.setItem(equipmentKey,JSON.stringify(equipmentByContender));}catch{} if(!fight?.round)fight=createFight(...selected.map((creature,i)=>({...creature,equipment:equipmentFor(sides[i],i)})));});

function filterChoices(side,index) {
  const query = search(side).value.trim().toLowerCase();
  const matches = catalog.filter(creature => `${creature.name} ${creature.group}`.toLowerCase().includes(query));
  const items = matches.includes(selected[index]) ? matches : [selected[index],...matches].filter(Boolean);
  choice(side).replaceChildren(...items.map(creature => {
    const option = document.createElement('option');
    option.value = creature.id;
    option.textContent = `${creature.name} · Lvl ${creature.level} · ${creature.group}${matches.includes(creature) ? '' : ' (selected)'}`;
    return option;
  }));
  choice(side).value = selected[index]?.id || '';
  $(`#coliseum-match-${side}`).textContent = `${matches.length} matching creatures${matches.length ? '' : '. Try another name.'}`;
}

function controls() {
  const ended = fight?.finished;
  $('#coliseum-simulate').disabled = !ready || running || ended;
  $('#coliseum-step').disabled = !ready || running || ended;
  $('#coliseum-reset').disabled = !ready;
  $('#coliseum-pause').hidden = !running;
  for (const side of sides) { choice(side).disabled = !ready || running; search(side).disabled = !ready || running; }
  document.querySelectorAll('[data-gear]').forEach(input=>{input.disabled=!ready||running||fight?.round>0;});
  $('#coliseum-simulate').textContent = fight?.round && !ended ? 'Continue fight' : 'Simulate fight';
}

function renderFighters() {
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

function renderRound() {
  renderFighters();
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
  fight = createFight(...selected.map((creature,index)=>({...creature,equipment:equipmentFor(sides[index],index)})));
  $('#coliseum-round').textContent = 'Ready';
  $('#coliseum-log').innerHTML = '<p class="play-muted">The gates are open. Start the fight or play one round at a time.</p>';
  $('#coliseum-log').scrollLeft = 0;
  status(`${selected[0].name} vs ${selected[1].name}.`);
  renderFighters(); controls();
  try { localStorage.setItem(storageKey,JSON.stringify(selected.map(creature => creature.id))); } catch { /* Selection remains usable without storage. */ }
}

function nextRound() {
  try { stepFight(fight,tables); renderRound(); }
  catch (error) { running = false; status(`Fight paused: ${error.message}`); controls(); }
}

async function simulate() {
  if (!ready || running || fight.finished) return;
  running = true; controls();
  const current = fight;
  const version = ++runVersion;
  while (running && version === runVersion && fight === current && !fight.finished) {
    nextRound();
    await new Promise(resolve => setTimeout(resolve,90));
  }
}

async function load() {
  if (ready || loading) return loading;
  $('#coliseum-retry').hidden = true;
  status('Loading creatures and combat tables…');
  loading = (async () => {
    try {
      const codes = ['creatures','A-10.9.2','A-10.9.7','A-10.9.8',...Array.from({length:6},(_,i) => `A-10.10.${i+3}`)];
      const entries = await Promise.all(codes.map(async code => {
        const response = await fetch(`tables/${code}.json`);
        if (!response.ok) throw new Error(`Could not load ${code}`);
        return [code,await response.json()];
      }));
      tables = Object.fromEntries(entries);
      catalog = creatureCatalog(tables.creatures).sort((a,b) => a.name.localeCompare(b.name));
      let saved;
      try { saved = JSON.parse(localStorage.getItem(storageKey)); } catch { saved = null; }
      selected = [0,1].map(index => catalog.find(creature => Array.isArray(saved) && creature.id === saved[index]) ||
        catalog.find(creature => creature.name === (index === 0 ? 'Wolf' : 'Tiger')) || catalog[index]);
      sides.forEach(filterChoices);
      ready = true; renderEquipment(); resetFight();
    } catch (error) { status(`${error.message}. Retry to open the arena.`); $('#coliseum-retry').hidden = false; }
    finally { loading = null; controls(); }
  })();
  return loading;
}

sides.forEach((side,index) => {
  search(side).addEventListener('input',() => filterChoices(side,index));
  choice(side).addEventListener('change',() => {
    selected[index] = catalog.find(creature => creature.id === choice(side).value);
    renderEquipment(); resetFight(); filterChoices(side,index);
  });
});
$('#coliseum-step').addEventListener('click',nextRound);
$('#coliseum-simulate').addEventListener('click',simulate);
$('#coliseum-reset').addEventListener('click',resetFight);
$('#coliseum-pause').addEventListener('click',() => { running = false; status(`Paused at round ${fight.round}.`); controls(); });
$('#coliseum-retry').addEventListener('click',load);
window.addEventListener('rolemaster-view-changed',event => {
  if (event.detail === 'coliseum') load();
  else if (running) { running = false; status(`Paused at round ${fight.round}.`); controls(); }
});
