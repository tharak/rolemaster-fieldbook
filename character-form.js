// Conversion between the editable sheet and a saved character record.
import {statNames} from './app-data.js';
import {$, $$} from './dom.js';

export function createCharacterForm({form, developedSkillRanks, syncLevelFromXp, makeStats, randomizePhysicalDetails, renderCategoryRecord, renderSkillTree, updateDevelopment}) {
  function formData() {
    const data = Object.fromEntries(new FormData(form).entries());
    data.skills = $$('.skill-row', $('#skills-list')).map(row => ({
      name: $('[name="skill-name"]', row).value,
      category: row.dataset.category,
      start: $('[name="skill-start"]', row).value,
      buy: row.dataset.pendingBuy || $('[name="skill-buy"]', row).value || '0',
      item: $('[name="skill-item"]', row).value,
      special: $('[name="skill-special"]', row).value,
      raceGrant: row.dataset.raceGrant || '',
      raceBase: Number(row.dataset.raceBase) || 0,
      languageSpent: Number(row.dataset.languageSpent) || 0,
      hobbySpent: Number(row.dataset.hobbySpent) || 0,
      packageBase: Number(row.dataset.packageBase) || 0,
      backgroundLanguageBase: Number(row.dataset.backgroundLanguageBase) || 0,
      backgroundSpecialBase: Number(row.dataset.backgroundSpecialBase) || 0,
      backgroundItemBase: Number(row.dataset.backgroundItemBase) || 0,
      skillClass: row.dataset.skillClass || 'auto',
      ranks: (Number($('[name="skill-start"]', row).value) || 0) + developedSkillRanks(row, Number(row.dataset.pendingBuy || $('[name="skill-buy"]', row).value) || 0)
    })).filter(skill => skill.name || Number(skill.start) || Number(skill.buy));
    const visibleCategories = new Set($$('.category-row', $('#skills-list')).map(row => row.dataset.category));
    data.categoryRanks = Object.fromEntries($$('.category-record-row').flatMap(row => {
      const start = $('[name="record-start"]', row)?.value || '0';
      const buy = row.dataset.pendingBuy || $('[name="record-buy"]', row)?.value || '0';
      const special = $('[name="record-special"]', row).value;
      const special2 = $('[name="record-special2"]', row).value;
      const raceBase = Number(row.dataset.raceBase) || 0;
      const hobbySpent = Number(row.dataset.hobbySpent) || 0;
      const packageBase = Number(row.dataset.packageBase) || 0;
      const backgroundSpecialBase = Number(row.dataset.backgroundSpecialBase) || 0;
      const trainingItemBase = Number(row.dataset.trainingItemBase) || 0;
      return visibleCategories.has(row.dataset.category) || Number(start) || Number(buy) || Number(special) || Number(special2) || raceBase || hobbySpent || packageBase || backgroundSpecialBase || trainingItemBase
        ? [[row.dataset.category, {start, buy, special, special2, raceBase, hobbySpent, packageBase, backgroundSpecialBase, trainingItemBase}]] : [];
    }));
    ['skill-name','skill-start','skill-buy','skill-item','skill-special','record-start','record-buy','record-special','record-special2','a4-start','a4-buy','a4-item','a4-special'].forEach(key => delete data[key]);
    data.stats = Object.fromEntries(statNames.map((name, index) => [name, Object.fromEntries(['temp','pot','basic','racial','special','total'].map(part => [part, data[`stat-${part}-${index}`] || '']))]));
    Object.keys(data).filter(key => /^stat-(temp|pot|basic|racial|special|total)-\d+$/.test(key)).forEach(key => delete data[key]);
    return data;
  }
  function fillForm(character = {}) {
    form.reset();
    for (const [key, value] of Object.entries(character)) {
      const field = form.elements.namedItem(key);
      if (field && typeof value !== 'object') field.value = key === 'realm' && value === 'Choose at table' ? 'None' : value;
    }
    if (!character.developmentLevel) form.elements.developmentLevel.value = String(Math.max(1, Number(character.level) || 1));
    syncLevelFromXp();
    makeStats(character.stats || {});
    if (!character.rolePhysicalGenerated) randomizePhysicalDetails(false);
    renderCategoryRecord(character);
    renderSkillTree(character);
    updateDevelopment();
  }
  return {formData, fillForm};
}
