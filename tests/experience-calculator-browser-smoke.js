async existingPage=>{
 const context=await existingPage.context().browser().newContext(),page=await context.newPage();
 const assert=(value,message)=>{if(!value)throw new Error(message);};
 try{
  await page.goto(existingPage.url());await page.waitForFunction(()=>document.documentElement.dataset.appReady==='true');
  await page.locator('[data-view="home"]').click();await page.locator('#new-character').click();await page.locator('#character-form [name="name"]').fill('XP Scholar');
  await page.locator('[data-view="coliseum"]').click();await page.locator('#coliseum-status').getByText('Wolf vs Tiger.').waitFor();
  const calc=page.locator('.experience-calculator');await calc.locator('summary').click();
  const original=Number(await page.evaluate(()=>JSON.parse(localStorage.getItem('rolemaster-fieldbook-characters-v1'))[0].xp));
  await calc.locator('[name="kind"]').selectOption('spell');await calc.locator('[name="casterLevel"]').fill('20');await calc.locator('[name="spellLevel"]').fill('16');await calc.locator('button[type="submit"]').click();
  assert((await calc.locator('[data-preview]').textContent()).startsWith('+60 XP'),'Spell formula preview incorrect');
  await calc.locator('[data-record]').click();assert(await calc.locator('[data-record]').isDisabled(),'Calculator allowed duplicate');
  await calc.locator('[name="kind"]').selectOption('negative');await calc.locator('[name="amount"]').fill('25');await calc.locator('button[type="submit"]').click();await calc.locator('[data-record]').click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('rolemaster-fieldbook-characters-v1'))[0]);
  assert(Number(saved.xp)===original+35,'Calculator did not save positive and negative awards');assert(JSON.parse(saved.xpHistory).length===2,'Calculator entries missing from journal');
  await page.locator('[data-view="home"]').click();await page.locator('.character-card').click();
  await page.locator('details.play-xp-history summary').filter({hasText:'Recent XP'}).click();await page.locator('#undo-xp-award').click();
  assert(Number(await page.evaluate(()=>JSON.parse(localStorage.getItem('rolemaster-fieldbook-characters-v1'))[0].xp))===original+60,'Negative award undo failed');
  return {spellFormula:true,negativeAward:true,journal:true,duplicateGuard:true,negativeUndo:true};
 }finally{await context.close();}
}
