(() => {
  const STORAGE_KEY = 'rolemaster-fieldbook-characters-v1';
  const statNames = ['Agility', 'Constitution', 'Memory', 'Reasoning', 'Self Discipline', 'Empathy', 'Intuition', 'Presence', 'Quickness', 'Strength'];
  const tables = [
    ['One-handed concussion', 'A-10.9.1', 221], ['One-handed edged', 'A-10.9.2', 222], ['Two-handed weapon', 'A-10.9.3', 223],
    ['Missile weapon', 'A-10.9.4', 224], ['Pole arm weapon', 'A-10.9.5', 225], ['Thrown weapon', 'A-10.9.6', 226],
    ['Tooth & claw', 'A-10.9.7', 227], ['Bash & grapple', 'A-10.9.8', 228], ['Bolt spell', 'A-10.9.9', 229],
    ['Ball spell', 'A-10.9.10', 230], ['Basic spell', 'A-10.9.11', 231]
  ].map(([name, code, page]) => ({name, code, page}));
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
    row.innerHTML = `<input aria-label="Skill name" name="skill-name" maxlength="60" placeholder="Skill name" value="${esc(skill.name || '')}"><input aria-label="Skill ranks" name="skill-ranks" type="number" min="0" max="99" placeholder="Ranks" value="${esc(skill.ranks ?? '')}"><button type="button" class="remove-skill" aria-label="Remove skill">×</button>`;
    $('.remove-skill', row).addEventListener('click', () => { row.remove(); saveCurrent(); });
    $('#skills-list').append(row);
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
    data.skills = $$('.skill-row', $('#skills-list')).map(row => ({name: $('[name="skill-name"]', row).value, ranks: $('[name="skill-ranks"]', row).value})).filter(skill => skill.name || skill.ranks);
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
    const data = formData();
    $('#editor-heading').textContent = data.name || 'New character';
    if (!data.name.trim()) return;
    const previous = characters.findIndex(item => item.id === currentId);
    const saved = {id: currentId, ...data};
    if (previous < 0) characters.unshift(saved); else characters[previous] = saved;
    writeCharacters(); renderRoster(); isNew = false;
  }
  function chooseTable(table) {
    const file = 'Rolemaster%20FRP%20-%20CORE%20Rules%20-%20OCR.pdf';
    $('#table-current').textContent = table.name;
    $('#page-number').textContent = `PDF PAGE ${table.page}`;
    $('#pdf-frame').src = `${file}#page=${table.page}&zoom=page-width`;
    $('#open-pdf').href = `${file}#page=${table.page}`;
    $$('.table-choice').forEach(button => button.classList.toggle('active', button.dataset.code === table.code));
  }
  function renderTables(filter = '') {
    const needle = filter.trim().toLowerCase();
    const shown = tables.filter(table => `${table.name} ${table.code}`.toLowerCase().includes(needle));
    $('#table-list').innerHTML = shown.map(table => `<button class="table-choice" data-code="${table.code}"><span>${table.name}</span><span>${table.code}</span></button>`).join('');
    $$('.table-choice').forEach(button => button.addEventListener('click', () => chooseTable(tables.find(table => table.code === button.dataset.code))));
    const active = shown.find(table => table.code === $('#table-current').dataset.code) || shown[0];
    if (active) { $('#table-current').dataset.code = active.code; chooseTable(active); }
  }
  function notify(message) {
    const toast = document.createElement('div'); toast.className = 'toast'; toast.textContent = message; document.body.append(toast); setTimeout(() => toast.remove(), 1900);
  }

  makeStats(); renderRoster(); renderTables();
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
    saveCurrent();
  });
  $('#print-character').addEventListener('click', () => window.print());
  $('#delete-character').addEventListener('click', () => {
    const character = characters.find(item => item.id === currentId);
    if (!character) { showView('home'); return; }
    if (window.confirm(`Delete ${character.name}?`)) { characters = characters.filter(item => item.id !== currentId); writeCharacters(); renderRoster(); currentId = null; showView('home'); }
  });
  $('#table-search').addEventListener('input', event => renderTables(event.target.value));
  $('#open-pdf').href = 'Rolemaster%20FRP%20-%20CORE%20Rules%20-%20OCR.pdf#page=221';
})();
