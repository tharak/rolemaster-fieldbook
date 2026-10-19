async existingPage => {
 const context=await existingPage.context().browser().newContext({viewport:{width:360,height:640},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
 const check=(ok,message)=>{if(!ok)throw new Error(message);};
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('rolemaster-coliseum-v1')));
 const ready=()=>page.waitForSelector('html[data-app-ready="true"]');
 const open=async id=>{if(await page.locator('#game-dialog').isVisible())await page.locator('[data-close-dialog]').click();await page.locator(`[data-tab="${id}"]`).click();};
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(new URL('/',existingPage.url()).href);await ready();
  check(await page.locator('.courtyard-building').count()===6,'six buildings');
  for(const [width,height] of [[320,568],[360,640],[390,844],[844,390],[1280,900]]){
   await page.setViewportSize({width,height});
   check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight),'courtyard fits '+width);
   check(await page.locator('.courtyard-building').evaluateAll(es=>es.every(e=>{const r=e.getBoundingClientRect();return r.width>=44&&r.height>=44&&r.bottom<=innerHeight;})),'touch targets');
   if(width===360||width===1280)await page.screenshot({path:`output/playwright/courtyard-${width}.png`});
  }
  await page.setViewportSize({width:360,height:640});await open('coliseum');check(await page.locator('[data-fight]:disabled').count()===3,'empty team disabled');
  await page.locator('#game-dialog [data-tab="roster"]').click();await page.locator('[data-recruit]').click();
  const value=await page.locator('[name="template"] option').evaluateAll(os=>os.find(o=>o.textContent.startsWith('Fighter ·')).value);
  await page.locator('[name="template"]').selectOption(value);await page.locator('[name="name"]').fill('Rowan');await page.locator('[data-hire] button').click();
  check((await saved()).arena.lineup.length===1,'founder selected');await page.locator('[data-member]').click();await page.locator('[data-rename]').click();await page.locator('[data-back]').click();check(await page.locator('[data-rename]').isVisible(),'Back returns fighter details');await page.locator('[data-back]').click();await page.locator('[data-recruit]').click();await page.locator('[name="template"]').selectOption(value);await page.locator('[data-hire] button').click();
  check((await saved()).arena.lineup.length===1,'second recruit benched');await page.locator('[data-fighter]').last().check();check((await saved()).arena.lineup.length===2,'lineup saved');
  await page.reload();await ready();await open('roster');check(await page.locator('[data-fighter]:checked').count()===2,'lineup reloaded');
  await open('coliseum');const before=await saved();await page.locator('[data-generate]').click();check((await saved()).arena.revision===before.arena.revision+1,'free refresh');
  check(await page.locator('[data-fight]').evaluateAll(es=>es.every(e=>{const r=e.getBoundingClientRect(),c=e.closest('.dialog-content').getBoundingClientRect();return r.top>=c.top&&r.bottom<=c.bottom&&r.bottom<=innerHeight;})),'three fights visible without scrolling');
  await page.screenshot({path:'output/playwright/coliseum-360.png'});
  await page.locator('[data-back]').focus();await page.keyboard.press('Shift+Tab');check(await page.evaluate(()=>document.querySelector('#game-dialog').contains(document.activeElement)),'focus trapped');
  for(const [width,height] of [[320,568],[390,844],[844,390],[1280,900]]){await page.setViewportSize({width,height});check(await page.locator('#game-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth),'dialog width '+width);await page.locator('.arena-offer summary').last().click();await page.locator('.arena-offer summary').last().click();}
  await page.setViewportSize({width:360,height:640});
  await page.locator('.arena-offer summary').first().click();check((await saved()).arena.reports.length===0,'details do not fight');await page.locator('.arena-offer summary').first().click();
  // A failed save must leave the previous state intact and show a usable error.
  const unchanged=JSON.stringify(await saved());await page.evaluate(()=>{window.originalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw Error('Test save failed');};});
  await page.locator('[data-fight]').first().click();await page.waitForFunction(()=>document.querySelector('[data-modal-message]').textContent.includes('Test save failed'));
  check(JSON.stringify(await saved())===unchanged,'failed save unchanged');await page.evaluate(()=>Storage.prototype.setItem=window.originalSet);
  await page.locator('[data-close-dialog]').click();await page.locator('[data-tab="coliseum"]').click();
  await page.locator('[data-fight]').first().evaluate(b=>{b.click();b.click();});await page.waitForSelector('[data-arena-playback]');
  const after=await saved();check(after.arena.reports.length===1,'duplicate tap only fights once');
  await page.locator('[data-pause]').click();check(await page.locator('[data-skip]').evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}),'playback controls visible');
  await page.locator('[data-skip]').click();await page.locator('[data-replay]').click();await page.locator('[data-skip]').click();check(JSON.stringify(await saved())===JSON.stringify(after),'reward once');
  await page.locator('[data-close-dialog]').click();check(await page.locator('.courtyard').isVisible(),'returns courtyard');await page.waitForFunction(()=>document.activeElement.dataset.tab==='coliseum');await open('hall');check(await page.locator('[data-report]').count()===1,'history in hall');
  await page.keyboard.press('Escape');await page.goto(new URL('/#roster',existingPage.url()).href);await page.waitForSelector('[data-recruit]');check(await page.locator('#game-dialog').isVisible(),'legacy roster');
  await page.goto(new URL('/#ludus',existingPage.url()).href);check(!await page.locator('#game-dialog').isVisible(),'legacy ludus courtyard');
  await open('coliseum');const large=await page.addStyleTag({content:'#game-dialog p,#game-dialog button,#game-dialog summary,#game-dialog span,#game-dialog small,#game-dialog h3 {font-size:24px!important}'});check(await page.locator('.dialog-content').evaluate(e=>e.scrollHeight>e.clientHeight),'large text scroll');await page.locator('[data-fight]').last().scrollIntoViewIfNeeded();await large.evaluate(e=>e.remove());
  await page.locator('[data-close-dialog]').click();
  // External writes are adopted; stale writes without a storage event are rejected.
  await page.evaluate(()=>{const key='rolemaster-coliseum-v1',s=JSON.parse(localStorage.getItem(key));s.gold++;localStorage.setItem(key,JSON.stringify(s));});await open('coliseum');await page.locator('[data-generate]').click();check((await page.locator('[data-modal-message]').innerText()).includes('another tab'),'stale write guarded');
  await page.evaluate(()=>dispatchEvent(new StorageEvent('storage',{key:'rolemaster-coliseum-v1'})));check(!await page.locator('#game-dialog').isVisible(),'external update closes stale dialog');
  check(errors.length===0,errors.join('\n'));return 'PASS: courtyard layouts, lineup, two-tap fight, details, duplicate taps, failed and stale saves, replay, reward once, legacy links';
 }finally{await context.close();}
}
