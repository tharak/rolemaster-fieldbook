// Search, lazy loading, and lookup UI for the reference tables.
import {$, $$, esc} from './dom.js';
export function createTableBrowser({showView}) {
  let tables = [];
  let activeTable = null;
  let activeTableGroup = 'all';
  const tableCache = new Map();

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
      if (detail.kind === 'critical' || detail.kind === 'fumble') {
        const isFumble = detail.kind === 'fumble';
        const select = $('#table-column');
        select.innerHTML = detail.columns.map((column, index) => `<option value="${index}">${esc(column.group === 'Critical severity' || column.group === 'Weapon' ? column.label : `${column.group} · ${column.label}`)}</option>`).join('');
        $('#roll-label').textContent = isFumble ? detail.code === 'A-10.11.1' ? 'Fumble roll' : 'Failure roll' : 'Critical roll';
        const extendedRolls = isFumble ? detail.code === 'A-10.11.2' : ['.7','.8','.9'].some(suffix => detail.code.endsWith(suffix));
        $('#table-roll').max = extendedRolls ? '999' : '100';
        if (Number($('#table-roll').value) > Number($('#table-roll').max)) $('#table-roll').value = $('#table-roll').max;
        $('#column-select-field').firstChild.textContent = isFumble ? detail.code === 'A-10.11.1' ? 'Weapon type' : 'Spell type' : 'Critical type';
        $('.table-scroll').hidden = false; $('.lookup-controls').hidden = false; $('#lookup-result').hidden = false; $('#table-source').hidden = true;
        $('.table-scroll').innerHTML = `<details class="full-critical-table" open><summary>Full ${isFumble ? detail.title.toLowerCase() : 'critical'} table</summary><div class="table-scroll-inner"><table id="attack-grid" class="critical-grid"></table></div></details>`;
        renderCriticalGrid(); updateCriticalLookup();
        $('#table-note').textContent = isFumble ? 'Choose the roll and weapon or spell type to see its result.' : 'H = hits · π = must parry · ∏ = no parry · ∑ = stunned · ∫ = bleed per round. A number before a symbol gives its amount or duration.';
      } else if (detail.columns && detail.rows) {
        const select = $('#table-column');
        select.innerHTML = detail.columns.map((column, index) => `<option value="${index}">${esc(column.group)} · ${esc(column.label)}</option>`).join('');
        $('#roll-label').textContent = 'Modified roll';
        $('#table-roll').max = '300';
        if (Number($('#table-roll').value) > 300) $('#table-roll').value = '300';
        $('#column-select-field').firstChild.textContent = detail.code === 'A-10.9.11' ? 'Target' : 'Target armor';
        $('.table-scroll').hidden = false; $('.lookup-controls').hidden = false; $('#lookup-result').hidden = false; $('#table-source').hidden = true;
        $('.table-scroll').innerHTML = `<details class="full-attack-table" open><summary>Full attack table</summary><div class="table-scroll-inner"><table id="attack-grid" class="attack-grid"></table></div></details>`;
        renderGrid(); updateLookup();
        $('#table-note').textContent = 'Hits and criticals are shown together (for example, 12E).';
      } else if (detail.categories && detail.professions) {
        $('.table-scroll').hidden = false; $('#table-source').hidden = true;
        $('#attack-grid').innerHTML = `<thead><tr><th>Skill category</th>${detail.professions.map(profession => `<th>${esc(profession)}</th>`).join('')}</tr></thead><tbody>${Object.entries(detail.categories).map(([category, costs]) => `<tr><th scope="row">${esc(category)}</th>${detail.professions.map(profession => `<td>${costs[profession] ? costs[profession].join('/') : '—'}</td>`).join('')}</tr>`).join('')}</tbody>`;
        $('#table-note').textContent = 'Rank costs by profession. Weapon costs may appear in a different category on a character sheet. A dash means unavailable.';
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
    const rows = activeTable.rows.map((row, rowIndex) => `<tr class="critical-row" data-row="${rowIndex}"><th scope="row">${esc(row.roll)}</th>${row.cells.map((cell, columnIndex) => `<td data-column="${columnIndex}"><p>${esc(cell.description)}</p>${cell.effect ? `<span class="critical-effect">${esc(cell.effect)}</span>` : ''}</td>`).join('')}</tr>`).join('');
    $('#attack-grid').innerHTML = `<thead><tr><th scope="col">Roll</th>${columns}</tr></thead><tbody>${rows}</tbody>`;
  }
  function updateCriticalLookup() {
    if (activeTable?.kind !== 'critical' && activeTable?.kind !== 'fumble') return;
    const roll = Math.max(1, Number($('#table-roll').value) || 1);
    const columnIndex = Number($('#table-column').value) || 0;
    const row = activeTable.rows.find(item => {
      const [start, end] = item.roll.split('-');
      return roll >= Number.parseInt(start, 10) && roll <= (end ? Number.parseInt(end, 10) : item.roll.endsWith('+') ? Infinity : Number.parseInt(start, 10));
    }) || activeTable.rows[activeTable.rows.length - 1];
    const column = activeTable.columns[columnIndex];
    const cell = row.cells[columnIndex];
    $('#lookup-result').innerHTML = `<div class="critical-lookup"><div class="critical-lookup-heading"><span>ROLL ${esc(roll)}${row.roll === String(roll) ? '' : ` · ${esc(row.roll)}`}</span><strong>${esc(column.group === 'Critical severity' || column.group === 'Weapon' ? column.label : `${column.group} · ${column.label}`)}</strong></div><p>${esc(cell.description)}</p>${cell.effect ? `<div class="critical-lookup-effect">${esc(cell.effect)}</div>` : ''}</div>`;
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
  function setTables(index) {
    tables = index;
    renderTables();
  }
  function openTable(code) {
    const reference = tables.find(item => item.code === code);
    if (reference) { showView('tables'); chooseTable(reference); }
  }
  $('#table-search').addEventListener('input', event => renderTables(event.target.value));
  $('#table-roll').addEventListener('input', () => activeTable?.kind === 'critical' || activeTable?.kind === 'fumble' ? updateCriticalLookup() : updateLookup());
  $('#table-column').addEventListener('change', () => activeTable?.kind === 'critical' || activeTable?.kind === 'fumble' ? updateCriticalLookup() : updateLookup());
  return {setTables, openTable, openTableGroup};
}
