async existingPage => {
 const context=await existingPage.context().browser().newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
 const check=(ok,message)=>{if(!ok)throw new Error(message);};
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('rolemaster-guild-beta-v2')));
 const ready=()=>page.waitForSelector('html[data-app-ready="true"]');
 page.on('pageerror',error=>errors.push(error.message));
 try {
  await context.addInitScript(()=>{if(!localStorage.getItem('unrelated-fixture')){localStorage.setItem('rolemaster-fieldbook-characters-v1','broken old characters');localStorage.setItem('rolemaster-guild-v1','old items');localStorage.setItem('unrelated-fixture','keep');}});
  await page.goto('http://127.0.0.1:8011');await ready();
  check((await saved()).members.length===0,'empty start');
  check(await page.evaluate(()=>!localStorage.getItem('rolemaster-guild-v1')&&localStorage.getItem('unrelated-fixture')==='keep'),'reset namespace');
  check(await page.locator('.game-nav button').allTextContents().then(a=>a.join(',')==='Guild,Adventures'),'single game navigation');
  await page.locator('[data-recruit]').click();await page.locator('#game-dialog [name="name"]').fill('Rowan');await page.locator('[data-hire] button[type="submit"]').click();
  check((await saved()).gold===20,'free founder');
  check(await page.locator('[data-open-member], [data-order="work"]').count()===0,'no detail view or Work');
  check(await page.locator('.pet-card [data-rename-member], [data-promote]').count()===0,'no rename or promotion on cards');
  await page.locator('.equipment-button').first().click();check(await page.locator('[data-equipment-caption], .unequipped, .equipment-button[title]').count()===0,'no missing items or item descriptions');
  await page.locator('[data-manage]').click();
  await page.locator('[data-rename-member] input').fill('Rowan II');await page.locator('[data-rename-member] button').click();
  check((await saved()).members[0].name==='Rowan II','manage rename');await page.locator('[data-close-dialog]').click();
  await page.locator('.pet-card [data-order="rest"]').click();
  await page.locator('[data-advance]').click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('rolemaster-guild-beta-v2')).management.turn===1);
  check((await saved()).gold===20,'rest earns no gold');
  await page.locator('#game-app [data-feed]').click();check((await saved()).members[0].care.food===100,'meal');
  await page.locator('[data-recruit]').click();await page.locator('#game-dialog [name="name"]').fill('Willow');await page.locator('[data-hire] button[type="submit"]').click();
  await page.locator('[data-manage]').click();await page.locator('[data-dismiss]').last().click();await page.locator('[data-confirm-dismiss]').click();check((await saved()).members.length===1,'dismiss');await page.locator('[data-close-dialog]').click();
  await page.locator('[data-tab="adventures"]').click();await page.locator('#game-app [data-order="adventure"]').click();await page.locator('[data-advance]').click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('rolemaster-guild-beta-v2')).management.turn===2);
  check((await saved()).members[0].xp>=5,'exploration XP');
  check(await page.locator('.pet-card [data-member-result]').count()===1,'adventure rewards above member');
  check(await page.locator('[data-tab="journal"]').count()===0,'journal removed');
  await page.evaluate(async()=>{
   const {advanceGame,assignActivity}=await import('/src/guild-game-rules.js?v=20261018-6');
   const {loadGuildMasterData,loadGuildCombat}=await import('/src/guild-data.js');
   const {opponents}=await loadGuildMasterData(),tables=await loadGuildCombat();
   const key='rolemaster-guild-beta-v2',original=JSON.parse(localStorage.getItem(key));
   for(let i=0;i<100;i++){
    let s=structuredClone(original),m=s.members[0];m.damage=0;m.effects=[];m.care={food:100,energy:100,morale:100};
    s.management.journeys={};s.management.orders[m.id]={action:'rest',level:m.level};s.management.seed='popup-'+i;
    s=advanceGame(assignActivity(s,m.id,'adventure'),opponents,tables);
    if(Object.hasOwn(s.management.reports[0].results[0].encounter||{},'winner')){localStorage.setItem(key,JSON.stringify(s));return;}
   }
   throw new Error('No combat fixture found');
  });
  await page.reload();await ready();const beforeLog=await saved();
  await page.locator('[data-combat-member]').click();check(await page.locator('#game-dialog .member-combat-log').isVisible(),'combat popup');
  check((await page.locator('.member-combat-log').innerText()).includes('Round 1'),'combat rounds');
  await page.locator('[data-close-dialog]').click();check(JSON.stringify(await saved())===JSON.stringify(beforeLog),'opening log does not award rewards twice');
  const before=await saved();await page.reload();await ready();check(JSON.stringify(await saved())===JSON.stringify(before),'reload preserves beta');
  await page.locator('[data-tab="guild"]').click();
  await page.screenshot({path:'output/playwright/guild-game-mobile.png',fullPage:true});
  check(await page.locator('.pet-card .stat-bar').count()===4,'shared bars');
  await page.evaluate(()=>{const key='rolemaster-guild-beta-v2',s=JSON.parse(localStorage.getItem(key));s.members[0].xp=Math.max(100,s.members[0].xp);s.gold=0;localStorage.setItem(key,JSON.stringify(s));});
  await page.reload();await ready();check((await saved()).members[0].level>=5,'automatic XP level on load');
  await page.setViewportSize({width:320,height:700});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile page overflow');check(await page.locator('.pet-card').evaluate(el=>el.scrollWidth<=el.clientWidth),'member card overflow');
  await page.setViewportSize({width:1280,height:900});await page.screenshot({path:'output/playwright/guild-game-desktop.png',fullPage:true});
  check(errors.length===0,errors.join('\n'));return 'PASS: fresh reset, recruitment, compact cards, equipment icons, manage renaming, automatic leveling, rest, dismissal, adventure rewards, combat popup, reload, mobile and desktop layouts';
 }finally{await context.close();}
}
