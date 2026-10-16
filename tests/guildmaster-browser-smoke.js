async existingPage=>{
 const context=await existingPage.context().browser().newContext({reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
 const assert=(value,message)=>{if(!value)throw new Error(message);};page.on('pageerror',e=>errors.push(e.message));
 const ready=()=>page.waitForFunction(()=>document.documentElement.dataset.appReady==='true'&&document.querySelector('#guildmaster-app').dataset.ready==='true');
 const snapshot=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('rolemaster-guild-v1')));
 const advance=async()=>{const turn=(await snapshot()).management?.turn||0;await page.locator('[data-manager-action="advance"]').click();await page.waitForFunction(n=>JSON.parse(localStorage.getItem('rolemaster-guild-v1')).management?.turn===n+1,turn);};
 try{
  await page.goto(existingPage.url().split('#')[0]);await ready();
  assert(await page.locator('#guildmaster-view').isVisible(),'GuildMaster not the landing page');assert(await page.locator('.topbar .nav-link').first().getAttribute('data-view')==='guildmaster','Wrong first navigation link');
  assert(await page.locator('#guildmaster-app .guild-member').count()===4,'Member grid missing');assert(!await page.locator('.manager-map').evaluate(el=>el.open),'Map should be collapsed');
  assert(await page.locator('#guildmaster-app').evaluate(root=>root.querySelector('.manager-main').compareDocumentPosition(root.querySelector('.manager-map'))&Node.DOCUMENT_POSITION_FOLLOWING),'Map precedes members');
  await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('rolemaster-guild-v1'));s.members.forEach(m=>{m.damage=12;m.pp=0;});localStorage.setItem('rolemaster-guild-v1',JSON.stringify(s));});await page.reload();await ready();
  const original=await snapshot();await advance();let s=await snapshot();assert(s.hours===4,'Clock advanced more than once');assert(s.members.every(m=>m.damage===8),'Rest not applied once to every member');assert(s.members.every(m=>m.pp===0),'PP restored before eight hours');await advance();s=await snapshot();assert(s.members.every(m=>m.pp===m.ppMax),'PP did not recover after eight hours');
  const id=s.members[0].id,id2=s.members[1].id;
  await page.locator(`[data-member-order="${id}"]`).selectOption('adventure');await page.locator(`[data-member-order="${id2}"]`).selectOption('adventure');
  const queued=await snapshot();assert(queued.hours===8&&Object.keys(queued.management.journeys).length===0,'Queuing orders executed actions');assert(queued.members[0].damage===4,'Changing order healed member');
  await page.reload();await ready();assert(await page.locator(`[data-member-order="${id}"]`).inputValue()==='adventure','Pending order lost on reload');
  // Fail combat-data loading before any turn is committed, then retry.
  let intercepted=false;await page.route('**/tables/A-10.9.9.json',route=>{if(!intercepted){intercepted=true;return route.fulfill({status:503,body:'unavailable'});}return route.continue();});
  await page.locator('[data-manager-action="advance"]').click();await page.waitForFunction(()=>document.querySelector('[data-manager-message]').textContent.includes('Retry'));assert((await snapshot()).hours===8,'Failed loading advanced the clock');
  await advance();s=await snapshot();assert(s.hours===12&&s.management.reports[0].results.length===4,'All member results were not simulated');assert(s.members[2].damage===0,'Base member did not rest during adventure');
  assert(Object.keys(s.management.journeys).length===2,'Expected two independent journeys');assert(Object.values(s.management.journeys).every(j=>j.party.length===1&&j.stage===1),'Journeys not independent');
  assert(await page.locator('#guildmaster-app .manager-member-result').count()===4,'Results missing from cards');assert(!await page.locator('#adventure-encounter-dialog').evaluate(el=>el.open),'Adventure modal opened');assert(!await page.locator('#coliseum-view').isVisible(),'Coliseum shown');
  const card=page.locator(`#guildmaster-app [data-member="${id}"]`);assert(await card.locator('[data-equipment="weapon"]').isDisabled(),'Away member equipment editable');await page.locator(`[data-member-order="${id}"]`).selectOption('return');const beforeReturn=await snapshot();assert(beforeReturn.management.journeys[id],'Come back executed before turn');
  await advance();s=await snapshot();assert(!s.management.journeys[id],'Member did not return');assert(s.members[0].damage===beforeReturn.members[0].damage,'Returning also healed the member');assert(await page.locator(`[data-member-order="${id}"]`).inputValue()==='rest','Returned member not set to Rest');
  // Both pages share the same members and enforce locks.
  await page.locator('[data-view="adventure"]').click();assert(await page.locator('#adventure-app .guild-member').count()===4,'Adventures did not share roster');assert(await page.locator(`#adventure-app [data-member="${id2}"] [name="guild-party"]`).isDisabled(),'Away member can join another party');await page.getByRole('link',{name:'Rolemaster GuildMaster',exact:true}).click();
  // Find a reproducible genuine combat/drop fixture, then resolve it through the UI.
  await page.evaluate(async()=>{
   const {newGuild,recruitMember}=await import('./guild-rules.js'),{setMemberOrder,advanceGuildMaster}=await import('./guildmaster-rules.js'),{loadGuildData,loadGuildCombat}=await import('./guild-data.js');
   const {catalog}=await loadGuildData(),tables=await loadGuildCombat();let base=recruitMember(newGuild(catalog),catalog.find(c=>c.profession==='Fighter'&&c.level===20));base=setMemberOrder(base,base.members.at(-1).id,{action:'adventure',level:1});
   for(let i=0;i<3000;i++){const candidate=structuredClone(base);candidate.management.seed='browser-loot-'+i;const next=advanceGuildMaster(candidate,catalog,tables);const result=next.management.reports[0].results.at(-1);if(result.encounter?.winner===0&&result.items.length&&result.away){localStorage.setItem('rolemaster-guild-v1',JSON.stringify(candidate));return;}}
   throw new Error('No combat/drop fixture found');
  });await page.reload();await ready();await advance();s=await snapshot();const veteran=s.members.at(-1),reward=s.management.reports[0].results.at(-1);assert(reward.encounter.rounds.length>0&&reward.items.length>0,'Combat did not produce round results and loot');
  const veteranCard=page.locator(`#guildmaster-app [data-member="${veteran.id}"]`);await veteranCard.locator('.manager-encounter>summary').click();await veteranCard.locator('.guild-rounds details>summary').first().click();
  await page.setViewportSize({width:1440,height:1080});await page.screenshot({path:'output/playwright/guildmaster-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile overflow');await page.screenshot({path:'output/playwright/guildmaster-mobile.png',fullPage:true});
  const beforeReload=await snapshot();await page.reload();await ready();assert(JSON.stringify(await snapshot())===JSON.stringify(beforeReload),'Reload mutated rewards');
  await page.locator(`[data-member-order="${veteran.id}"]`).selectOption('return');await advance();s=await snapshot();assert(s.gold===beforeReload.gold+beforeReload.management.journeys[veteran.id].gold,'Come back did not bank carried gold');assert(s.inventory.some(i=>i.id===reward.items[0].id),'Dropped item not banked');const banked=s.gold;await advance();assert((await snapshot()).gold===banked,'Rest paid rewards twice');
  await page.locator('#manager-recruit [name="template"]').selectOption('master:bard:5');await page.locator('#manager-recruit button').click();assert(await page.locator('#guildmaster-app .guild-member').count()===6,'Recruiting member failed');
  assert(errors.length===0,errors.join('\n'));
  return {landing:true,memberGrid:true,queuedOrders:true,sharedClock:true,simultaneousMembers:true,rest:true,return:true,combatResults:true,loot:true,reload:true,sharedRoster:true,loadingRetry:true,mobile:true,pageErrors:0};
 }finally{await context.close();}
}
