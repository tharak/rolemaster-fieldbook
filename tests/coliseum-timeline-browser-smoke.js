// Real combat and DOM, deterministic non-lethal dice to reach double-digit rounds.
async (existingPage) => {
  const context = await existingPage.context().browser().newContext();
  const page = await context.newPage();
  const errors = [];
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  page.on('pageerror', error => errors.push(error.message));
  const metrics = () => page.locator('#coliseum-log').evaluate(log => ({
    left:log.scrollLeft, width:log.clientWidth, total:log.scrollWidth,
    rounds:[...log.querySelectorAll('summary')].map(el => Number(/Round (\d+)/.exec(el.textContent)[1])),
    boxes:[...log.querySelectorAll('details')].map(el => ({left:el.offsetLeft,top:el.offsetTop,width:el.getBoundingClientRect().width})),
    pageWidth:document.documentElement.scrollWidth, viewport:innerWidth,
  }));
  try {
    await page.addInitScript(() => { Math.random = () => .49; });
    await page.goto(existingPage.url());
    await page.waitForFunction(() => document.documentElement.dataset.appReady === 'true');
    await page.getByRole('button',{name:'Coliseum',exact:true}).click();
    await page.waitForFunction(() => !document.querySelector('#coliseum-step').disabled);
    const wolf = await page.locator('#coliseum-select-left option').evaluateAll(options => options.find(o => o.textContent.startsWith('Wolf ·')).value);
    await page.locator('#coliseum-select-left').selectOption(wolf);
    await page.locator('#coliseum-select-right').selectOption(wolf);
    const reports = [];
    for (const viewport of [{width:1280,height:900},{width:375,height:812}]) {
      await page.setViewportSize(viewport);
      await page.locator('#coliseum-reset').click();
      await page.locator('#coliseum-step').click();
      assert((await metrics()).left === 0, 'First round must start at left');
      for (let n=2;n<=12;n++) await page.locator('#coliseum-step').click();
      const live = await metrics();
      assert(live.rounds.join(',') === Array.from({length:12},(_,i) => i+1).join(','), 'Rounds must be in numeric chronological order');
      assert(live.boxes.every((box,i) => !i || box.left > live.boxes[i-1].left && box.top === live.boxes[0].top), 'Round columns must append right without wrapping');
      assert(live.total > live.width && live.total-live.width-live.left < 2, 'Must scroll horizontally and follow live end');
      assert(live.pageWidth <= live.viewport, 'Overflow must stay inside log');
      assert(live.boxes[0].width >= 250 && live.boxes[0].width <= 410, 'Unreadable round width');
      const log = page.locator('#coliseum-log');
      assert(await log.getAttribute('tabindex') === '0' && await log.getAttribute('role') === 'region', 'Log must be keyboard accessible');
      await log.evaluate(el => { el.scrollLeft = 0; });
      const firstText = await log.locator('details').first().textContent();
      await log.locator('details').nth(1).evaluate(el => { el.open = false; });
      await page.locator('#coliseum-step').click();
      const reading = await metrics();
      assert(reading.left === 0 && reading.rounds.at(-1) === 13, 'New round yanked reader away from earlier rounds');
      assert(await log.locator('details').first().textContent() === firstText, 'Earlier events changed');
      assert(await log.locator('details').first().getAttribute('open') !== null, 'Earlier round was automatically collapsed');
      assert(await log.locator('details').nth(1).getAttribute('open') === null, 'Reader collapse state lost');
      await log.focus();
      await page.keyboard.press('ArrowRight');
      await page.waitForFunction(() => document.querySelector('#coliseum-log').scrollLeft > 0);
      await log.evaluate(el => { el.scrollLeft = el.scrollWidth; });
      await page.locator('#coliseum-step').click();
      const appended = await metrics();
      assert(appended.rounds.at(-1) === 14 && appended.total-appended.width-appended.left < 2, 'Returning to live edge must resume following');
      await page.locator('#coliseum-reset').click();
      const reset = await metrics();
      assert(reset.left === 0 && reset.rounds.length === 0, 'Reset must clear timeline and scroll');
      await page.locator('#coliseum-step').click();
      assert((await metrics()).rounds.join(',') === '1', 'Reset fight did not restart at round one');
      reports.push({viewport,rounds:14,width:live.width,scrollWidth:live.total,readerPreserved:true,keyboard:true,reset:true,pageOverflow:false});
    }
    assert(errors.length === 0, errors.join('\n'));
    return {timeline:reports,pageErrors:errors.length};
  } finally { await context.close(); }
}
