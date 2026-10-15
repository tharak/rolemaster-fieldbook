// Stat fields, potential assignment, and resistance outputs.
import {statNames, primeStats, raceStats, raceResistances, resistanceTypes} from './app-data.js';
import {basicStatBonus, fixedPotential, rolledPotential} from './character-rules.js';
import {$, esc} from './dom.js';

export function createStatSheet({form, saveCurrent}) {
  function makeStats(stats = {}) {
    $('#stats-list').innerHTML = statNames.map((name, index) => {
      const value = stats[name] || {};
      return `<div class="stat-row"><span>${name}</span><input aria-label="${name} temporary stat" name="stat-temp-${index}" type="number" min="1" max="100" value="${esc(value.temp ?? '')}" placeholder="—"><input aria-label="${name} potential stat" name="stat-pot-${index}" type="number" min="20" max="101" value="${esc(value.pot ?? '')}" placeholder="—" readonly><input aria-label="${name} basic bonus" name="stat-basic-${index}" type="number" value="${esc(value.basic ?? '')}" placeholder="—" readonly><input aria-label="${name} racial bonus" name="stat-racial-${index}" type="number" value="${esc(value.racial ?? '')}" placeholder="—" readonly><input aria-label="${name} special bonus" name="stat-special-${index}" type="number" value="${esc(value.special ?? '')}" placeholder="—" readonly><input aria-label="${name} total bonus" name="stat-total-${index}" type="number" value="${esc(value.total ?? '')}" placeholder="—" readonly></div>`;
    }).join('');
  }
  function makeResistances() {
    $('#resistance-grid').innerHTML = `<div class="rr-head"><span>Type</span><span>Race</span><span>Stat</span><span>Other</span><span>Total</span></div>${resistanceTypes.map(([key, label]) => `<div class="rr-row"><span>${label}</span><output id="rr-race-${key}">—</output><output id="rr-stat-${key}">—</output><input aria-label="${label} other resistance bonus" name="rr-other-${key}" type="number" value="0"><output id="rr-total-${key}">—</output></div>`).join('')}`;
  }
  function applyProfessionStatDefaults() {
    const primes = primeStats[form.elements.profession.value] || [];
    statNames.forEach((name, index) => {
      form.elements.namedItem(`stat-temp-${index}`).value = primes.includes(name) ? '90' : '20';
      form.elements.namedItem(`stat-pot-${index}`).value = '';
    });
  }
  function updatePotentialStat(index, calculate) {
    const temporaryField = form.elements.namedItem(`stat-temp-${index}`);
    const temporary = Number(temporaryField.value);
    form.elements.namedItem(`stat-pot-${index}`).value = temporaryField.value !== '' && Number.isInteger(temporary) && temporary >= 20 && temporary <= 100
      ? String(calculate(temporary)) : '';
  }
  function setPotentialStats(calculate, method) {
    statNames.forEach((_, index) => updatePotentialStat(index, calculate));
    form.elements.potentialMethod.value = method;
  }
  function updateRuleBonuses() {
    const race = form.elements.race.value;
    const racial = raceStats[race] || raceStats['Common Man'];
    const totals = statNames.map((_, index) => {
      const temporary = form.elements.namedItem(`stat-temp-${index}`).value;
      const basic = form.elements.namedItem(`stat-basic-${index}`);
      const raceField = form.elements.namedItem(`stat-racial-${index}`);
      const special = form.elements.namedItem(`stat-special-${index}`);
      const total = form.elements.namedItem(`stat-total-${index}`);
      raceField.value = String(racial[index]);
      const value = Number(temporary);
      basic.value = temporary !== '' && Number.isInteger(value) && value >= 1 && value <= 100 ? String(basicStatBonus(value)) : '';
      total.value = basic.value ? String(Number(basic.value) + racial[index] + (Number(special.value) || 0)) : '';
      return total.value === '' ? null : Number(total.value);
    });
    const rr = raceResistances[race] || raceResistances['Common Man'];
    resistanceTypes.forEach(([key, , statIndex, raceIndex]) => {
      const stat = totals[statIndex] === null ? null : 3 * totals[statIndex];
      const other = Number(form.elements.namedItem(`rr-other-${key}`).value) || 0;
      $(`#rr-race-${key}`).textContent = String(rr[raceIndex]);
      $(`#rr-stat-${key}`).textContent = stat === null ? '—' : String(stat);
      $(`#rr-total-${key}`).textContent = stat === null ? '—' : String(rr[raceIndex] + stat + other);
    });
  }
  function rollStatPool() {
    const dice = Array.from({length: 10}, () => Math.floor(Math.random() * 10) + 1);
    form.elements.statRoll.value = String(dice.reduce((sum, value) => sum + value, 0));
    form.elements.statDice.value = dice.join(',');
  }
  function ensureStatRoll() {
    const roll = Number(form.elements.statRoll.value);
    if (Number.isInteger(roll) && roll >= 10 && roll <= 100) return false;
    rollStatPool();
    return true;
  }
  $('#rolled-stat-pool').addEventListener('click', () => {
    rollStatPool();
    form.elements.statPoolMode.value = 'roll';
    saveCurrent();
  });
  $('#fixed-stat-pool').addEventListener('click', () => {
    form.elements.statPoolMode.value = '660';
    saveCurrent();
  });
  $('#roll-potentials').addEventListener('click', () => { setPotentialStats(rolledPotential, 'roll'); saveCurrent(); });
  $('#fixed-potentials').addEventListener('click', () => { setPotentialStats(fixedPotential, 'fixed'); saveCurrent(); });
  form.addEventListener('input', event => {
    const match = /^stat-temp-(\d+)$/.exec(event.target.name || '');
    if (match) updatePotentialStat(Number(match[1]), form.elements.potentialMethod.value === 'roll' ? rolledPotential : fixedPotential);
  });
  return {makeStats, makeResistances, applyProfessionStatDefaults, setPotentialStats, updateRuleBonuses, ensureStatRoll};
}
