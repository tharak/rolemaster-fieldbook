(() => {
  const STORAGE_KEY = 'rolemaster-fieldbook-characters-v1';
  const statNames = ['Agility', 'Constitution', 'Memory', 'Reasoning', 'Self Discipline', 'Empathy', 'Intuition', 'Presence', 'Quickness', 'Strength'];
  let tables = [];
  let activeTable = null;
  const tableCache = new Map();
  let developmentRules = null;
  const realmByProfession = {Fighter:'Choose at table',Thief:'Choose at table',Rogue:'Choose at table',Cleric:'Channeling',Magician:'Essence',Mentalist:'Mentalism',Ranger:'Channeling',Dabbler:'Essence',Bard:'Mentalism'};
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const form = $('#character-form');
  let characters = readCharacters();
  let currentId = null;
  let activeTableGroup = 'all';
  const primeStats = {Fighter:['Strength','Constitution'], Thief:['Agility','Quickness'], Rogue:['Agility','Strength'], Cleric:['Intuition','Memory'], Magician:['Empathy','Reasoning'], Mentalist:['Presence','Self Discipline'], Ranger:['Intuition','Constitution'], Dabbler:['Empathy','Agility'], Bard:['Presence','Memory']};
  const raceAllowances = {'Common Man':[12,8,6], 'High Man':[10,12,4], 'Wood Elf':[10,12,4], Dwarf:[12,8,5], Halfling:[12,6,5]};
  const raceStats = {
    'Common Man':[0,0,0,0,2,0,0,0,0,2],
    'High Man':[-2,4,0,0,0,0,0,4,-2,4],
    'Wood Elf':[4,0,2,0,-5,2,0,2,2,0],
    Dwarf:[-2,6,0,0,2,-4,0,-4,-2,2],
    Halfling:[6,6,0,0,-4,-2,0,-6,4,-8]
  };
  const raceResistances = {
    'Common Man':[0,0,0,0,0,0],
    'High Man':[-5,-5,-5,0,0,0],
    'Wood Elf':[-5,-5,-5,10,100,0],
    Dwarf:[40,0,40,20,15,0],
    Halfling:[50,0,40,30,15,0]
  };
  const resistanceTypes = [
    ['channeling','Channeling',6,1], ['essence','Essence',5,0],
    ['mentalism','Mentalism',7,2], ['poison','Poison',1,3],
    ['disease','Disease',1,4], ['fear','Fear',4,5]
  ];

  function readCharacters() {
    try { const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); return Array.isArray(data) ? data : []; }
    catch { return []; }
  }
  function writeCharacters() { localStorage.setItem(STORAGE_KEY, JSON.stringify(characters)); }
  function esc(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
  function makeStats(stats = {}) {
    $('#stats-list').innerHTML = statNames.map((name, index) => {
      const value = stats[name] || {};
      return `<div class="stat-row"><span>${name}</span><input aria-label="${name} temporary stat" name="stat-temp-${index}" type="number" min="20" max="100" value="${esc(value.temp ?? '')}" placeholder="—"><input aria-label="${name} potential stat" name="stat-pot-${index}" type="number" min="20" max="101" value="${esc(value.pot ?? '')}" placeholder="—"><input aria-label="${name} basic bonus" name="stat-basic-${index}" type="number" value="${esc(value.basic ?? '')}" placeholder="—" readonly><input aria-label="${name} racial bonus" name="stat-racial-${index}" type="number" value="${esc(value.racial ?? '')}" placeholder="—" readonly><input aria-label="${name} special bonus" name="stat-special-${index}" type="number" value="${esc(value.special ?? '')}" placeholder="—"><input aria-label="${name} total bonus" name="stat-total-${index}" type="number" value="${esc(value.total ?? '')}" placeholder="—" readonly></div>`;
    }).join('');
  }
  function makeResistances() {
    $('#resistance-grid').innerHTML = `<div class="rr-head"><span>Type</span><span>Race</span><span>Stat</span><span>Other</span><span>Total</span></div>${resistanceTypes.map(([key, label]) => `<div class="rr-row"><span>${label}</span><output id="rr-race-${key}">—</output><output id="rr-stat-${key}">—</output><input aria-label="${label} other resistance bonus" name="rr-other-${key}" type="number" value="0"><output id="rr-total-${key}">—</output></div>`).join('')}`;
  }
  function skillRow(skill = {}) {
    const row = document.createElement('div'); row.className = 'skill-row';
    const categories = Object.keys(developmentRules?.categories || {});
    const categoryOptions = categories.map(category => `<option value="${esc(category)}" ${skill.category === category ? 'selected' : ''}>${esc(category)}</option>`).join('');
    row.innerHTML = `<label class="skill-cell"><small>Skill</small><input aria-label="Skill name" name="skill-name" maxlength="60" placeholder="Skill name" value="${esc(skill.name || '')}"></label><label class="skill-cell"><small>Category</small><select aria-label="Skill category" name="skill-category">${categoryOptions}</select></label><label class="skill-cell"><small>Before</small><input aria-label="Ranks before this level" name="skill-start" type="number" min="0" max="99" placeholder="0" value="${esc(skill.start ?? skill.ranks ?? 0)}"></label><label class="skill-cell"><small>Buy</small><select aria-label="Ranks purchased this level" name="skill-buy"></select></label><span class="skill-dp-cost">0 DP</span><button type="button" class="remove-skill" aria-label="Remove skill">×</button>`;
    const category = $('[name="skill-category"]', row);
    if (skill.category && categories.includes(skill.category)) category.value = skill.category;
    if (!developmentRules && skill.buy) row.dataset.pendingBuy = skill.buy;
    if (!developmentRules && skill.category) row.dataset.pendingCategory = skill.category;
    $('.remove-skill', row).addEventListener('click', () => { row.remove(); updateDevelopment(); saveCurrent(); });
    $('#skills-list').append(row);
    updateSkillBuyOptions(row, Number(skill.buy) || 0);
    category.addEventListener('change', () => { updateSkillBuyOptions(row); updateDevelopment(); saveCurrent(); });
    $('[name="skill-buy"]', row).addEventListener('change', () => { updateDevelopment(); saveCurrent(); });
    $('[name="skill-start"]', row).addEventListener('input', () => { updateDevelopment(); saveCurrent(); });
    $('[name="skill-name"]', row).addEventListener('input', saveCurrent);
  }
  function costForSkill(row, profession) {
    const category = $('[name="skill-category"]', row).value;
    return developmentRules?.categories?.[category]?.[profession] || null;
  }
  function updateSkillBuyOptions(row, preferred) {
    const costs = costForSkill(row, form.elements.profession.value);
    const buy = $('[name="skill-buy"]', row);
    const max = costs?.length || 0;
    const previous = Math.min(preferred ?? (Number(buy.value) || Number(row.dataset.pendingBuy) || 0), max);
    buy.innerHTML = Array.from({length: max + 1}, (_, rank) => `<option value="${rank}">${rank}</option>`).join('');
    buy.value = String(previous);
    buy.disabled = !max;
    if (max) delete row.dataset.pendingBuy;
    row.classList.toggle('unavailable', !max);
  }
  function updateDevelopment() {
    if (!$('#dp-available')) return;
    const developmentIndices = [0, 1, 2, 3, 4];
    const values = developmentIndices.map(index => Number(form.elements.namedItem(`stat-temp-${index}`).value));
    const hasStats = values.every(value => Number.isFinite(value) && value >= 1 && value <= 101);
    const available = hasStats ? Math.round(values.reduce((sum, value) => sum + value, 0) / 5) : null;
    if (hasStats) $('#dp-available').textContent = String(available); else $('#dp-available').textContent = '—';
    const profession = form.elements.profession.value;
    let spent = 0;
    $$('.skill-row', $('#skills-list')).forEach(row => {
      const costs = costForSkill(row, profession);
      const ranks = Number($('[name="skill-buy"]', row).value) || 0;
      const cost = costs ? costs.slice(0, ranks).reduce((sum, value) => sum + value, 0) : 0;
      const start = Number($('[name="skill-start"]', row).value) || 0;
      spent += cost;
      $('.skill-dp-cost', row).textContent = `${cost} DP · ${start + ranks} total`;
    });
    spent += Number(form.elements.otherDp.value) || 0;
    $('#dp-spent').textContent = String(spent);
    const remaining = hasStats ? available - spent : null;
    $('#dp-remaining').textContent = remaining === null ? '—' : String(remaining);
    $('#dp-remaining').classList.toggle('over-budget', remaining !== null && remaining < 0);
    $$('.skill-row', $('#skills-list')).forEach(row => updateSkillBuyOptions(row));
    updateSheetHints();
  }
  function statCost(value) { return value <= 90 ? value : 90 + (value - 90) ** 2; }
  function basicStatBonus(value) {
    if (value === 100) return 10;
    if (value >= 90) return 5 + Math.floor((value - 90) / 2);
    if (value >= 70) return 1 + Math.floor((value - 70) / 5);
    if (value >= 31) return 0;
    if (value >= 11) return -1 - Math.floor((30 - value) / 5);
    return -5 - Math.floor((10 - value) / 2);
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
      basic.value = temporary !== '' && Number.isInteger(value) && value >= 20 && value <= 100 ? String(basicStatBonus(value)) : '';
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
  function fixedPotential(value) {
    const bands = [[24,44],[34,39],[44,33],[54,28],[64,22],[74,17],[84,11],[91,6],[92,5],[94,4],[96,3],[98,2],[100,1]];
    return Math.min(101, value + (bands.find(([high]) => value <= high)?.[1] || 0));
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
  function updateSheetHints() {
    updateRuleBonuses();
    const mode = form.elements.statPoolMode.value;
    const roll = Number(form.elements.statRoll.value);
    const validRoll = Number.isInteger(roll) && roll >= 10 && roll <= 100;
    const budget = mode === '660' ? 660 : mode === 'roll' && validRoll ? 600 + roll : null;
    $('#stat-roll-preview').textContent = validRoll ? String(roll) : '—';
    $('#rolled-stat-pool').setAttribute('aria-label', validRoll ? `Use 10d10 roll of ${roll}` : 'Use 10d10 roll');
    $('#rolled-stat-pool').setAttribute('aria-pressed', String(mode === 'roll'));
    $('#fixed-stat-pool').setAttribute('aria-pressed', String(mode === '660'));
    $('#stat-pool-print-addend').textContent = mode === '660' ? '60' : mode === 'roll' && validRoll ? String(roll) : '—';
    $('#stat-pool-total').textContent = budget === null ? '—' : String(budget);
    const values = statNames.map((_, index) => Number(form.elements.namedItem(`stat-temp-${index}`).value) || 0);
    const spent = values.reduce((sum, value) => sum + statCost(value), 0);
    const remaining = budget === null ? 'Choose a stat pool.' : `${spent} of ${budget} points assigned · ${budget - spent} remaining`;
    $('#stat-budget').textContent = remaining;
    $('#stat-budget').classList.toggle('over-budget', budget !== null && spent > budget);
    const primes = primeStats[form.elements.profession.value] || [];
    $$('.stat-row', $('#stats-list')).forEach((row, index) => {
      const isPrime = primes.includes(statNames[index]);
      row.classList.toggle('is-prime', isPrime);
      row.firstElementChild.title = isPrime ? 'Prime stat (minimum 90)' : '';
    });
    const missing = primes.filter(name => values[statNames.indexOf(name)] < 90);
    $('#prime-stats').textContent = `Prime stats: ${primes.join(' and ')} · each must be at least 90${missing.length ? ` (${missing.join(', ')} below 90)` : ''}`;
    const requiredRealm = realmByProfession[form.elements.profession.value];
    $('#profession-info').textContent = `${primes.join(' and ')} are prime stats (90 minimum). ${requiredRealm === 'Choose at table' ? 'Choose Essence, Channeling or Mentalism as your realm.' : `${requiredRealm} is this profession’s realm.`}`;
    const [hobby, language, background] = raceAllowances[form.elements.race.value] || [0,0,0];
    $('#race-allowance').textContent = `${form.elements.race.value}: ${background} background options, ${hobby} hobby ranks and ${language} extra language ranks.`;
    $('#stat-dice').textContent = form.elements.statDice.value ? `10d10: ${form.elements.statDice.value.split(',').join(' + ')} = ${form.elements.statRoll.value}` : '';
    for (const [name, limit] of [['hobbyUsed',hobby],['languageUsed',language],['backgroundUsed',background]]) {
      const field = form.elements[name];
      field.classList.toggle('over-budget', Number(field.value) > limit);
    }
    let check = '';
    if (budget === null) check = 'Roll 10d10 or choose Fixed 60 to set your stat pool.';
    else if (values.some(value => !Number.isInteger(value) || value < 20 || value > 100)) check = 'Enter all 10 temporary stats (20–100).';
    else if (missing.length) check = 'Each prime stat must be at least 90.';
    else if (spent !== budget) check = `${Math.abs(budget - spent)} stat assignment points ${spent > budget ? 'over budget' : 'remaining'}.`;
    else if (requiredRealm === 'Choose at table' && !['Essence','Channeling','Mentalism'].includes(form.elements.realm.value)) check = 'Choose a realm of power.';
    else check = 'Initial choices and temporary stats complete.';
    $('#creation-checks').textContent = check;
    $('#creation-checks').classList.toggle('is-complete', check.endsWith('complete.'));
  }
  function showView(name) {
    $$('.view').forEach(view => view.classList.toggle('active', view.id === `${name}-view`));
    $$('.nav-link').forEach(button => button.classList.toggle('active', button.dataset.view === name));
    if (name !== 'tables') $('#return-to-character').hidden = true;
    window.scrollTo({top: 0, behavior: 'smooth'});
  }
  function renderRoster() {
    $('#character-count').textContent = characters.length;
    $('#roster').innerHTML = characters.map(character => `<article class="character-card" data-id="${esc(character.id)}" tabindex="0" role="button" aria-label="Open ${esc(character.name)}"><div class="card-top"><span>${esc(character.race || 'UNSET RACE').toUpperCase()}</span><span class="card-glyph">✳</span></div><h3>${esc(character.name)}</h3><div class="card-sub">${esc(character.profession || 'No profession')} · Level ${esc(character.level || 1)}</div><div class="card-bottom"><span>${esc(character.campaign || 'NO CAMPAIGN')}</span><span>${Number(character.xp || 0).toLocaleString()} XP →</span></div></article>`).join('');
    $('#empty-state').hidden = characters.length > 0;
    $$('.character-card').forEach(card => {
      card.addEventListener('click', () => openCharacter(card.dataset.id));
      card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openCharacter(card.dataset.id); } });
    });
  }
  function formData() {
    const data = Object.fromEntries(new FormData(form).entries());
    data.skills = $$('.skill-row', $('#skills-list')).map(row => ({
      name: $('[name="skill-name"]', row).value,
      category: $('[name="skill-category"]', row).value || row.dataset.pendingCategory || '',
      start: $('[name="skill-start"]', row).value,
      buy: $('[name="skill-buy"]', row).value || row.dataset.pendingBuy || '0',
      ranks: (Number($('[name="skill-start"]', row).value) || 0) + (Number($('[name="skill-buy"]', row).value || row.dataset.pendingBuy) || 0)
    })).filter(skill => skill.name || Number(skill.start) || Number(skill.buy));
    data.stats = Object.fromEntries(statNames.map((name, index) => [name, Object.fromEntries(['temp','pot','basic','racial','special','total'].map(part => [part, data[`stat-${part}-${index}`] || '']))]));
    Object.keys(data).filter(key => /^stat-(temp|pot|basic|racial|special|total)-\d+$/.test(key)).forEach(key => delete data[key]);
    return data;
  }
  function fillForm(character = {}) {
    form.reset();
    for (const [key, value] of Object.entries(character)) {
      const field = form.elements.namedItem(key);
      if (field && typeof value !== 'object') field.value = value;
    }
    makeStats(character.stats || {});
    $('#skills-list').innerHTML = '';
    (character.skills || []).forEach(skillRow);
    if (!character.skills?.length) skillRow();
    updateDevelopment();
  }
  function revealSelectedChoices() {
    $$('.choice-strip').forEach(strip => {
      const selected = $('input:checked', strip)?.closest('.choice-tile');
      strip.scrollLeft = selected ? selected.offsetLeft : 0;
    });
  }
  function openCharacter(id) {
    const character = characters.find(item => item.id === id); if (!character) return;
    currentId = id; fillForm(character);
    const generated = ensureStatRoll();
    const missingMode = !form.elements.statPoolMode.value;
    if (missingMode) form.elements.statPoolMode.value = 'roll';
    if (generated || missingMode) saveCurrent();
    showView('editor'); revealSelectedChoices();
  }
  function newCharacter() {
    currentId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    fillForm({realm:'Choose at table'});
    ensureStatRoll();
    form.elements.statPoolMode.value = 'roll';
    updateDevelopment(); showView('editor'); revealSelectedChoices();
    $('input[name="name"]').focus();
  }
  function saveCurrent() {
    if (!currentId) return;
    updateDevelopment();
    const data = formData();
    if (!data.name.trim()) return;
    const previous = characters.findIndex(item => item.id === currentId);
    const saved = {id: currentId, ...data};
    if (previous < 0) characters.unshift(saved); else characters[previous] = saved;
    writeCharacters(); renderRoster();
  }
  async function chooseTable(reference) {
    if (!reference) return;
    activeTable = reference;
    $('#table-current').textContent = reference.title;
    $('#table-code').textContent = `${reference.code} · CORE PAGE${reference.printedPages.length > 1 ? 'S' : ''} ${reference.printedPages.join(', ')}`;
    $$('.table-choice').forEach(button => button.classList.toggle('active', button.dataset.code === reference.code));
    $('#table-source').hidden = false;
    $('#table-source').innerHTML = '<p class="table-load-error">Loading table data…</p>';
    $('.table-scroll').hidden = true; $('#lookup-result').hidden = true; $('.lookup-controls').hidden = true;
    try {
      let detail = tableCache.get(reference.code);
      if (!detail) {
        const response = await fetch(`tables/${encodeURIComponent(reference.file)}`);
        if (!response.ok) throw new Error('Table data was not found');
        detail = await response.json(); tableCache.set(reference.code, detail);
      }
      if (activeTable.code !== reference.code) return;
      activeTable = detail;
      if (detail.kind === 'critical') {
        const select = $('#table-column');
        select.innerHTML = detail.columns.map((column, index) => `<option value="${index}">${esc(column.group === 'Critical severity' || column.group === 'Weapon' ? column.label : `${column.group} · ${column.label}`)}</option>`).join('');
        $('#roll-label').textContent = 'Critical roll';
        $('#table-roll').max = detail.code.endsWith('.7') || detail.code.endsWith('.8') || detail.code.endsWith('.9') ? '999' : '100';
        if (Number($('#table-roll').value) > Number($('#table-roll').max)) $('#table-roll').value = $('#table-roll').max;
        $('#column-select-field').firstChild.textContent = 'Critical type';
        $('.table-scroll').hidden = false; $('.lookup-controls').hidden = false; $('#lookup-result').hidden = false; $('#table-source').hidden = true;
        $('.table-scroll').innerHTML = '<details class="full-critical-table" open><summary>Full critical table</summary><div class="table-scroll-inner"><table id="attack-grid" class="critical-grid"></table></div></details>';
        renderCriticalGrid(); updateCriticalLookup();
        $('#table-note').textContent = 'H = hits · π = must parry · ∏ = no parry · ∑ = stunned · ∫ = bleed per round. A number before a symbol gives its amount or duration.';
      } else if (detail.columns && detail.rows) {
        const select = $('#table-column');
        select.innerHTML = detail.columns.map((column, index) => `<option value="${index}">${esc(column.group)} · ${esc(column.label)}</option>`).join('');
        $('#roll-label').textContent = 'Modified roll';
        $('#table-roll').max = '300';
        $('#column-select-field').firstChild.textContent = detail.code === 'A-10.9.11' ? 'Target' : 'Target armor';
        $('.table-scroll').hidden = false; $('.lookup-controls').hidden = false; $('#lookup-result').hidden = false; $('#table-source').hidden = true;
        $('.table-scroll').innerHTML = `<details class="full-attack-table" open><summary>Full attack table</summary><div class="table-scroll-inner"><table id="attack-grid" class="attack-grid"></table></div></details>`;
        renderGrid(); updateLookup();
        $('#table-note').textContent = 'Hits and criticals are shown together (for example, 12E).';
      } else if (detail.categories && detail.professions) {
        $('.table-scroll').hidden = false; $('#table-source').hidden = true;
        $('#attack-grid').innerHTML = `<thead><tr><th>Skill category</th>${detail.professions.map(profession => `<th>${esc(profession)}</th>`).join('')}</tr></thead><tbody>${Object.entries(detail.categories).map(([category, costs]) => `<tr><th scope="row">${esc(category)}</th>${detail.professions.map(profession => `<td>${costs[profession] ? costs[profession].join('/') : '—'}</td>`).join('')}</tr>`).join('')}</tbody>`;
        $('#table-note').textContent = 'Rank costs by profession. A dash means unavailable.';
      } else renderSource(detail);
    } catch {
      if (activeTable.code === reference.code) $('#table-source').innerHTML = '<p class="table-load-error">Could not load this table file. Reload the page to try again.</p>';
    }
  }
  function renderSource(table) {
    $('.table-scroll').hidden = true;
    $('#table-source').hidden = false;
    $('#table-source').innerHTML = (table.tablePages || []).map(page => `<section class="source-page"><div class="source-page-head"><span>${esc(table.code)}</span><span>CORE PAGE ${page.printedPage}</span></div><pre>${esc(page.text)}</pre></section>`).join('');
    $('#table-note').textContent = '';
  }
  function renderGrid() {
    if (!activeTable?.columns || !activeTable?.rows) return;
    const groups = [];
    activeTable.columns.forEach((column, index) => {
      const previous = groups[groups.length - 1];
      if (previous?.group === column.group) previous.count++;
      else groups.push({group: column.group, count: 1, start: index});
    });
    const headerGroups = groups.map(group => `<th colspan="${group.count}">${esc(group.group)}</th>`).join('');
    const columnHeaders = activeTable.columns.map(column => `<th>${esc(column.label)}</th>`).join('');
    let previousSection = null;
    const body = activeTable.rows.map((row, rowIndex) => {
      let section = '';
      if (row.section && row.section !== previousSection) {
        section = `<tr class="table-section"><th colspan="${activeTable.columns.length + 1}">${esc(row.section)}</th></tr>`;
        previousSection = row.section;
      }
      const values = row.values.map((value, columnIndex) => `<td data-column="${columnIndex}" class="${value === '–' ? 'no-result' : value === 'F' ? 'failure-result' : value.endsWith('A') || value.endsWith('B') || value.endsWith('C') || value.endsWith('D') || value.endsWith('E') ? 'critical-result' : ''}">${esc(value)}</td>`).join('');
      const unmodified = row.unmodified ? ' unmodified-row' : '';
      return `${section}<tr class="attack-row${unmodified}" data-row="${rowIndex}"><th scope="row">${row.unmodified ? 'UM ' : ''}${esc(row.roll)}</th>${values}</tr>`;
    }).join('');
    $('#attack-grid').innerHTML = `<thead><tr><th rowspan="2" class="roll-heading">Modified<br>roll</th>${headerGroups}</tr><tr>${columnHeaders}</tr></thead><tbody>${body}</tbody>`;
  }
  function renderCriticalGrid() {
    const columns = activeTable.columns.map(column => `<th scope="col">${esc(column.group === 'Critical severity' || column.group === 'Weapon' ? column.label : `${column.group} · ${column.label}`)}</th>`).join('');
    const rows = activeTable.rows.map((row, rowIndex) => `<tr class="critical-row" data-row="${rowIndex}"><th scope="row">${esc(row.roll)}</th>${row.cells.map((cell, columnIndex) => `<td data-column="${columnIndex}"><p>${esc(cell.description)}</p><span class="critical-effect">${esc(cell.effect || '—')}</span></td>`).join('')}</tr>`).join('');
    $('#attack-grid').innerHTML = `<thead><tr><th scope="col">Roll</th>${columns}</tr></thead><tbody>${rows}</tbody>`;
  }
  function updateCriticalLookup() {
    if (activeTable?.kind !== 'critical') return;
    const roll = Math.max(1, Number($('#table-roll').value) || 1);
    const columnIndex = Number($('#table-column').value) || 0;
    const row = activeTable.rows.find(item => {
      const [start, end] = item.roll.split('-');
      return roll >= Number.parseInt(start, 10) && roll <= (end ? Number.parseInt(end, 10) : item.roll.endsWith('+') ? Infinity : Number.parseInt(start, 10));
    }) || activeTable.rows[activeTable.rows.length - 1];
    const column = activeTable.columns[columnIndex];
    const cell = row.cells[columnIndex];
    $('#lookup-result').innerHTML = `<div class="critical-lookup"><div class="critical-lookup-heading"><span>ROLL ${esc(roll)}${row.roll === String(roll) ? '' : ` · ${esc(row.roll)}`}</span><strong>${esc(column.group === 'Critical severity' || column.group === 'Weapon' ? column.label : `${column.group} · ${column.label}`)}</strong></div><p>${esc(cell.description)}</p><div class="critical-lookup-effect">${esc(cell.effect || '—')}</div></div>`;
    $$('.critical-row', $('#attack-grid')).forEach(element => {
      const selected = Number(element.dataset.row) === activeTable.rows.indexOf(row);
      element.classList.toggle('selected-row', selected);
      $$('td', element).forEach((tableCell, index) => tableCell.classList.toggle('selected-cell', selected && index === columnIndex));
    });
  }
  function rowContainsModifiedRoll(row, roll) {
    if (row.unmodified) return false;
    const parts = row.roll.split('-');
    let low = parts.length === 1 ? Number(parts[0]) : (parts[0] === 'XX' ? 1 : Number(parts[0]));
    const high = parts.length === 1 ? low : Number(parts[1]);
    if (!Number.isFinite(low) || !Number.isFinite(high)) return false;
    return roll >= low && roll <= high;
  }
  function updateLookup() {
    if (!activeTable?.rows) return;
    const roll = Number($('#table-roll').value) || 1;
    const columnIndex = Number($('#table-column').value) || 0;
    const regularRows = activeTable.rows.filter(row => !row.unmodified);
    let row = regularRows.find(item => rowContainsModifiedRoll(item, roll));
    if (!row) row = roll > 150 ? regularRows[0] : regularRows[regularRows.length - 1];
    const value = row?.values[columnIndex] ?? '–';
    const column = activeTable.columns[columnIndex];
    const lookup = $('#lookup-result');
    lookup.innerHTML = `Roll <strong>${esc(roll)}</strong> vs. <strong>${esc(column.group)} ${esc(column.label)}</strong><span>${esc(value)}</span>`;
    $$('.attack-row', $('#attack-grid')).forEach(element => {
      const selected = Number(element.dataset.row) === activeTable.rows.indexOf(row);
      element.classList.toggle('selected-row', selected);
      $$('td', element).forEach((cell, index) => cell.classList.toggle('selected-cell', selected && index === columnIndex));
    });
  }
  function renderTables(filter = '') {
    const needle = filter.trim().toLowerCase();
    const shown = tables.filter(table => {
      const matchesSearch = `${table.title} ${table.code}`.toLowerCase().includes(needle);
      const group = table.code.startsWith('A-10.9') ? 'attacks' : table.code.startsWith('A-10.10') ? 'criticals' : /^T-[12]\./.test(table.code) || table.code === 'chart-special-progression' ? 'character' : 'play';
      return matchesSearch && (activeTableGroup === 'all' || activeTableGroup === group);
    });
    $('#table-list').innerHTML = shown.map(table => `<button class="table-choice" data-code="${table.code}"><span>${esc(table.title)}</span><span>${table.code}</span></button>`).join('');
    $('#table-count').textContent = `${shown.length} of ${tables.length} tables and charts`;
    if (!shown.length) {
      $('#table-list').innerHTML = '<p class="table-list-empty">No tables match this search.</p>';
      activeTable = null;
      $('#table-current').textContent = 'No matching table';
      $('#table-code').textContent = '';
      $('.lookup-controls').hidden = true;
      $('#lookup-result').hidden = true;
      $('.table-scroll').hidden = true;
      $('#table-source').hidden = false;
      $('#table-source').innerHTML = '<p class="table-list-empty">Try another search or category.</p>';
      $('#table-note').textContent = '';
    }
    $$('.table-choice').forEach(button => button.addEventListener('click', () => chooseTable(tables.find(table => table.code === button.dataset.code))));
    if (shown.length && !shown.some(table => table.code === activeTable?.code)) chooseTable(shown[0]);
    else $$('.table-choice').forEach(button => button.classList.toggle('active', button.dataset.code === activeTable?.code));
  }
  async function loadReferenceData() {
    try {
      const [tableResponse, costResponse] = await Promise.all([fetch('tables/index.json'), fetch('tables/T-2.8.json')]);
      if (!tableResponse.ok || !costResponse.ok) throw new Error('Reference files could not be loaded');
      tables = await tableResponse.json();
      developmentRules = await costResponse.json();
      const savedSkills = $$('.skill-row', $('#skills-list')).map(row => ({name: $('[name="skill-name"]', row).value, category: $('[name="skill-category"]', row).value || row.dataset.pendingCategory, start: $('[name="skill-start"]', row).value, buy: $('[name="skill-buy"]', row).value || row.dataset.pendingBuy}));
      $('#skills-list').innerHTML = '';
      savedSkills.forEach(skillRow);
      renderTables();
      updateDevelopment();
    } catch (error) {
      $('#table-list').innerHTML = '<p class="table-load-error">Table data could not be loaded. Serve this folder over HTTP and reload.</p>';
    }
  }
  makeStats(); makeResistances(); renderRoster(); loadReferenceData();
  function openTableGroup(group) {
    activeTableGroup = group;
    $$('.filter-chip').forEach(button => {
      const active = button.dataset.group === group;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    $('#table-search').value = '';
    renderTables();
    showView('tables');
  }
  $$('.nav-link').forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
  $('.brand').addEventListener('click', event => { event.preventDefault(); showView('home'); });
  $('#new-character').addEventListener('click', newCharacter);
  $('#empty-new-character').addEventListener('click', newCharacter);
  $$('.filter-chip').forEach(button => button.addEventListener('click', () => openTableGroup(button.dataset.group)));
  $('#back-roster').addEventListener('click', () => { saveCurrent(); renderRoster(); showView('home'); });
  $('#add-skill').addEventListener('click', () => { skillRow(); $('[name="skill-name"]', $('#skills-list').lastElementChild).focus(); });
  $('#fixed-potentials').addEventListener('click', () => {
    statNames.forEach((_, index) => {
      const temporary = Number(form.elements.namedItem(`stat-temp-${index}`).value);
      if (temporary >= 20 && temporary <= 100) form.elements.namedItem(`stat-pot-${index}`).value = String(fixedPotential(temporary));
    });
    saveCurrent();
  });
  $('#rolled-stat-pool').addEventListener('click', () => {
    rollStatPool();
    form.elements.statPoolMode.value = 'roll';
    saveCurrent();
  });
  $('#fixed-stat-pool').addEventListener('click', () => {
    form.elements.statPoolMode.value = '660';
    saveCurrent();
  });
  $$('[data-open-table]').forEach(button => button.addEventListener('click', () => {
    const reference = tables.find(table => table.code === button.dataset.openTable);
    if (!reference) return;
    activeTableGroup = 'character';
    $$('.filter-chip').forEach(chip => { const active = chip.dataset.group === 'character'; chip.classList.toggle('active', active); chip.setAttribute('aria-pressed', String(active)); });
    $('#table-search').value = '';
    renderTables(); chooseTable(reference); showView('tables'); $('#return-to-character').hidden = false;
  }));
  $('#return-to-character').addEventListener('click', () => showView('editor'));
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('input', saveCurrent);
  form.addEventListener('change', event => {
    if (event.target.name === 'profession') form.elements.realm.value = realmByProfession[event.target.value] || 'Choose at table';
    if (event.target.name === 'realm' && realmByProfession[form.elements.profession.value] !== 'Choose at table') form.elements.realm.value = realmByProfession[form.elements.profession.value];
    if (event.target.name === 'profession') $$('.skill-row', $('#skills-list')).forEach(row => updateSkillBuyOptions(row));
    updateDevelopment();
    saveCurrent();
  });
  $('#print-character').addEventListener('click', () => window.print());
  $('#delete-character').addEventListener('click', () => {
    const character = characters.find(item => item.id === currentId);
    if (!character) { showView('home'); return; }
    if (window.confirm(`Delete ${character.name}?`)) { characters = characters.filter(item => item.id !== currentId); writeCharacters(); renderRoster(); currentId = null; showView('home'); }
  });
  $('#table-search').addEventListener('input', event => renderTables(event.target.value));
  $('#table-roll').addEventListener('input', () => activeTable?.kind === 'critical' ? updateCriticalLookup() : updateLookup());
  $('#table-column').addEventListener('change', () => activeTable?.kind === 'critical' ? updateCriticalLookup() : updateLookup());
})();
