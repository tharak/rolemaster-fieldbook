async existingPage => {
 const context=await existingPage.context().browser().newContext({reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
 const assert=(value,message)=>{if(!value)throw new Error(message);};
 page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.addInitScript(()=>{
   Math.random=()=>.49;
   if(localStorage.getItem('progression-fixture'))return;
   localStorage.setItem('progression-fixture','1');
   const record={id:'arena-hero',name:'Aster',race:'Common Man',profession:'Fighter',realm:'None',level:'1',xp:'19999',xpHistory:'[]',hits:'150',dbShield:'15',stats:{Quickness:{temp:90,pot:100,total:4}},categoryRanks:{'Weapon • 1-H Edged':{start:2}},skills:[{category:'Weapon • 1-H Edged',name:'Broadsword',ranks:10,special:150}],startingWeapons:JSON.stringify([JSON.stringify(['Weapon • 1-H Edged','Broadsword'])])};
   localStorage.setItem('rolemaster-fieldbook-characters-v1',JSON.stringify([record]));
  });
  await page.goto(existingPage.url());await page.waitForFunction(()=>document.documentElement.dataset.appReady==='true');
  await page.locator('[data-view="coliseum"]').click();await page.locator('#coliseum-status').getByText('Wolf vs Tiger.').waitFor();
  await page.locator('#coliseum-select-left').selectOption('character:arena-hero');
  await page.locator('#coliseum-select-right').selectOption('master:magician:1');
  assert(await page.locator('.battle-unit[data-battle-side="0"]').getAttribute('data-profile')==='warrior','Human hero sprite missing');
  assert(await page.locator('.battle-unit[data-battle-side="1"]').getAttribute('data-profile')==='mage','Mage sprite missing');
  assert((await page.locator('#coliseum-contender-note-right').textContent()).includes('Directed-spell'),'Spell limitation missing');
  assert(await page.locator('.battle-weapon .equipment-pixel-icon').count()===2,'Equipped weapon icons missing');
  const original=await page.evaluate(()=>localStorage.getItem('rolemaster-fieldbook-characters-v1'));
  await page.locator('#coliseum-simulate').click();await page.locator('#coliseum-battle-outcome').waitFor({state:'visible',timeout:30000});
  assert(await page.evaluate(()=>localStorage.getItem('rolemaster-fieldbook-characters-v1'))===original,'Fight modified saved character');
  const xp=page.locator('#coliseum-experience');
  await xp.locator('[name="conflict"]').check();
  await xp.locator('[data-xp-side="0"] [name="intelligent"]').check();
  const expected=Number((await xp.locator('[data-xp-side="0"] [data-xp-total]').textContent()).split(' ')[0]);assert(expected>0,'Missing XP award');
  await xp.locator('[data-xp-apply="0"]').click();
  let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('rolemaster-fieldbook-characters-v1'))[0]);
  assert(Number(saved.xp)===19999+expected,'Wrong XP written');assert(Number(saved.level)>=2,'Saved level was not updated');
  assert(JSON.parse(saved.xpHistory).length===1,'XP not journaled');assert(await xp.locator('[data-xp-apply="0"]').isDisabled(),'Duplicate award allowed');
  const id=JSON.parse(saved.xpHistory)[0].awardId;
  const duplicate=await page.evaluate(id=>{try{window.RolemasterEncounter.awardExperience('arena-hero',{id,amount:1});return false;}catch{return true;}},id);
  assert(duplicate,'Persistent duplicate guard missing');
  await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.appReady==='true');
  assert(Number(await page.evaluate(()=>JSON.parse(localStorage.getItem('rolemaster-fieldbook-characters-v1'))[0].xp))===19999+expected,'Award lost on reload');
  await page.locator('[data-view="home"]').click();await page.locator('.character-card[data-id="arena-hero"]').click();
  await page.locator('details.play-xp-history summary').filter({hasText:'Recent XP'}).click();await page.locator('#undo-xp-award').click();
  assert(Number(await page.evaluate(()=>JSON.parse(localStorage.getItem('rolemaster-fieldbook-characters-v1'))[0].xp))===19999,'Undo did not restore XP');
  await page.locator('[data-view="home"]').click();await page.locator('#new-character').click();await page.locator('#character-form [name="name"]').fill('New recruit');
  await page.locator('[data-view="coliseum"]').click();
  await page.waitForFunction(()=>!document.querySelector('#coliseum-select-left').disabled);
  const recruit=page.locator('#coliseum-select-left option').filter({hasText:'New recruit'});assert(await recruit.count()===1,'Newly created character absent');assert(await recruit.isDisabled(),'Unfinished character entered arena');
  await page.evaluate(()=>window.RolemasterEncounter.openEncounters());await page.locator('#encounter-generator summary').click();
  const generator=page.locator('#encounter-generator');
  await generator.locator('[name="density"]').selectOption('Dense');await generator.locator('[name="activityExtra"]').fill('200');await generator.locator('button[type="submit"]').click();
  await generator.locator('[data-generated-opponent]').waitFor({state:'visible'});
  // A low tie roll selects wild beasts; choose the offered opponent through the real bridge.
  await page.waitForFunction(()=>document.querySelector('#encounter-generator [name=foe]').options.length>0);
  assert((await generator.locator('[data-generated-result]').textContent()).includes('Wild beasts'),'T-5.1 tie breaker wrong');
  const foe=await generator.locator('[name="foe"]').inputValue();await generator.locator('[data-fight]').click();
  await page.waitForFunction(id=>document.querySelector('#coliseum-select-right').value===id,foe);
  assert(await page.locator('#coliseum-round').textContent()==='Ready','Generated duel was not reset');
  await page.setViewportSize({width:390,height:844});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile horizontal overflow');
  assert(errors.length===0,errors.join('\n'));
  return {savedSelection:true,masterEnemies:45,humanSprites:true,weaponIcons:true,award:expected,persisted:true,duplicateGuard:true,undo:true,newCharacter:true,encounterToArena:true,mobile:true,pageErrors:errors.length};
 }finally{await context.close();}
}
