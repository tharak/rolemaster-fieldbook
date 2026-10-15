// Run with Playwright CLI after opening a local Fieldbook URL.
// A separate browser context keeps existing characters and encounters untouched.
async (existingPage) => {
  const context = await existingPage.context().browser().newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror',error => errors.push(error.message));
  const assert = (condition,message) => { if (!condition) throw new Error(message); };
  const selectCreature = async (side,name) => {
    const select = page.locator(`#coliseum-select-${side}`);
    const options = await select.locator('option').evaluateAll(options => options.map(option => ({value:option.value,label:option.textContent})));
    const option = options.find(option => option.label.startsWith(`${name} ·`));
    assert(option,`Missing creature ${name}`);
    await select.selectOption(option.value);
  };
  try {
    await page.route('**/tables/creatures.json',route => route.fulfill({status:503,body:'Unavailable'}));
    await page.goto(existingPage.url());
    await page.waitForFunction(() => document.documentElement.dataset.appReady === 'true');
    await page.getByRole('button',{name:'Coliseum',exact:true}).click();
    await page.locator('#coliseum-retry').waitFor({state:'visible'});
    assert(await page.locator('#coliseum-simulate').isDisabled(),'Fight started without tables');
    await page.unroute('**/tables/creatures.json');
    await page.locator('#coliseum-retry').click();
    await page.locator('#coliseum-status').getByText('Wolf vs Tiger.').waitFor();
    assert(await page.locator('#coliseum-select-left option').count() === 130,'Wrong creature count');
    await page.locator('#coliseum-search-left').fill('missing creature 123456');
    assert((await page.locator('#coliseum-match-left').textContent()).startsWith('0 matching'),'Missing search does not report empty matches');
    assert(await page.locator('#coliseum-fighter-left h2').textContent() === 'Wolf','Filtering changed the fighter');
    await page.locator('#coliseum-search-left').fill('');
    await page.locator('#coliseum-step').click();
    assert(await page.locator('#coliseum-round').textContent() === 'Round 1','Step did not advance one round');
    assert(await page.locator('#coliseum-log details').count() === 1,'Step did not add log');
    await page.locator('#coliseum-reset').click();
    await page.locator('#coliseum-simulate').click();
    await page.locator('#coliseum-pause').click();
    const paused = await page.locator('#coliseum-round').textContent();
    await page.waitForTimeout(300);
    assert(await page.locator('#coliseum-round').textContent() === paused,'Paused fight continued');
    await page.locator('#coliseum-simulate').click();
    await page.getByRole('button',{name:'Tables',exact:true}).click();
    const hiddenRound = await page.locator('#coliseum-round').textContent();
    await page.waitForTimeout(300);
    assert(await page.locator('#coliseum-round').textContent() === hiddenRound,'Fight kept running after leaving arena');
    await page.getByRole('button',{name:'Coliseum',exact:true}).click();
    await page.locator('#coliseum-reset').click();
    await selectCreature('left','Dragon (typical adult)');
    await selectCreature('right','Ant (Giant)');
    await page.locator('#coliseum-simulate').click();
    await page.waitForFunction(() => /wins|Draw after/.test(document.querySelector('#coliseum-status').textContent),{},{timeout:30000});
    assert(await page.locator('#coliseum-simulate').isDisabled(),'Completed fight can restart without reset');
    const result = await page.locator('#coliseum-status').textContent();
    assert(await page.locator('#coliseum-log details').count() > 0,'Missing fight log');
    await page.reload();
    await page.waitForFunction(() => document.documentElement.dataset.appReady === 'true');
    await page.getByRole('button',{name:'Coliseum',exact:true}).click();
    await page.locator('#coliseum-status').getByText('Dragon (typical adult) vs Ant (Giant).').waitFor();
    assert(await page.locator('#coliseum-round').textContent() === 'Ready','Reload retained stale fight');
    await selectCreature('left','Wolf');
    await selectCreature('right','Wolf');
    await page.locator('#coliseum-step').click();
    assert(await page.locator('#coliseum-log details').count() === 1,'Duplicate creature duel failed');
    await page.setViewportSize({width:375,height:812});
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),'Mobile page has horizontal overflow');
    assert(await page.locator('#coliseum-step').isVisible(),'Mobile controls missing');
    assert(errors.length === 0,errors.join('\n'));
    return {loadingRetry:'passed',creatureSearch:'passed',singleRound:'passed',pauseAndResume:'passed',navigationPause:'passed',fullFight:result,persistence:'passed',sameCreature:'passed',mobile:'passed',pageErrors:errors.length};
  } finally { await context.close(); }
}
