// XP awards, level development, and advancement history for the current sheet.
import {statNames} from './app-data.js';
import {xpForLevel, levelForXp, rollStatGain} from './character-rules.js';
import {$, $$, esc} from './dom.js';

export function createCharacterAdvancement({form, developedSkillRanks, updateSkillBuyOptions, updateDevelopment, saveCurrent, renderPlay, showView, openApprenticeshipPicker}) {
  function readStatGainHistory() {
    try {
      const history = JSON.parse(form.elements.statGainHistory.value || '[]');
      return Array.isArray(history) ? history : [];
    } catch { return []; }
  }
  function currentDevelopmentLevel() { return Math.max(1, Math.trunc(Number(form.elements.developmentLevel.value) || 1)); }
  function syncLevelFromXp() { form.elements.level.value = String(levelForXp(form.elements.xp.value)); }
  function readXpHistory() { try { const value = JSON.parse(form.elements.xpHistory.value || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } }
  function readLevelHistory() { try { const value = JSON.parse(form.elements.levelHistory.value || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } }
  function levelAdvanceIssue() {
    if (Number($('#dp-remaining').textContent) < 0) return 'Resolve overspent development points before advancing.';
    if (statNames.some((_, index) => {
      const temp = Number(form.elements.namedItem(`stat-temp-${index}`).value);
      const pot = Number(form.elements.namedItem(`stat-pot-${index}`).value);
      return !Number.isInteger(temp) || temp < 1 || !Number.isInteger(pot) || pot < temp;
    })) return 'Set all temporary and potential stats before advancing.';
    return '';
  }
  function advanceLevel() {
    const next = currentDevelopmentLevel() + 1;
    if (next > levelForXp(form.elements.xp.value) || levelAdvanceIssue()) return;
    const snapshot = {level:currentDevelopmentLevel(), xp:Number(form.elements.xp.value) || 0, skills:[], categories:[], remaining:Number($('#dp-remaining').textContent) || 0};
    $$('.skill-row', $('#skills-list')).forEach(row => {
      const buy = Number($('[name="skill-buy"]', row).value) || 0;
      if (buy) snapshot.skills.push({category:row.dataset.category, name:$('[name="skill-name"]', row).value, bought:buy, gained:developedSkillRanks(row, buy)});
      $('[name="skill-start"]', row).value = String((Number($('[name="skill-start"]', row).value) || 0) + developedSkillRanks(row, buy));
      updateSkillBuyOptions(row, 0);
      delete row.dataset.pendingBuy;
    });
    $$('.category-record-row', $('#category-record-list')).forEach(row => {
      const buy = $('[name="record-buy"]', row);
      if (!buy) return;
      const count = Number(buy.value) || 0;
      if (count) snapshot.categories.push({category:row.dataset.category, bought:count});
      $('[name="record-start"]', row).value = String((Number($('[name="record-start"]', row).value) || 0) + count);
      updateSkillBuyOptions(row, 0);
      delete row.dataset.pendingBuy;
    });
    form.elements.levelHistory.value = JSON.stringify([...readLevelHistory(), snapshot]);
    form.elements.spellDevelopmentOrder.value = '[]';
    form.elements.otherDp.value = '0';
    form.elements.developmentLevel.value = String(next);
    const history = readStatGainHistory();
    statNames.forEach((stat, index) => {
      const temp = form.elements.namedItem(`stat-temp-${index}`), pot = form.elements.namedItem(`stat-pot-${index}`);
      const before = Number(temp.value), potential = Number(pot.value);
      if (!Number.isInteger(before) || before < 1 || !Number.isInteger(potential) || potential < 1) return;
      const {dice, after} = rollStatGain(before, potential);
      temp.value = String(after);
      history.push({stat, before, after, dice, cost:0, source:`level:${next}`, level:next});
    });
    form.elements.statGainHistory.value = JSON.stringify(history);
    form.elements.apprenticeshipDpBase.value = '';
    updateDevelopment();
    form.elements.apprenticeshipDpBase.value = $('#dp-available').textContent === '—' ? '' : $('#dp-available').textContent;
    saveCurrent();
    renderPlay();
  }
  function renderPlayExperience() {
    const xp = Math.max(0, Math.trunc(Number(form.elements.xp.value) || 0));
    const level = levelForXp(xp), developed = currentDevelopmentLevel();
    const start = xpForLevel(level), next = xpForLevel(level + 1);
    const progress = Math.max(0, Math.min(100, (xp - start) / (next - start) * 100));
    const history = readXpHistory().slice(-5).reverse();
    const issue = levelAdvanceIssue();
    const statRolls = readStatGainHistory().filter(entry => entry.source === `level:${developed}`);
    return `<section class="play-card play-xp-card"><div class="play-xp-heading"><div><h2>Experience & level</h2><p class="play-muted">Level ${level} · ${xp.toLocaleString()} XP</p></div><strong>${Math.max(0, next - xp).toLocaleString()} to level ${level + 1}</strong></div><div class="play-xp-track" role="progressbar" aria-valuenow="${Math.max(start, xp)}" aria-valuemin="${start}" aria-valuemax="${next}" aria-label="Experience toward level ${level + 1}"><span style="width:${progress}%"></span></div><form id="play-xp-form" class="play-xp-form"><label>XP gained or lost<input name="amount" type="number" step="1" required placeholder="e.g. 250 or -100"></label><label>Reason<input name="reason" type="text" maxlength="100" placeholder="Session, quest, correction…"></label><button type="submit" class="button button-dark">Record XP</button></form>${level > developed ? `<div class="play-level-ready"><span>${level - developed} level${level - developed === 1 ? '' : 's'} ready to develop${issue ? `<small>${esc(issue)}</small>` : ''}</span><button type="button" class="button button-dark" id="advance-character-level"${issue ? ' disabled' : ''}>Advance to level ${developed + 1}</button></div>` : ''}${developed > 1 ? `<div class="play-level-ready"><span>Level ${developed} development · ${esc($('#dp-remaining').textContent)} DP remaining</span><button type="button" class="button button-quiet" id="spend-level-dp">Spend DP</button></div>` : ''}${statRolls.length ? `<details class="play-xp-history"><summary>Level ${developed} stat gain rolls</summary><ul>${statRolls.map(entry => `<li><span>${esc(entry.stat)} <small>${esc(entry.dice.join(' + '))}</small></span><strong>${esc(entry.before)} → ${esc(entry.after)}</strong></li>`).join('')}</ul></details>` : ''}${history.length ? `<details class="play-xp-history"><summary>Recent XP</summary><ul>${history.map(entry => `<li><span>${esc(entry.reason || 'XP adjustment')} <small>${esc(entry.date || '')}</small></span><strong>${entry.amount >= 0 ? '+' : ''}${Number(entry.amount).toLocaleString()}</strong></li>`).join('')}</ul><button type="button" id="undo-xp-award" class="button button-quiet">Undo latest XP entry</button></details>` : ''}</section>`;
  }
  $('#play-character-content').addEventListener('click', event => {
    if (event.target.closest('#advance-character-level')) { advanceLevel(); return; }
    if (event.target.closest('#spend-level-dp')) { showView('editor'); openApprenticeshipPicker(); return; }
    if (event.target.closest('#undo-xp-award')) {
      const history = readXpHistory(), latest = history.pop();
      if (!latest) return;
      form.elements.xp.value = String(latest.before);
      form.elements.xpHistory.value = JSON.stringify(history);
      saveCurrent(); renderPlay();
      return;
    }
  });
  $('#play-character-content').addEventListener('submit', event => {
    if (event.target.id === 'play-xp-form') {
      event.preventDefault();
      const amount = Number(event.target.elements.amount.value);
      const before = Number(form.elements.xp.value) || 0;
      if (!Number.isSafeInteger(amount) || !amount || !Number.isSafeInteger(before + amount) || before + amount < 0) return;
      const history = readXpHistory();
      history.push({before, amount, reason:event.target.elements.reason.value.trim(), date:new Date().toLocaleDateString()});
      form.elements.xpHistory.value = JSON.stringify(history);
      form.elements.xp.value = String(before + amount);
      saveCurrent(); renderPlay();
      return;
    }
  });
  form.addEventListener('input', event => {
    if (event.target.name === 'xp') syncLevelFromXp();
  });
  return {currentDevelopmentLevel, syncLevelFromXp, readStatGainHistory, renderPlayExperience};
}
