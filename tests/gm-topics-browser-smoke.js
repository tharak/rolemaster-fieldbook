async existingPage=>{
 const context=await existingPage.context().browser().newContext(),page=await context.newPage(),errors=[];
 const assert=(v,m)=>{if(!v)throw new Error(m);};page.on('pageerror',e=>errors.push(e.message));
 try{
 await page.goto(existingPage.url().split('#')[0]+'#gm');await page.waitForFunction(()=>document.documentElement.dataset.appReady==='true');
 await page.locator('#gm-magic summary').click();await page.locator('#gm-magic-price [name="kind"]').selectOption('Potion');await page.locator('#gm-magic-price [name="level"]').fill('6');await page.locator('#gm-magic-price [name="name"]').fill('Haste vial');await page.locator('#gm-magic-price [name="record"]').check();await page.locator('#gm-magic-price button').click();
 assert(JSON.parse(await page.locator('[data-result="gm-magic-price"]').textContent()).priceGp===100,'Potion price');await page.locator('#gm-magic-use button').click();assert((await page.locator('#gm-magic-items').textContent()).includes('0 uses remain'),'Potion not consumed');await page.locator('#gm-magic-use button').click();assert((await page.locator('[data-result="gm-magic-use"]').textContent()).includes('No uses'),'Reuse allowed');
 await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.appReady==='true');assert((await page.locator('#gm-magic-items').textContent()).includes('0 uses remain'),'Item lost on reload');
 assert(!errors.length,errors.join('\n'));return {magicPrice:true,consumables:true,persistence:true,pageErrors:0};
 }finally{await context.close();}
}
