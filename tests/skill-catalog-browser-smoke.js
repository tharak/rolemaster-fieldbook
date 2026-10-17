// Run via playwright-cli run-code --filename; uses an isolated roster.
async existingPage => {
  const context = await existingPage.context().browser().newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const open = 'Spells • Own Realm Open Lists';
  const base = 'Spells • Own Realm Own Base Lists';
  const record = category => page.locator(`.a4-skill-container[data-category="${category}"] .a4-skill-row`);
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('rolemaster-fieldbook-characters-v1'))[0]);
  try {
    await page.goto(existingPage.url());
    await page.waitForFunction(() => document.documentElement.dataset.appReady === 'true' && document.querySelector('.table-choice'));
    await page.locator('.nav-link[data-view="home"]').click();
    await page.locator('#new-character').click();
    await page.locator('#character-form [name="name"]').fill('Skill Catalog Test');
    await page.getByRole('radio', {name:'Magician', exact:true}).check();
    assert(await record(open).count() === 10, 'Missing open lists');
    assert(await record(base).count() === 6, 'Missing Magician base lists');
    assert(await page.locator('.a4-template').count() === 0, 'Generic templates remain');
    await page.locator('#open-apprenticeship-picker').click();
    await page.locator('#apprenticeship-picker .apprenticeship-add summary').click();
    await page.locator(`#apprenticeship-category-options input[value="${open}"]`).check();
    assert(await page.locator('#apprenticeship-skill-name option').count() === 11, 'Wrong apprenticeship choices');
    await page.locator('#apprenticeship-skill-name').selectOption('Delving Ways');
    await page.locator('#apprenticeship-add-skill').click();
    // Grant ranks through the same form inputs used by development and save.
    await page.evaluate(category => {
      document.querySelector('#apprenticeship-picker').close();
      const row = [...document.querySelectorAll('.skill-row')].find(r => r.dataset.category === category && r.querySelector('[name="skill-name"]').value === 'Delving Ways');
      const start = row.querySelector('[name="skill-start"]'); start.value = '2'; start.dispatchEvent(new Event('input', {bubbles:true}));
    }, open);
    await page.locator(`.a4-skill-container[data-category="${open}"] [data-skill="Delving Ways"] .favorite-skill`).click();
    await page.getByRole('radio', {name:'Cleric', exact:true}).check();
    assert(await record(base).count() === 6, 'Base choices did not refresh');
    assert((await saved()).skills.some(s => s.name === 'Delving Ways' && Number(s.start) === 2), 'Realm change erased ranks');
    assert((await saved()).favoriteSkills.includes('Delving Ways'), 'Realm change erased favorite');
    // Inject a legacy generic and a custom specialization to exercise old saves.
    await page.evaluate(() => {
      const key = 'rolemaster-fieldbook-characters-v1';
      const records = JSON.parse(localStorage.getItem(key));
      records[0].skills.push({category:'Directed Spells',name:'Directed attack*',start:'3',buy:'0',item:'5',special:'2'}, {category:'Artistic • Active',name:'Play Instrument (legacy harp)',start:'4',buy:'0'});
      localStorage.setItem(key, JSON.stringify(records));
    });
    await page.reload();
    await page.locator('.nav-link[data-view="home"]').click();
    await page.locator('.character-card').click();
    await page.locator('#edit-character').click();
    await page.getByRole('button', {name:'Replace Directed attack* with a catalog skill', exact:true}).click();
    await page.locator('#skill-choice-search').fill('Fire');
    assert(await page.locator('#skill-choice-list button:visible').count() === 1, 'Skill search failed');
    await page.locator('#skill-choice-list button[data-choice="Fire Bolt"]').click();
    const result = await saved();
    const bolt = result.skills.find(s => s.name === 'Fire Bolt');
    assert(Number(bolt?.start) === 3 && Number(bolt.item) === 5 && Number(bolt.special) === 2, 'Explicit replacement lost values');
    assert(result.skills.some(s => s.name === 'Play Instrument (legacy harp)' && Number(s.start) === 4), 'Custom save lost');
    assert(result.skills.filter(s => s.name === 'Fire Bolt').length === 1, 'Duplicate skill');
    assert(errors.length === 0, errors.join('\n'));
    return {spellLists:'passed', fixedChoices:'passed', realmChange:'passed', search:'passed', legacyReplacement:'passed', saveReload:'passed', pageErrors:errors.length};
  } finally { await context.close(); }
}
