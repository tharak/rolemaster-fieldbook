async existingPage=>{
 const context=await existingPage.context().browser().newContext({reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
 const assert=(value,message)=>{if(!value)throw new Error(message);};page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.addInitScript(()=>{Math.random=()=>.49;if(localStorage.getItem('adventure-fixture'))return;localStorage.setItem('adventure-fixture','1');localStorage.setItem('rolemaster-fieldbook-characters-v1',JSON.stringify([{id:'traveler',name:'Mira',race:'Wood Elf',profession:'Ranger',realm:'Channeling',level:'1',xp:'10000',xpHistory:'[]',hits:'150',stats:{Quickness:{temp:90,pot:100,total:4}},skills:[{category:'Weapon • 1-H Edged',name:'Broadsword',ranks:10,special:150}],startingWeapons:JSON.stringify([JSON.stringify(['Weapon • 1-H Edged','Broadsword'])])}]));});
  await page.goto(existingPage.url().split('#')[0]+'#adventure');await page.waitForFunction(()=>document.documentElement.dataset.appReady==='true');
  assert(await page.locator('#adventure-view').isVisible(),'Direct adventure link failed');
  assert(await page.locator('[data-map-node]').count()===18,'Map locations missing');
  const before=await page.locator('.adventure-map').innerHTML();await page.locator('[name="seed"]').fill('bright-havens');await page.locator('[data-action="generate"]').click();assert(await page.locator('.adventure-map').innerHTML()!==before,'Seed did not change geography');
  await page.locator('#adventure-location').selectOption('0-0');await page.locator('[name="party"]').check();await page.locator('#adventure-create [type="submit"]').click();
  await page.locator('[data-action="travel"]').click();await page.locator('[data-action="complete"]').click();
  await page.locator('#adventure-xp-confirm').check();await page.locator('[data-action="award"]').click();
  const xp=await page.evaluate(()=>JSON.parse(localStorage.getItem('rolemaster-fieldbook-characters-v1'))[0].xp);assert(xp==='10012','Travel XP was not recorded');assert(await page.locator('[data-action="award"]').isDisabled(),'Travel XP duplicate allowed');
  await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.appReady==='true');assert(await page.locator('[data-action="award"]').isDisabled(),'Completed award lost on reload');
  await page.locator('[data-action="new"]').click();await page.locator('#adventure-location').selectOption('5-1');await page.locator('[name="party"]').check();await page.locator('#adventure-create [type="submit"]').click();
  await page.evaluate(()=>{const rolls=[.96,.89,.09,.49];let n=0;Math.random=()=>rolls[n++%rolls.length];});await page.locator('[data-action="travel"]').click();
  await page.locator('.adventure-encounter').waitFor();assert(await page.locator('[data-action="travel"]').isDisabled(),'Pending encounter did not pause travel');
  const pending=await page.evaluate(()=>JSON.parse(localStorage.getItem('rolemaster-adventures-v1')).adventures.at(-1).pending.id);
  await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.appReady==='true');assert(await page.evaluate(()=>JSON.parse(localStorage.getItem('rolemaster-adventures-v1')).adventures.at(-1).pending.id)===pending,'Encounter rerolled after reload');
  await page.locator('[data-action="duel"]').click();await page.waitForFunction(()=>document.querySelector('#coliseum-view').classList.contains('active'));
  assert(await page.locator('#coliseum-select-left').inputValue()==='character:traveler','Wrong champion');await page.locator('#coliseum-simulate').click();await page.locator('#coliseum-battle-outcome').waitFor({state:'visible',timeout:30000});
  await page.locator('[data-view="adventure"]').click();assert((await page.locator('.adventure-encounter').textContent()).includes('Coliseum result:'),'Duel result was not returned');
  await page.locator('#adventure-resolve [name="note"]').fill('Drove off the beast and continued along the old road.');await page.locator('#adventure-resolve [type="submit"]').click();assert(await page.locator('.adventure-encounter').count()===0,'Resolution did not clear encounter');
  await page.setViewportSize({width:1440,height:1080});await page.screenshot({path:'output/playwright/adventure-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile overflow');await page.screenshot({path:'output/playwright/adventure-mobile.png',fullPage:true});
  assert(errors.length===0,errors.join('\n'));return {seededMap:true,locations:18,party:true,travel:true,completion:true,travelXp:true,deduplication:true,reload:true,pendingEncounter:true,duelResult:true,mobile:true,pageErrors:errors.length};
 }finally{await context.close();}
}
