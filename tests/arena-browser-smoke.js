async existingPage => {
 const context=await existingPage.context().browser().newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
 const check=(ok,message)=>{if(!ok)throw new Error(message);};
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('rolemaster-coliseum-v1')));
 const ready=()=>page.waitForSelector('html[data-app-ready="true"]');
 page.on('pageerror',error=>errors.push(error.message));
 try{
  await context.addInitScript(()=>localStorage.setItem('rolemaster-guild-beta-v2','legacy untouched'));
  await page.goto(existingPage.url());await ready();
  check(await page.locator('.arena-offer').count()===3,'three matchups');
  check(await page.evaluate(()=>localStorage.getItem('rolemaster-guild-beta-v2')==='legacy untouched'),'legacy preserved');
  check((await saved()).members.length===0,'fresh roster');
  await page.locator('[data-recruit]').click();const value=await page.locator('[name="template"] option').evaluateAll(options=>options.find(o=>o.textContent.startsWith('Fighter ·')).value);await page.locator('[name="template"]').selectOption(value);
  await page.locator('[name="name"]').fill('Rowan');await page.locator('[data-hire] button').click();check((await saved()).gold===20,'free founder');
  const first=await saved();await page.locator('[data-generate]').click();const regenerated=await saved();check(regenerated.arena.revision===first.arena.revision+1&&regenerated.gold===20,'free reroll');
  await page.locator('[data-offer]').first().click();await page.locator('[data-fight]').click();await page.waitForSelector('[data-arena-playback]');await page.locator('[data-skip]').click();await page.waitForSelector('.arena-result');
  const after=await saved();check(after.arena.reports.length===1,'one battle');check(after.arena.offers.length===3&&after.arena.revision===regenerated.arena.revision+1,'all matchups refreshed');
  check(await page.locator('.arena-rounds').count()===1,'round log available');
  check(await page.locator('.arena-critical').count()===after.arena.reports[0].criticals.length,'all recorded criticals presented');
  await page.screenshot({path:'output/playwright/arena-result-mobile.png',fullPage:true});
  await page.locator('[data-close-dialog]').click();await page.locator('[data-report]').first().click();check(JSON.stringify(await saved())===JSON.stringify(after),'recap does not pay again');await page.locator('[data-close-dialog]').click();
  await page.reload();await ready();check(JSON.stringify(await saved())===JSON.stringify(after),'reload persistence');
  await page.locator('[data-tab="roster"]').click();await page.locator('[data-rest]').click();check((await saved()).arena.day===after.arena.day+1,'treatment day');
  await page.locator('[data-recruit]').click();await page.locator('[name="name"]').fill('Willow');await page.locator('[data-hire] button').click();check((await saved()).members.length===2,'second recruit');
  await page.locator('[data-tab="coliseum"]').click();await page.locator('[data-generate]').click();
  check(await page.locator('[data-fighter]:checked').count()===2,'party selection');
  const fixed=JSON.stringify((await saved()).arena.offers);await page.locator('[data-fighter]').last().uncheck();check(JSON.stringify((await saved()).arena.offers)===fixed,'party choice does not regenerate enemies');
  for(const width of [320,390,1280]){await page.setViewportSize({width,height:900});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow at '+width);}
  await page.screenshot({path:'output/playwright/arena-desktop.png',fullPage:true});
  check(errors.length===0,errors.join('\n'));return 'PASS: fresh arena, three groups, reroll, recruitment, party choice, battle, critical recap, no duplicate rewards, persistence, treatment, mobile and desktop';
 }finally{await context.close();}
}
