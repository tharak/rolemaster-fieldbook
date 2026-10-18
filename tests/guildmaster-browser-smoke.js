async existingPage=>{
 const context=await existingPage.context().browser().newContext({reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
 const assert=(value,message)=>{if(!value)throw new Error(message);};page.on('pageerror',error=>errors.push(error.message));
 const key='rolemaster-guildmaster-v1';
 const ready=()=>page.waitForFunction(()=>document.documentElement.dataset.appReady==='true'&&document.querySelector('#guildmaster-app').dataset.ready==='true');
 const snapshot=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
 const advance=async()=>{const turn=(await snapshot()).management.turn;await page.locator('[data-manager-action="advance"]').click();await page.waitForFunction(({key,turn})=>JSON.parse(localStorage.getItem(key)).management.turn===turn+1,{key,turn});};
 const order=async(id,action)=>page.locator(`[data-member-id="${id}"][data-order-action="${action}"]`).click();
 try{
  await page.goto(existingPage.url().split('#')[0]+'#guildmaster');await ready();
  let state=await snapshot();const id=state.members[0].id;
  assert(state.tableOnly&&state.members.length===4,'Initial fixed profiles missing');
  assert(state.members.every(member=>member.spellLists.length===0),'Invented spells remain');
  assert(await page.locator('#manager-recruit option').count()===45,'Recruit catalog wrong');
  assert(await page.locator('.manager-printed-stats').count()===4,'Printed stats missing');
  assert(await page.locator('[data-pick-equipment],[data-pick-spells],[data-shop-buy]').count()===0,'Custom loadout UI remains');
  const catalogs=await page.evaluate(async()=>{const {catalog,opponents}=await (await import('./guild-data.js')).loadGuildMasterData();return {members:catalog.length,monsters:opponents.filter(c=>c.group==='Monster').length,animals:opponents.filter(c=>c.group==='Animal').length};});
  assert(catalogs.members===45&&catalogs.monsters>0&&catalogs.animals>0,'Missing opponent table');
  await order(id,'work');assert((await snapshot()).gold===0,'Order acted early');await advance();state=await snapshot();assert(state.gold===1&&state.hours===4,'Work failed');
  await page.locator('#manager-recruit select').selectOption('master:bard:5');await page.locator('#manager-recruit button').click();state=await snapshot();assert(state.members.length===5&&state.members[4].spellLists.length===0,'Recruit failed');
  await page.evaluate(async id=>{
   const {advanceGuildMaster}=await import('./guildmaster-rules.js');const {loadGuildMasterData,loadGuildCombat}=await import('./guild-data.js');const {opponents}=await loadGuildMasterData();const tables=await loadGuildCombat();
   const key='rolemaster-guildmaster-v1',state=JSON.parse(localStorage.getItem(key));state.management.orders[id].action='adventure';
   for(let i=0;i<100;i++){state.management.seed='quiet-'+i;const next=advanceGuildMaster(state,opponents,tables);if(next.management.journeys[id]&&!next.management.reports[0].results.find(r=>r.memberId===id).encounter?.rounds.length){localStorage.setItem(key,JSON.stringify(state));return;}}
   throw Error('No quiet fixture');
  },id);
  await page.reload();await ready();await advance();assert((await snapshot()).management.journeys[id],'Adventure failed');
  await order(id,'work');assert(await page.locator(`[data-member-id="${id}"][data-order-action="rest"]`).isDisabled(),'Return not locked');await advance();state=await snapshot();assert(!state.management.journeys[id]&&state.management.orders[id].action==='work','Return failed');
  const saved=JSON.stringify(state);await page.reload();await ready();assert(JSON.stringify(await snapshot())===saved,'Reload changed save');
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Mobile overflow');
  await page.screenshot({path:'output/playwright/guildmaster-printed-mobile.png',fullPage:true});
  assert(!errors.length,errors.join('\n'));return {printedProfiles:true,catalogs,recruitment:true,work:true,adventure:true,return:true,reload:true,mobile:true,pageErrors:0};
 }finally{await context.close();}
}
