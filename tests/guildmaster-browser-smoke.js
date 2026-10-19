async existingPage=>{
 const context=await existingPage.context().browser().newContext({reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
 const assert=(value,message)=>{if(!value)throw new Error(message);};page.on('pageerror',error=>errors.push(error.message));
 const key='rolemaster-guildmaster-v1';
 const ready=()=>page.waitForFunction(()=>document.documentElement.dataset.appReady==='true'&&document.querySelector('#guildmaster-app').dataset.ready==='true');
 const snapshot=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
 const advance=async()=>{const turn=(await snapshot()).management.turn;await page.locator('[data-manager-action="advance"]').click();await page.waitForFunction(({key,turn})=>JSON.parse(localStorage.getItem(key)).management.turn===turn+1,{key,turn});};
 const order=async(id,action)=>{await page.locator('#manager-members-tab').click();await page.locator(`[data-member-id="${id}"][data-order-action="${action}"]`).click();};
 try{
  await page.goto(existingPage.url().split('#')[0]+'#guildmaster');await ready();
  let state=await snapshot();const id=state.members[0].id;
  assert(state.tableOnly&&state.members.length===4,'Initial fixed profiles missing');
  assert(state.members.every(member=>member.spellLists.length===0),'Invented spells remain');
  assert(await page.locator('#manager-recruit option').count()===45,'Recruit catalog wrong');
  assert(await page.locator('.manager-printed-stats').count()===4,'Printed stats missing');
  assert(state.members.every(member=>member.assignments?.version===1),'Assignments not saved');
  const statsText=await page.locator('.manager-printed-stats').allTextContents();
  assert(statsText.every(text=>text.includes('Active')&&text.includes('Armor')),'Named active attacks or armor missing');
  assert(!statsText.some(text=>text.includes('Directed spell (reference)')),'Directed spell still reference only');
  assert(statsText.some(text=>text.includes('Bolt')),'Named bolt missing');
  assert(await page.locator('[data-pick-equipment],[data-pick-spells],[data-shop-buy]').count()===0,'Custom loadout UI remains');
  const catalogs=await page.evaluate(async()=>{const {catalog,opponents}=await (await import('./src/guild-data.js')).loadGuildMasterData();return {members:catalog.length,monsters:opponents.filter(c=>c.group==='Monster').length,animals:opponents.filter(c=>c.group==='Animal').length};});
  assert(catalogs.members===45&&catalogs.monsters>0&&catalogs.animals>0,'Missing opponent table');
  await order(id,'work');assert((await snapshot()).gold===0,'Order acted early');await advance();state=await snapshot();assert(state.gold===1&&state.hours===4,'Work failed');
  assert(await page.locator('#manager-journal-panel').isVisible(),'Advance did not open journal');
  assert(await page.locator('#manager-members-panel .manager-member-result').count()===0,'Member results remain');
  await page.locator('#manager-members-tab').click();
  await page.locator('#manager-recruit select').selectOption('master:bard:5');await page.locator('#manager-recruit button').click();state=await snapshot();assert(state.members.length===5&&state.members[4].spellLists.length===0,'Recruit failed');
  await page.evaluate(async id=>{
   const {advanceGuildMaster}=await import('./src/guildmaster-rules.js');const {loadGuildMasterData,loadGuildCombat}=await import('./src/guild-data.js');const {opponents}=await loadGuildMasterData();const tables=await loadGuildCombat();
   const key='rolemaster-guildmaster-v1',state=JSON.parse(localStorage.getItem(key));state.management.orders[id].action='adventure';
   for(let i=0;i<100;i++){state.management.seed='quiet-'+i;const next=advanceGuildMaster(state,opponents,tables);if(next.management.journeys[id]&&!next.management.reports[0].results.find(r=>r.memberId===id).encounter?.rounds.length){localStorage.setItem(key,JSON.stringify(state));return;}}
   throw Error('No quiet fixture');
  },id);
  await page.reload();await ready();await advance();assert((await snapshot()).management.journeys[id],'Adventure failed');
  await order(id,'work');assert(await page.locator(`[data-member-id="${id}"][data-order-action="rest"]`).isDisabled(),'Return not locked');await advance();state=await snapshot();assert(!state.management.journeys[id]&&state.management.orders[id].action==='work','Return failed');
  const saved=JSON.stringify(state);await page.reload();await ready();assert(JSON.stringify(await snapshot())===saved,'Reload changed save');
  const combatFixture=await page.evaluate(async()=>{
   const {advanceGuildMaster}=await import('./src/guildmaster-rules.js');const {loadGuildMasterData,loadGuildCombat}=await import('./src/guild-data.js');const {assignmentCatalog}=await import('./src/guildmaster-assignments.js');
   const {opponents}=await loadGuildMasterData(),tables=await loadGuildCombat(),key='rolemaster-guildmaster-v1',base=JSON.parse(localStorage.getItem(key));
   const caster=base.members.find(m=>m.profession==='Magician');base.management.orders[caster.id].action='adventure';
   const name=assignmentCatalog.find(item=>item.id===caster.assignments.slots[1]).name;
   for(let i=0;i<100;i++){
    base.management.seed='browser-bolt-'+i;const next=advanceGuildMaster(base,opponents,tables);
    const report=next.management.reports[0].results.find(result=>result.memberId===caster.id).encounter;
    if(report?.rounds.some(round=>round.events.some(event=>event.text.startsWith(caster.name+' →')&&event.text.includes(name)))){
     localStorage.setItem(key,JSON.stringify(base));return {id:caster.id,name,pp:caster.pp};
    }
   }
   throw Error('No bolt combat fixture');
  });
  await page.reload();await ready();await advance();
  await page.locator('[data-journal-member]').selectOption(combatFixture.id);
  await page.locator('[data-journal-kind="combat"]').click();
  assert(await page.locator('.journal-entry-combat').count()>0,'Combat filter lost the encounter');
  assert(await page.locator('.journal-entry-base,.journal-entry-travel').count()===0,'Combat filter includes other entries');
  const combatEntry=page.locator('.journal-entry-combat').first();
  await combatEntry.locator('.journal-combat>summary').click();
  await combatEntry.locator('.journal-rounds summary').first().click();
  assert((await combatEntry.textContent()).includes(combatFixture.name),'Assigned attack missing from journal');
  await page.locator('[data-journal-kind="base"]').click();
  await page.locator('[data-journal-member]').selectOption(id);
  assert(await page.locator('.journal-entry-base').count()>0,'Member filter lost work entries');
  await page.locator('[data-journal-kind="combat"]').click();
  assert(await page.locator('.journal-empty').isVisible(),'No-match state missing');
  await page.locator('[data-journal-reset]').click();
  assert(await page.locator('[data-journal-member]').inputValue()==='all','Filter reset failed');
  assert((await snapshot()).members.find(m=>m.id===combatFixture.id).pp===combatFixture.pp,'Simple bolt spent PP');
  const afterCombat=JSON.stringify(await snapshot());await page.reload();await ready();assert(JSON.stringify(await snapshot())===afterCombat,'Combat reload rerolled assignments');
  await page.locator('#manager-journal-tab').click();
  await page.locator('[data-manager-action="manage"]').click();
  const manage=page.locator('#guildmaster-manage-dialog');
  assert(await manage.locator(`[data-dismiss-member="${combatFixture.id}"]`).count()===0,'Away member can be dismissed');
  await manage.locator(`[data-dismiss-member="${id}"]`).click();
  await page.setViewportSize({width:390,height:844});
  assert(await manage.evaluate(dialog=>dialog.scrollWidth<=dialog.clientWidth+1),'Manage guild mobile overflow');
  await page.screenshot({path:'output/playwright/guildmaster-manage-mobile.png'});
  await page.setViewportSize({width:1280,height:720});
  await manage.locator('[data-cancel-dismiss]').click();assert((await snapshot()).members.some(m=>m.id===id),'Cancel dismissed member');
  await manage.locator(`[data-dismiss-member="${id}"]`).click();
  await manage.locator('[data-confirm-dismiss]').click();assert(!(await snapshot()).members.some(m=>m.id===id),'Dismissal failed');
  assert((await snapshot()).management.reports.some(t=>t.results.some(r=>r.memberId===id)),'Dismissal removed history');
  await manage.locator('[data-close-manage]').click();
  await page.locator('[data-journal-member]').selectOption(id);assert(await page.locator('.journal-entry').count()>0,'Dismissed member history unavailable');
  const afterDismiss=JSON.stringify(await snapshot());await page.reload();await ready();assert(JSON.stringify(await snapshot())===afterDismiss,'Dismissal did not survive reload');
  await page.locator('#manager-members-tab').focus();await page.keyboard.press('ArrowRight');assert(await page.locator('#manager-journal-panel').isVisible(),'Keyboard tab navigation failed');
  for(let i=0;i<3;i++)await advance();
  assert(await page.locator('.journal-turn').count()===5,'Journal page size incorrect');
  await page.locator('[data-journal-older]').click();assert(await page.locator('.journal-turn').count()>5,'Older turns unavailable');
  await page.screenshot({path:'output/playwright/guildmaster-journal-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Mobile overflow');
  await page.screenshot({path:'output/playwright/guildmaster-journal-mobile.png',fullPage:true});
  assert(!errors.length,errors.join('\n'));return {journal:true,dismissal:true,printedProfiles:true,namedAssignments:true,boltCombat:true,catalogs,recruitment:true,work:true,adventure:true,return:true,reload:true,mobile:true,pageErrors:0};
 }finally{await context.close();}
}
