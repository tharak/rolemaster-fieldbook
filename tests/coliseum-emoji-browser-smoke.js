async (existingPage) => {
  const context = await existingPage.context().browser().newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror',error => errors.push(error.message));
  const assert = (condition,message) => { if (!condition) throw new Error(message); };
  const open = async () => {
    await page.getByRole('button',{name:'Coliseum',exact:true}).click();
    await page.waitForFunction(() => !document.querySelector('#coliseum-step').disabled);
  };
  const state = () => page.evaluate(() => JSON.stringify({
    round:document.querySelector('#coliseum-round').textContent,
    status:document.querySelector('#coliseum-status').textContent,
    log:document.querySelector('#coliseum-log').innerHTML,
    scroll:document.querySelector('#coliseum-log').scrollLeft,
    health:[...document.querySelectorAll('.coliseum-fighter progress')].map(el => [el.value,el.max]),
    stats:[...document.querySelectorAll('.coliseum-stats,.coliseum-attacks,.coliseum-effects')].map(el => el.textContent),
    selected:[...document.querySelectorAll('.coliseum-picker select')].map(el => el.value),
  }));
  try {
    await page.addInitScript(() => { Math.random = () => .49; });
    await page.goto(existingPage.url());
    await open();
    const toggle = page.getByRole('checkbox',{name:'Use emojis',exact:true});
    assert(!await toggle.isChecked(),'Default must retain symbols');
    assert(await page.locator('#coliseum-fighter-left .coliseum-crest').textContent() === 'W','Missing original wolf initial');
    await page.locator('.coliseum-rules > summary').click();
    assert(await page.locator('.coliseum-rules #coliseum-symbol-legend li').count() === 3,'Legend must cover both contenders and duel');
    const legend = await page.locator('#coliseum-symbol-legend').textContent();
    for (const text of ['W','🐺','Wolf','T','🐯','Tiger','⚔','⚔️','Melee duel']) assert(legend.includes(text),'Incomplete legend: '+text);
    const reports = [];
    for (const viewport of [{width:1280,height:900},{width:375,height:812}]) {
      await page.setViewportSize(viewport);
      await page.locator('#coliseum-step').click();
      const before = await state();
      await toggle.check();
      assert(await state() === before,'Emoji toggle changed fight state or log');
      for (const [side,name,emoji] of [['left','Wolf','🐺'],['right','Tiger','🐯']]) {
        const crest = page.locator('#coliseum-fighter-'+side+' .coliseum-crest');
        assert(await crest.textContent() === emoji,'Wrong emoji');
        assert(await crest.getAttribute('aria-label') === name && await crest.getAttribute('title') === name,'Lost accessible identity');
      }
      assert(await page.locator('#coliseum-duel-symbol').textContent() === '⚔️','Duel should use emoji presentation');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),'Emoji mode creates page overflow');
      await toggle.uncheck();
      assert(await state() === before,'Switching back changed fight');
      assert(await page.locator('#coliseum-fighter-left .coliseum-crest').textContent() === 'W','Symbols not restored');
      reports.push({viewport,bothModes:true,stateInvariant:true,noOverflow:true});
    }
    await toggle.check();
    await page.reload(); await open();
    assert(await toggle.isChecked(),'Enabled preference not restored');
    assert(await page.locator('#coliseum-fighter-left .coliseum-crest').textContent() === '🐺','Persisted mode not rendered');
    await toggle.uncheck();
    await page.reload(); await open();
    assert(!await toggle.isChecked(),'Disabled preference not restored');
    const dragon = await page.locator('#coliseum-select-left option').evaluateAll(options => options.find(o => o.textContent.startsWith('Dragon (typical adult) ·')).value);
    await page.locator('#coliseum-select-left').selectOption(dragon);
    assert((await page.locator('#coliseum-symbol-legend').textContent()).includes('🐉'),'Legend stale after selection change');
    await toggle.check();
    assert(await page.locator('#coliseum-fighter-left .coliseum-crest').textContent() === '🐉','Selection mapping stale');
    assert(errors.length === 0, errors.join('\n'));
    return {emoji:reports,persistence:'on/off passed',legend:'both contenders + duel; updates with selection',pageErrors:errors.length};
  } finally { await context.close(); }
}
