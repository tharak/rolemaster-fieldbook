(() => {
  const STORAGE_KEY = 'rolemaster-fieldbook-characters-v1';
  const statNames = ['Agility', 'Constitution', 'Memory', 'Reasoning', 'Self Discipline', 'Empathy', 'Intuition', 'Presence', 'Quickness', 'Strength'];
  let tables = [];
  let activeTable = null;
  const tableCache = new Map();
  let developmentRules = null;
  let diceHistory = [];
  const realmByProfession = {Fighter:'Choose at table',Thief:'Choose at table',Rogue:'Choose at table',Cleric:'Channeling',Magician:'Essence',Mentalist:'Mentalism',Ranger:'Channeling',Dabbler:'Essence',Bard:'Mentalism'};
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const form = $('#character-form');
  let characters = readCharacters();
  let currentId = null;
  let isNew = false;

  function readCharacters() {
    try { const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); return Array.isArray(data) ? data : []; }
    catch { return []; }
  }
  function writeCharacters() { localStorage.setItem(STORAGE_KEY, JSON.stringify(characters)); }
  function esc(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
  function makeStats(stats = {}) {
    $('#stats-list').innerHTML = statNames.map((name, index) => {
      const value = stats[name] || {};
      return `<div class="stat-row"><span>${name}</span><input aria-label="${name} temporary stat" name="stat-temp-${index}" type="number" min="1" max="101" value="${esc(value.temp ?? '')}" placeholder="—"><input aria-label="${name} potential stat" name="stat-pot-${index}" type="number" min="1" max="101" value="${esc(value.pot ?? '')}" placeholder="—"></div>`;
    }).join('');
  }
  function skillRow(skill = {}) {
    const row = document.createElement('div'); row.className = 'skill-row';
    const categories = Object.keys(developmentRules?.categories || {});
    const categoryOptions = categories.map(category => `<option value="${esc(category)}" ${skill.category === category ? 'selected' : ''}>${esc(category)}</option>`).join('');
    row.innerHTML = `<input aria-label="Skill name" name="skill-name" maxlength="60" placeholder="Skill name" value="${esc(skill.name || '')}"><select aria-label="Skill category" name="skill-category">${categoryOptions}</select><input aria-label="Ranks before this level" name="skill-start" type="number" min="0" max="99" placeholder="0" value="${esc(skill.start ?? skill.ranks ?? 0)}"><select aria-label="Ranks purchased this level" name="skill-buy"></select><span class="skill-dp-cost">0 DP</span><button type="button" class="remove-skill" aria-label="Remove skill">×</button>`;
    const category = $('[name="skill-category"]', row);
    if (skill.category && categories.includes(skill.category)) category.value = skill.category;
    $('[name="skill-buy"]', row).value = String(skill.buy || 0);
    $('.remove-skill', row).addEventListener('click', () => { row.remove(); updateDevelopment(); saveCurrent(); });
    $('#skills-list').append(row);
    updateSkillBuyOptions(row);
    category.addEventListener('change', () => { updateSkillBuyOptions(row); updateDevelopment(); saveCurrent(); });
    $('[name="skill-buy"]', row).addEventListener('change', () => { updateDevelopment(); saveCurrent(); });
    $('[name="skill-start"]', row).addEventListener('input', () => { updateDevelopment(); saveCurrent(); });
    $('[name="skill-name"]', row).addEventListener('input', saveCurrent);
  }
  function costForSkill(row, profession) {
    const category = $('[name="skill-category"]', row).value;
    return developmentRules?.categories?.[category]?.[profession] || null;
  }
  function updateSkillBuyOptions(row) {
    const costs = costForSkill(row, form.elements.profession.value);
    const buy = $('[name="skill-buy"]', row);
    const max = costs?.length || 0;
    const previous = Math.min(Number(buy.value) || 0, max);
    buy.innerHTML = Array.from({length: max + 1}, (_, rank) => `<option value="${rank}">${rank}</option>`).join('');
    buy.value = String(previous);
    buy.disabled = !max;
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
    $('#dp-spent').textContent = String(spent);
    const remaining = hasStats ? available - spent : null;
    $('#dp-remaining').textContent = remaining === null ? '—' : String(remaining);
    $('#dp-remaining').classList.toggle('over-budget', remaining !== null && remaining < 0);
    $$('.skill-row', $('#skills-list')).forEach(updateSkillBuyOptions);
  }
  function showView(name) {
    $$('.view').forEach(view => view.classList.toggle('active', view.id === `${name}-view`));
    $$('.nav-link').forEach(button => button.classList.toggle('active', button.dataset.view === name));
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
      category: $('[name="skill-category"]', row).value,
      start: $('[name="skill-start"]', row).value,
      buy: $('[name="skill-buy"]', row).value,
      ranks: (Number($('[name="skill-start"]', row).value) || 0) + (Number($('[name="skill-buy"]', row).value) || 0)
    })).filter(skill => skill.name || Number(skill.start) || Number(skill.buy));
    data.stats = Object.fromEntries(statNames.map((name, index) => [name, {temp: data[`stat-temp-${index}`] || '', pot: data[`stat-pot-${index}`] || ''}]));
    Object.keys(data).filter(key => key.startsWith('stat-temp-') || key.startsWith('stat-pot-')).forEach(key => delete data[key]);
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
    $('#editor-heading').textContent = character.name || 'New character';
  }
  function openCharacter(id) {
    const character = characters.find(item => item.id === id); if (!character) return;
    currentId = id; isNew = false; fillForm(character); showView('editor');
  }
  function newCharacter() {
    currentId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    isNew = true; fillForm({realm:'Choose at table'}); $('#editor-heading').textContent = 'New character'; showView('editor');
    $('input[name="name"]').focus();
  }
  function saveCurrent() {
    if (!currentId) return;
    updateDevelopment();
    const data = formData();
    $('#editor-heading').textContent = data.name || 'New character';
    if (!data.name.trim()) return;
    const previous = characters.findIndex(item => item.id === currentId);
    const saved = {id: currentId, ...data};
    if (previous < 0) characters.unshift(saved); else characters[previous] = saved;
    writeCharacters(); renderRoster(); isNew = false;
  }
  async function chooseTable(reference) {
    if (!reference) return;
    activeTable = reference;
    $('#table-current').textContent = reference.title;
    $('#table-code').textContent = `${reference.code} · CORE PAGE${reference.printedPages.length > 1 ? 'S' : ''} ${reference.printedPages.join(', ')}`;
    $('#apply-result').hidden = true;
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
      if (detail.columns && detail.rows) {
        const select = $('#table-column');
        select.innerHTML = detail.columns.map((column, index) => `<option value="${index}">${esc(column.group)} · ${esc(column.label)}</option>`).join('');
        $('#column-select-field').firstChild.textContent = detail.code === 'A-10.9.11' ? 'Target' : 'Target armor';
        $('.table-scroll').hidden = false; $('.lookup-controls').hidden = false; $('#lookup-result').hidden = false; $('#table-source').hidden = true;
        renderGrid(); updateLookup();
        $('#table-note').textContent = 'Damage and critical severity appear together, for example 12E means 12 hits and an E critical. UM rows depend on the unmodified die result.';
      } else if (detail.categories && detail.professions) {
        $('.table-scroll').hidden = false; $('#table-source').hidden = true;
        $('#attack-grid').innerHTML = `<thead><tr><th>Skill category</th>${detail.professions.map(profession => `<th>${esc(profession)}</th>`).join('')}</tr></thead><tbody>${Object.entries(detail.categories).map(([category, costs]) => `<tr><th scope="row">${esc(category)}</th>${detail.professions.map(profession => `<td>${costs[profession] ? costs[profession].join('/') : '—'}</td>`).join('')}</tr>`).join('')}</tbody>`;
        $('#table-note').textContent = 'Rank costs are listed by rank in order; a dash means the profession cannot develop that category under the standard cost table.';
      } else renderSource(detail);
    } catch {
      if (activeTable.code === reference.code) $('#table-source').innerHTML = '<p class="table-load-error">Could not load this table file. Reload the page to try again.</p>';
    }
  }
  function renderSource(table) {
    $('.table-scroll').hidden = true;
    $('#table-source').hidden = false;
    $('#table-source').innerHTML = (table.sourcePages || []).map(page => `<section class="source-page"><div class="source-page-head"><span>${esc(table.code)}</span><span>CORE PAGE ${page.printedPage}</span></div><pre>${esc(page.lines.map(line => line.text).join('\n'))}</pre></section>`).join('');
    $('#table-note').textContent = 'Text is transcribed from the book text layer with original spacing preserved. Multi-page tables include each referenced page.';
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
    const shown = tables.filter(table => `${table.title} ${table.code}`.toLowerCase().includes(needle));
    $('#table-list').innerHTML = shown.map(table => `<button class="table-choice" data-code="${table.code}"><span>${esc(table.title)}</span><span>${table.code}</span></button>`).join('');
    $('#table-count').textContent = `${shown.length} of ${tables.length} tables and charts`;
    $$('.table-choice').forEach(button => button.addEventListener('click', () => chooseTable(tables.find(table => table.code === button.dataset.code))));
    if (shown.length && !shown.some(table => table.code === activeTable?.code)) chooseTable(shown[0]);
    else $$('.table-choice').forEach(button => button.classList.toggle('active', button.dataset.code === activeTable?.code));
  }
  function die(sides) {
    if (!window.crypto?.getRandomValues) return Math.floor(Math.random() * sides) + 1;
    const bucket = new Uint32Array(1);
    const range = 0x100000000;
    const limit = Math.floor(range / sides) * sides;
    do { window.crypto.getRandomValues(bucket); } while (bucket[0] >= limit);
    return (bucket[0] % sides) + 1;
  }
  function rollDice() {
    const mode = $('#roll-mode').value;
    let dice = [];
    let total = 0;
    let direction = 0;
    let title = '';
    if (mode === 'pool') {
      const count = Math.min(20, Math.max(1, Number($('#pool-count').value) || 1));
      const sides = Math.min(100, Math.max(2, Number($('#pool-sides').value) || 6));
      dice = Array.from({length: count}, () => die(sides));
      total = dice.reduce((sum, value) => sum + value, 0);
      title = `${count}d${sides}`;
    } else if (mode === 'd10' || mode === 'd5' || mode === 'd8') {
      const sides = Number(mode.slice(1)); dice = [die(sides)]; total = dice[0]; title = mode;
    } else {
      const first = die(100);
      dice = [first]; total = first;
      const highEligible = mode === 'open' || mode === 'high';
      const lowEligible = mode === 'open' || mode === 'low';
      if (highEligible && first >= 96) direction = 1;
      else if (lowEligible && first <= 5) direction = -1;
      if (direction !== 0) {
        let continueRolling = true;
        while (continueRolling && dice.length < 50) {
          const next = die(100); dice.push(next); total += direction * next;
          continueRolling = next >= 96;
        }
      }
      title = mode === 'open' ? 'Open-ended d100' : mode === 'high' ? 'High open-ended d100' : mode === 'low' ? 'Low open-ended d100' : 'Plain d100';
    }
    const chain = dice.map((value, index) => {
      if (!index || mode === 'pool') return String(value);
      return `${direction > 0 ? '+' : '−'} ${value}`;
    }).join(' ');
    $('#result-face').textContent = String(dice[0]).padStart(2, mode.includes('d100') || ['open','high','low','plain'].includes(mode) ? '0' : ' ');
    $('#result-label').textContent = title.toUpperCase();
    $('#result-total').textContent = `Result ${total}`;
    $('#result-breakdown').textContent = dice.length > 1 ? `Dice: ${chain}` : mode === 'pool' ? `Dice: ${dice.join(', ')}` : `Single roll: ${dice[0]}`;
    $('#apply-result').hidden = !activeTable?.rows || !['open', 'high', 'low', 'plain'].includes(mode);
    $('#apply-result').dataset.result = String(total);
    diceHistory.unshift({title, total, dice}); diceHistory = diceHistory.slice(0, 4);
    $('#roll-history').innerHTML = diceHistory.map(item => `<li><span>${esc(item.title)}</span><strong>${item.total}</strong></li>`).join('');
  }
  async function loadReferenceData() {
    try {
      const [tableResponse, costResponse] = await Promise.all([fetch('tables/index.json'), fetch('tables/T-2.8.json')]);
      if (!tableResponse.ok || !costResponse.ok) throw new Error('Reference files could not be loaded');
      tables = await tableResponse.json();
      developmentRules = await costResponse.json();
      const savedSkills = $$('.skill-row', $('#skills-list')).map(row => ({name: $('[name="skill-name"]', row).value, category: $('[name="skill-category"]', row).value, start: $('[name="skill-start"]', row).value, buy: $('[name="skill-buy"]', row).value}));
      $('#skills-list').innerHTML = '';
      savedSkills.forEach(skillRow);
      renderTables();
      updateDevelopment();
    } catch (error) {
      $('#table-list').innerHTML = '<p class="table-load-error">Table data could not be loaded. Serve this folder over HTTP and reload.</p>';
    }
  }
  function notify(message) {
    const toast = document.createElement('div'); toast.className = 'toast'; toast.textContent = message; document.body.append(toast); setTimeout(() => toast.remove(), 1900);
  }

  makeStats(); renderRoster(); loadReferenceData();
  $$('.nav-link').forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
  $('#new-character').addEventListener('click', newCharacter);
  $('#empty-create').addEventListener('click', newCharacter);
  $('#back-roster').addEventListener('click', () => { saveCurrent(); renderRoster(); showView('home'); });
  $('#open-tables').addEventListener('click', () => showView('tables'));
  $('#add-skill').addEventListener('click', () => { skillRow(); $('[name="skill-name"]', $('#skills-list').lastElementChild).focus(); });
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('input', saveCurrent);
  form.addEventListener('change', event => {
    if (event.target.name === 'profession') form.elements.realm.value = realmByProfession[event.target.value] || 'Choose at table';
    if (event.target.name === 'profession') $$('.skill-row', $('#skills-list')).forEach(updateSkillBuyOptions);
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
  $('#table-roll').addEventListener('input', updateLookup);
  $('#table-column').addEventListener('change', updateLookup);
  $('#roll-mode').addEventListener('change', event => { $('#pool-controls').hidden = event.target.value !== 'pool'; });
  $('#roll-dice').addEventListener('click', rollDice);
  $('#apply-result').addEventListener('click', event => { $('#table-roll').value = event.currentTarget.dataset.result; updateLookup(); });
})();
