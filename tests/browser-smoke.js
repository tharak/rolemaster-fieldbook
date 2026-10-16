// Run with Playwright CLI after opening a local Fieldbook URL.
// The checks use a fresh context so they cannot change the open browser's roster.
async (existingPage) => {
  const context = await existingPage.context().browser().newContext();
  const page = await context.newPage();
  async function checkTables(page) {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    await page.route('**/tables/T-1.2.json', route => gate.then(() => route.continue()));
    const request = page.waitForRequest('**/tables/T-1.2.json');
    await page.locator('[data-code="T-1.2"]').click();
    await request;
    await page.locator('#table-search').fill('no matching table 87654321');
    const response = page.waitForResponse('**/tables/T-1.2.json');
    release();
    await response;
    await page.waitForTimeout(100);
    if (await page.locator('#table-current').textContent() !== 'No matching table') throw new Error('Cleared search was overwritten');
    await page.unroute('**/tables/T-1.2.json');
    await page.locator('#table-search').fill('');
    let releaseOlder;
    const older = new Promise(resolve => { releaseOlder = resolve; });
    await page.route('**/tables/T-1.3.json', route => older.then(() => route.continue()));
    const oldRequest = page.waitForRequest('**/tables/T-1.3.json');
    await page.locator('[data-code="T-1.3"]').click();
    await oldRequest;
    await page.locator('[data-code="T-1.4"]').click();
    await page.locator('#table-source').getByText(/PROFESSION/).waitFor();
    const oldResponse = page.waitForResponse('**/tables/T-1.3.json');
    releaseOlder();
    await oldResponse;
    await page.waitForTimeout(100);
    if (await page.locator('#table-current').textContent() !== 'Profession') throw new Error('Older table overwrote the selected table');
    await page.unroute('**/tables/T-1.3.json');
    await page.locator('[data-code="A-10.10.5"]').click();
    await page.locator('#attack-grid.critical-grid').waitFor();
    await page.locator('[data-code="T-2.8"]').click();
    await page.locator('#attack-grid th').filter({hasText:'Skill category'}).waitFor();
    if (await page.locator('.table-scroll details').count()) throw new Error('Cost table kept the critical table wrapper');
    if (errors.length) throw new Error(errors.join('\n'));
    return {clearedSearch:'passed', latestSelection:'passed', criticalToCosts:'passed', pageErrors:errors.length};
  }
  async function checkCharacter(page) {
    await page.evaluate(() => localStorage.removeItem('rolemaster-fieldbook-characters-v1'));
    await page.reload();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.locator('.nav-link[data-view="home"]').click();
    await page.locator('#new-character').click();
    await page.locator('#character-form [name="name"]').fill('Refactor Test');
    await page.locator('[name="stat-temp-9"]').fill('100');
    if (await page.locator('[name="stat-pot-9"]').inputValue() !== '101') throw new Error('Stat input did not update its potential before saving');
    await page.locator('[data-roll-role="personality"]').click();
    await page.locator('#roll-appearance').click();
    if (!(await page.locator('[name="rolePersonality"]').inputValue())) throw new Error('Role roll did not update the form');
    if (!(await page.locator('[name="appearancePotential"]').inputValue())) throw new Error('Appearance roll did not update the form');
    await page.locator('[name="roleSkin"]').fill('Manual complexion');
    await page.getByRole('radio', {name:'Dwarf', exact:true}).check();
    if (await page.locator('[name="roleSkin"]').inputValue() !== 'Manual complexion') throw new Error('Race change overwrote manual physical detail');
    await page.getByRole('radio', {name:'Magician', exact:true}).check();
    if (await page.locator('[name="stat-temp-5"]').inputValue() !== '90') throw new Error('Profession prime stats did not update');
    await page.getByRole('radio', {name:'Fighter', exact:true}).check();
    await page.locator('#open-play-view').click();
    await page.locator('#play-xp-form [name="amount"]').fill('10000');
    await page.locator('#play-xp-form button[type="submit"]').click();
    if (await page.locator('#play-character-level').textContent() !== '2') throw new Error('XP award did not update the level');
    await page.locator('details.play-xp-history summary').filter({hasText:'Recent XP'}).click();
    await page.locator('#undo-xp-award').click();
    if (await page.locator('#play-character-level').textContent() !== '1') throw new Error('XP undo did not restore the level');
    await page.locator('#play-xp-form [name="amount"]').fill('10000');
    await page.locator('#play-xp-form button[type="submit"]').click();
    await page.locator('#advance-character-level').click();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('rolemaster-fieldbook-characters-v1'))[0]);
    if (saved.developmentLevel !== '2') throw new Error('Advancement was not saved');
    const rolls = JSON.parse(saved.statGainHistory);
    if (rolls.filter(entry => entry.source === 'level:2').length !== 10) throw new Error('Advancement did not record ten stat rolls');
    await page.locator('.nav-link[data-view="home"]').click();
    await page.locator('.character-card').click();
    if (await page.locator('#play-character-name').textContent() !== 'Refactor Test') throw new Error('Character did not reload');
    const roster = await page.evaluate(() => window.RolemasterEncounter.roster());
    if (roster[0].name !== 'Refactor Test' || roster[0].level !== 2) throw new Error('Encounter projection did not follow saved character');
    if (errors.length) throw new Error(errors.join('\n'));
    return {statInput:'passed', roleAndAppearance:'passed', manualPhysicalDetail:'passed', XPAndUndo:'passed', advancement:'passed', saveAndReload:'passed', encounterRoster:'passed', pageErrors:errors.length};
  }
  try {
    await page.goto(existingPage.url());
    await page.waitForFunction(()=>document.documentElement.dataset.appReady==='true'&&document.querySelector('.table-choice'));
    await page.evaluate(()=>window.RolemasterEncounter.openTable('T-1.1'));
    const tables = await checkTables(page);
    const character = await checkCharacter(page);
    return {tables, character};
  } finally {
    await context.close();
  }
}
