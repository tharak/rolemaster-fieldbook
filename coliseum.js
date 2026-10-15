import './app.js';
import {$,esc} from './dom.js';
import {formatRolls} from './rules.js';
import {ROUND_LIMIT,attackTypes,creatureCatalog,createFight,stepFight} from './coliseum-rules.js';

const sides = ['left','right'];
const storageKey = 'rolemaster-coliseum-v1';
let catalog = [], tables = {}, selected = [], fight = null, running = false, ready = false, loading = null, runVersion = 0;
const status = text => { $('#coliseum-status').textContent = text; };
const choice = side => $(`#coliseum-select-${side}`);
const search = side => $(`#coliseum-search-${side}`);

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
      effect.kind === 'penalty' ? `−${effect.amount} OB` : effect.kind === 'bonus' ? `+${effect.amount} OB` :
      `${effect.kind === 'mustParry' ? 'Must parry' : effect.kind === 'noParry' ? 'No parry' : 'Stunned'} ${effect.roundsLeft} rounds`).join(' · ') || '';
    card.innerHTML = `<div class="coliseum-crest" aria-hidden="true">${esc(creature.name[0])}</div><span class="coliseum-kind">${creature.group} · Size ${esc(creature.size)}</span><h2>${esc(creature.name)}</h2><dl class="coliseum-stats"><div><dt>Level</dt><dd>${creature.level}</dd></div><div><dt>Armor</dt><dd>${creature.armor_type}</dd></div><div><dt>DB</dt><dd>${creature.db}</dd></div></dl><div class="coliseum-health-label"><span>Hits remaining</span><strong>${hits} / ${creature.hits}</strong></div><progress aria-label="${esc(creature.name)} hits remaining" value="${hits}" max="${creature.hits}"></progress><p class="coliseum-effects">${esc(effects)}</p><ul class="coliseum-attacks">${creature.attacks.filter(Boolean).map(attack => `<li>${attack.both ? 'Both attacks' : `${esc(attackTypes[attack.type][0])} · ${attack.ob >= 0 ? '+' : ''}${attack.ob} OB · ${esc(attack.size)}`}${attack.chance ? ` · ${attack.chance}%` : attack.follow ? ` · ${attack.follow === 'same' ? 'same-round' : 'next-round'} follow-up` : ' · optional'}</li>`).join('')}</ul><p class="coliseum-notes">${esc(creature.special || 'No special abilities listed.')}</p>`;
  });
}

function eventText(event) {
  const name = esc(selected[event.side].name);
  if (event.kind === 'bleed') return `<p><strong>${name}</strong> takes ${event.hits} bleeding hits.</p>`;
  if (event.kind === 'stun') return `<p><strong>${name}</strong> cannot attack this round: stunned or forced to parry.</p>`;
  const target = esc(selected[1-event.side].name);
  let html = `<p><strong>${name}</strong> → ${target}: ${esc(event.attack)}. ${formatRolls(event.roll.dice)} + ${event.ob} OB − ${event.db} DB${event.modifier ? ` ${event.modifier >= 0 ? '+' : '−'} ${Math.abs(event.modifier)} effects` : ''} = <strong>${event.total}</strong>. ${esc(event.code)}: <strong>${esc(event.result)}</strong>${event.result === 'F' ? ' · attack fails' : ` · ${event.hits} hits`}.</p>`;
  const critical = event.critical;
  if (critical?.ignored) html += `<p class="coliseum-critical">${critical.severity} critical has no effect on this creature.</p>`;
  else if (critical) html += `<p class="coliseum-critical"><strong>${critical.severity} critical · ${esc(critical.code)} · roll ${critical.roll}</strong><br>${esc(critical.description)} ${esc(critical.effect)}${critical.conditional ? '<br>Conditional result: numerical effects require GM review and were not applied.' : ''}</p>`;
  return html;
}

function renderRound() {
  renderFighters();
  $('#coliseum-round').textContent = `Round ${fight.round}`;
  const entry = fight.log[0];
  const log = $('#coliseum-log');
  log.querySelector('details[open]')?.removeAttribute('open');
  if (fight.round === 1) log.replaceChildren();
  const detail = document.createElement('details');
  detail.className = 'coliseum-log-round'; detail.open = true;
  detail.innerHTML = `<summary>Round ${entry.round} · ${entry.events.filter(event => event.kind === 'attack').reduce((sum,event) => sum+event.hits,0)} attack hits</summary><p class="coliseum-initiative">Initiative: ${entry.initiative.map(({side,total}) => `${esc(selected[side].name)} ${total}`).join(' · ')}</p>${entry.events.map(eventText).join('')}`;
  log.prepend(detail);
  if (fight.finished) {
    running = false;
    status(fight.winner === null ? `Draw after ${fight.round} rounds${fight.round >= ROUND_LIMIT ? ' — the arena round limit was reached' : ' — both creatures fell'}.` : `${selected[fight.winner].name} wins in ${fight.round} round${fight.round === 1 ? '' : 's'}!`);
  } else status(`${running ? 'Fighting' : 'Paused'} · round ${fight.round}.`);
  controls();
}

function resetFight() {
  running = false;
  runVersion++;
  fight = createFight(...selected);
  $('#coliseum-round').textContent = 'Ready';
  $('#coliseum-log').innerHTML = '<p class="play-muted">The gates are open. Start the fight or play one round at a time.</p>';
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
      ready = true; resetFight();
    } catch (error) { status(`${error.message}. Retry to open the arena.`); $('#coliseum-retry').hidden = false; }
    finally { loading = null; controls(); }
  })();
  return loading;
}

sides.forEach((side,index) => {
  search(side).addEventListener('input',() => filterChoices(side,index));
  choice(side).addEventListener('change',() => {
    selected[index] = catalog.find(creature => creature.id === choice(side).value);
    resetFight(); filterChoices(side,index);
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
