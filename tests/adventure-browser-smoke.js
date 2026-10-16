async existingPage=>{
 const context=await existingPage.context().browser().newContext({reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
 const assert=(value,message)=>{if(!value)throw new Error(message);};page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.addInitScript(()=>{Math.random=()=>.49;if(localStorage.getItem('adventure-fixture'))return;localStorage.setItem('adventure-fixture','1');localStorage.setItem('rolemaster-fieldbook-characters-v1',JSON.stringify([{id:'traveler',name:'Mira',race:'Wood Elf',profession:'Ranger',realm:'Channeling',level:'1',xp:'10000',xpHistory:'[]',hits:'150',stats:{Quickness:{temp:90,pot:100,total:4}},skills:[{category:'Weapon • 1-H Edged',name:'Broadsword',ranks:10,special:150}],startingWeapons:JSON.stringify([JSON.stringify(['Weapon • 1-H Edged','Broadsword'])])}]));});
  await page.goto(existingPage.url().split('#')[0]);await page.waitForFunction(()=>document.documentElement.dataset.appReady==='true');
  assert(await page.locator('#adventure-view').isVisible(),'Adventure is not the landing page');assert(await page.locator('.topbar .nav-link').first().getAttribute('data-view')==='adventure','Adventure is not first in navigation');
  await page.locator('.adventure-heading [data-action="characters"]').click();assert(await page.locator('#home-view').isVisible(),'Create character did not open Characters');await page.locator('[data-view="adventure"]').click();
  assert(await page.locator('#adventure-location').count()===0,'Destination picker remains');assert(await page.locator('.adventure-map-panel > .adventure-journal').count()===1,'Journal was not moved beneath the map');
  assert(await page.locator('[data-map-node]').count()===18,'Map locations missing');
  const before=await page.locator('.adventure-map').innerHTML();await page.locator('[name="seed"]').fill('bright-havens');await page.locator('[data-action="generate"]').click();assert(await page.locator('.adventure-map').innerHTML()!==before,'Seed did not change geography');
  await page.locator('[data-map-node="0-0"]').focus();await page.keyboard.press('Enter');await page.locator('[name="party"]').check();await page.locator('#adventure-create [type="submit"]').click();
  await page.locator('[data-action="travel"]').click();await page.locator('[data-action="complete"]').click();
  await page.locator('#adventure-xp-confirm').check();await page.locator('[data-action="award"]').click();
  const xp=await page.evaluate(()=>JSON.parse(localStorage.getItem('rolemaster-fieldbook-characters-v1'))[0].xp);assert(xp==='10012','Travel XP was not recorded');assert(await page.locator('[data-action="award"]').isDisabled(),'Travel XP duplicate allowed');
  await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.appReady==='true');assert(await page.locator('[data-action="award"]').isDisabled(),'Completed award lost on reload');
  await page.locator('[data-action="new"]').click();await page.locator('[data-map-node="5-1"]').click();await page.locator('[name="party"]').check();await page.locator('#adventure-create [type="submit"]').click();
  await page.evaluate(()=>{const rolls=[.96,.89,.09,.49];let n=0;Math.random=()=>rolls[n++%rolls.length];});await page.locator('[data-action="travel"]').click();
  await page.locator('.adventure-encounter').waitFor();assert(await page.locator('[data-action="travel"]').isDisabled(),'Pending encounter did not pause travel');
  const pendingSnapshot=await page.evaluate(()=>({characters:localStorage.getItem('rolemaster-fieldbook-characters-v1'),adventures:localStorage.getItem('rolemaster-adventures-v1')}));
  const pending=await page.evaluate(()=>JSON.parse(localStorage.getItem('rolemaster-adventures-v1')).adventures.at(-1).pending.id);
  await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.appReady==='true');assert(await page.evaluate(()=>JSON.parse(localStorage.getItem('rolemaster-adventures-v1')).adventures.at(-1).pending.id)===pending,'Encounter rerolled after reload');
  await page.locator('#adventure-arena-host #coliseum-step').waitFor();assert(await page.locator('#adventure-view').isVisible(),'Encounter navigated away from map');assert(await page.locator('#coliseum-view').isHidden(),'Standalone Coliseum opened');
  await page.setViewportSize({width:1440,height:1080});await page.screenshot({path:'output/playwright/adventure-encounter-desktop.png'});
  await page.setViewportSize({width:390,height:844});assert(await page.locator('#adventure-encounter-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Overlay overflows on mobile');await page.screenshot({path:'output/playwright/adventure-encounter-mobile.png'});
  await page.locator('#coliseum-step').click();await page.waitForFunction(()=>document.querySelector('#coliseum-battle').dataset.playback==='idle');const round=await page.locator('#coliseum-round').textContent();
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#adventure-encounter-dialog').open);assert(await page.locator('#coliseum-view .coliseum-shell').count()===1,'Arena not restored on close');
  await page.locator('[data-action="encounter"]').click();await page.locator('#adventure-arena-host #coliseum-step').waitFor();assert(await page.locator('#coliseum-round').textContent()===round,'Reopening restarted the fight');
  assert(await page.locator('#coliseum-select-left').inputValue()==='character:traveler','Wrong champion');if(await page.locator('#coliseum-simulate').isEnabled())await page.locator('#coliseum-simulate').click();await page.locator('#coliseum-battle-outcome').waitFor({state:'visible',timeout:30000});
  assert(await page.locator('#adventure-view').isVisible(),'Fight result navigated away');assert((await page.locator('.adventure-encounter').textContent()).includes('Coliseum result:'),'Duel result was not returned');
  await page.locator('#adventure-resolve [name="note"]').fill('Drove off the beast and continued along the old road.');await page.locator('#adventure-resolve [type="submit"]').click();assert(await page.locator('.adventure-encounter').count()===0,'Resolution did not clear encounter');assert(!await page.locator('#adventure-encounter-dialog').evaluate(el=>el.open),'Resolution left overlay open');assert((await page.locator('.adventure-map-panel .adventure-journal').textContent()).includes('Coliseum:'),'Journal missing fight result');
  await page.setViewportSize({width:1440,height:1080});await page.screenshot({path:'output/playwright/adventure-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile overflow');await page.screenshot({path:'output/playwright/adventure-mobile.png',fullPage:true});
  // Slow/failed loading must not reopen a dismissed encounter or strand the map.
  for(const mode of ['delay','failure']){
   const isolated=await existingPage.context().browser().newContext({reducedMotion:'reduce'}),check=await isolated.newPage();let release;
   const gate=new Promise(resolve=>{release=resolve;});let intercepted=false;
   try{
    await check.addInitScript(snapshot=>{localStorage.setItem('rolemaster-fieldbook-characters-v1',snapshot.characters);localStorage.setItem('rolemaster-adventures-v1',snapshot.adventures);},pendingSnapshot);
    await check.route('**/tables/creatures.json',async route=>{if(intercepted)return route.continue();intercepted=true;if(mode==='failure')return route.fulfill({status:503,body:'Unavailable'});await gate;await route.continue();});
    const requested=check.waitForRequest('**/tables/creatures.json');await check.goto(existingPage.url().split('#')[0]);await requested;
    await check.locator('#adventure-encounter-dialog[open]').waitFor();
    if(mode==='delay'){await check.keyboard.press('Escape');const response=check.waitForResponse('**/tables/creatures.json');release();await response;assert(!await check.locator('#adventure-encounter-dialog').evaluate(el=>el.open),'Late loading reopened overlay');assert(await check.locator('#adventure-arena-host .coliseum-shell').count()===0,'Late loading mounted hidden arena');await check.locator('[data-action="encounter"]').click();}
    else {await check.waitForFunction(()=>document.querySelector('#adventure-fight-message').textContent.includes('retry'));await check.locator('[data-action="duel"]').click();}
    await check.locator('#adventure-arena-host #coliseum-step').waitFor();assert(await check.locator('#adventure-view').isVisible(),'Recovery navigated away');
   }finally{release();await isolated.close();}
  }
  assert(errors.length===0,errors.join('\n'));return {landingPage:true,createCharacter:true,mapKeyboard:true,journalMoved:true,encounterOverlay:true,closeResume:true,loadingRecovery:true,seededMap:true,locations:18,party:true,travel:true,completion:true,travelXp:true,deduplication:true,reload:true,pendingEncounter:true,duelResult:true,mobile:true,pageErrors:errors.length};
 }finally{await context.close();}
}
