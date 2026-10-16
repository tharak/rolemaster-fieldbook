async existingPage=>{
 const context=await existingPage.context().browser().newContext({reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
 const assert=(value,message)=>{if(!value)throw new Error(message);};page.on('pageerror',error=>errors.push(error.message));
 const snapshot=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('rolemaster-guild-v1')));
 const ready=()=>page.waitForFunction(()=>document.documentElement.dataset.appReady==='true'&&document.querySelector('#adventure-app').dataset.ready==='true');
 try{
  await page.goto(existingPage.url().split('#')[0]);await ready();
  assert(await page.locator('#adventure-view').isVisible(),'Adventure not landing page');assert(await page.locator('.guild-member').count()===4,'Starter guild missing');
  assert(await page.locator('#adventure-location').count()===0,'Destination picker returned');assert(await page.locator('.adventure-map-panel > .adventure-journal').count()===1,'Journal moved away');
  const cleric=page.locator('.guild-member').filter({has:page.getByRole('heading',{name:/Cleric /})});await cleric.getByText('Spell lists · 13 ranks',{exact:true}).click();assert((await cleric.textContent()).includes('Healing I'),'Spell lists missing');
  const first=page.locator('.guild-member').first();await first.locator('summary').filter({hasText:'Equipment'}).click();const staff=await first.locator('[data-equipment="weapon"] option').filter({hasText:'Quarterstaff'}).getAttribute('value');await first.locator('[data-equipment="weapon"]').selectOption(staff);assert((await first.textContent()).includes('DB 5'),'Two-handed weapon did not remove shield DB');
  await page.locator('#guild-recruit [name="template"]').selectOption('master:fighter:20');await page.locator('#guild-recruit [type="submit"]').click();assert(await page.locator('.guild-member').count()===5,'Recruit failed');
  for(const box of await page.locator('[name="guild-party"]').all())await box.uncheck();await page.locator('[name="guild-party"]').last().check();
  await page.locator('#guild-depart [name="level"]').fill('1');await page.locator('#guild-depart [name="seed"]').fill('loot-278');await page.locator('#guild-depart [type="submit"]').click();
  await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('rolemaster-guild-v1'));s.expedition.id='integration';s.members[0].damage=20;s.members[0].pp=0;s.members.at(-1).damage=10;localStorage.setItem('rolemaster-guild-v1',JSON.stringify(s));});await page.reload();await ready();
  assert(await page.locator('.guild-member').last().locator('[data-equipment="weapon"]').isDisabled(),'Equipment allowed while away');await page.locator('[data-action="rest"]').click();let s=await snapshot();assert(s.members[0].damage===0&&s.members.at(-1).damage===10,'Rest changed away party');
  // Failure leaves the saved stage unchanged; retry succeeds without duplicate rewards.
  let failed=false;await page.route('**/tables/A-10.9.9.json',route=>{if(!failed){failed=true;return route.fulfill({status:503,body:'Unavailable'});}return route.continue();});
  await page.locator('#adventure-app [data-action="continue"]').click();await page.waitForFunction(()=>document.querySelector('[data-guild-message]').textContent.includes('Retry'));assert((await snapshot()).expedition.stage===0,'Failed load advanced stage');
  let battleSeen=false;
  for(let i=0;i<25;i++){
   s=await snapshot();if(!s.expedition)break;
   const button=await page.locator('#adventure-encounter-dialog').evaluate(el=>el.open)?page.locator('#adventure-encounter-content [data-action="continue"]'):page.locator('#adventure-app [data-action="continue"]');
   await button.click();await page.waitForFunction(()=>document.querySelector('#adventure-encounter-dialog').open);await page.waitForFunction(()=>!document.querySelector('#adventure-app [data-action="continue"]')?.disabled);
   s=await snapshot();const report=(s.expedition||s.history[0]).reports[0];
   if(report.rounds.length){battleSeen=true;assert(await page.locator('.guild-rounds details').count()>0,'Round log absent');assert((await page.locator('.guild-rewards').textContent()).includes('XP gained'),'XP summary absent');break;}
  }
  assert(battleSeen,'No automatic combat occurred');assert(await page.locator('#adventure-view').isVisible(),'Combat navigated away');assert(await page.locator('#adventure-encounter-dialog .coliseum-shell').count()===0,'Coliseum shown');
  await page.screenshot({path:'output/playwright/guild-report-desktop.png'});
  await page.setViewportSize({width:390,height:844});assert(await page.locator('#adventure-encounter-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Report mobile overflow');await page.screenshot({path:'output/playwright/guild-report-mobile.png'});
  await page.keyboard.press('Escape');const saved=await snapshot();assert((saved.expedition||saved.history[0]).items.length>0,'Victory did not drop an item');await page.reload();await ready();assert(JSON.stringify(await snapshot())===JSON.stringify(saved),'Reload changed rewards or wounds');
  if(saved.expedition){await page.locator('#adventure-app [data-action="return"]').click();s=await snapshot();assert(!s.expedition,'Return failed');assert(s.gold===saved.gold+saved.expedition.gold,'Loot not banked exactly once');assert(s.inventory.length===saved.inventory.length+saved.expedition.items.length,'Item drops not banked');}
  const drop=s.inventory.find(i=>i.id.startsWith('loot-'));if(drop){const member=page.locator('.guild-member').last();await member.locator('summary').filter({hasText:'Equipment'}).click();await member.locator(`[data-equipment="${drop.slot}"]`).selectOption(drop.id);assert((await snapshot()).members.at(-1).equipped[drop.slot]===drop.id,'Dropped item could not be equipped');}
  await page.locator('[data-action="rest"]').click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile page overflow');await page.screenshot({path:'output/playwright/guild-base-mobile.png',fullPage:true});
  await page.setViewportSize({width:1440,height:1080});await page.screenshot({path:'output/playwright/guild-base-desktop.png',fullPage:true});
  assert(errors.length===0,errors.join('\n'));
  return {guild:true,recruitment:true,equipment:true,spellLists:true,autoCombat:true,roundReports:true,baseRest:true,returnLoot:true,reload:true,loadingRecovery:true,mobile:true,pageErrors:0};
 }finally{await context.close();}
}
