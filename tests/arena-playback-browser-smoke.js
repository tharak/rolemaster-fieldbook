async existingPage => {
 const context=await existingPage.context().browser().newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
 const check=(ok,message)=>{if(!ok)throw new Error(message);};
 const saved=()=>page.evaluate(()=>localStorage.getItem('rolemaster-coliseum-v1'));
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(existingPage.url());await page.waitForSelector('.courtyard');
  await page.evaluate(async()=>{
   const {newArena,recruitArena,generateOffers,saveArena}=await import('./src/arena-rules.js');
   const {catalog,opponents}=await (await import('./src/guild-data.js')).loadGuildMasterData();
   let s=newArena('playback-browser',opponents);s.gold=100;
   const template=catalog.find(c=>c.profession==='Fighter'&&c.level===1);
   for(let i=0;i<6;i++)s=recruitArena(s,template,'Fighter '+(i+1));
   s.arena.lineup=s.members.map(m=>m.id);s=generateOffers(s,opponents);saveArena(localStorage,s);
  });
  await page.reload();await page.waitForSelector('.courtyard');await page.locator('[data-tab="coliseum"]').click();
  await page.locator('[data-fight]').last().click();await page.waitForSelector('[data-arena-playback]');
  await page.locator('[data-pause]').click();
  const committed=await saved(),report=JSON.parse(committed).arena.reports[0];
  check(report.playback.fighters.length===6+report.enemies.length,'all fighters recorded');
  check(await page.locator('[data-replay-unit]').count()===report.playback.fighters.length,'all fighters shown');
  const count=await page.locator('[data-action-count]').innerText();await page.waitForTimeout(1600);check(await page.locator('[data-action-count]').innerText()===count,'pause stops timer');
  await page.locator('[data-step]').click();check(await page.locator('[data-round-label]').innerText()==='Round 1','round step');
  await page.locator('[data-step]').click();check(await page.locator('[data-action-count]').innerText()==='2 / '+(report.rounds.length+report.rounds.flatMap(r=>r.events).length),'single action step');
  const expected=await page.evaluate(async()=>{const {applyPlaybackChanges}=await import('./src/arena-playback.js');const r=JSON.parse(localStorage.getItem('rolemaster-coliseum-v1')).arena.reports[0];return applyPlaybackChanges(r.playback.initial,r.rounds[0].events[0].changes);});
  for(const u of expected)check(await page.locator(`[data-replay-unit="${u.id}"] [role="meter"]`).getAttribute('aria-valuenow')===String(u.hp),'accurate HP '+u.id);
  await page.locator('[data-speed]').selectOption('4');await page.locator('[data-pause]').click();await page.waitForTimeout(750);await page.locator('[data-pause]').click();check(await page.locator('[data-action-count]').innerText()!=='2 / '+(report.rounds.length+report.rounds.flatMap(r=>r.events).length),'autoplay advances');
  for(const width of [320,390,1280]){await page.setViewportSize({width,height:900});check(await page.locator('#game-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth),'dialog overflow '+width);check(await page.locator('[data-stage]').evaluate(e=>e.scrollWidth<=e.clientWidth),'stage overflow '+width);}
  await page.screenshot({path:'output/playwright/arena-playback-desktop.png'});
  // Walk the remaining recorded timeline, checking that a real critical is spotlighted.
  const walked=await page.evaluate(()=>{let critical=false,steps=0;while(document.querySelector('[data-view-result]').hidden&&steps++<2000){document.querySelector('[data-step]').click();if(document.querySelector('.replay-critical'))critical=true;}return {critical,finished:!document.querySelector('[data-view-result]').hidden};});
  check(walked.finished,'natural completion');check(!report.criticals.length||walked.critical,'critical spotlight');
  for(const u of report.playback.final)check(await page.locator(`[data-replay-unit="${u.id}"] [role="meter"]`).getAttribute('aria-valuenow')===String(u.hp),'final health');
  check(await saved()===committed,'playback never mutates save');
  await page.locator('[data-view-result]').click();await page.locator('[data-replay]').click();await page.locator('[data-pause]').click();
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'output/playwright/arena-playback-mobile.png'});
  await page.locator('[data-skip]').click();check(await saved()===committed,'skip and replay never pay again');
  await page.locator('[data-replay]').click();await page.keyboard.press('Escape');await page.waitForTimeout(1400);check(!await page.locator('#game-dialog').isVisible(),'escape closes playback');
  await page.reload();await page.locator('[data-tab="hall"]').click();await page.waitForSelector('[data-report]');check(await saved()===committed,'reload preserves outcome');
  // Old reports still open their recap without pretending to have health snapshots.
  await page.evaluate(()=>{const key='rolemaster-coliseum-v1',s=JSON.parse(localStorage.getItem(key));delete s.arena.reports[0].playback;localStorage.setItem(key,JSON.stringify(s));});
  await page.reload();await page.locator('[data-tab="hall"]').click();await page.locator('[data-report]').first().click();check(await page.locator('.arena-result').isVisible()&&await page.locator('[data-replay]').count()===0,'legacy report fallback');
  check(errors.length===0,errors.join('\n'));return 'PASS: six-fighter playback, exact HP, pause, step, speed, criticals, completion, replay, skip, Escape, reload, old reports, and mobile layouts';
 }finally{await context.close();}
}
