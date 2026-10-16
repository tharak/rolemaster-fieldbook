async existingPage=>{
 const context=await existingPage.context().browser().newContext(),page=await context.newPage(),errors=[];
 const assert=(v,m)=>{if(!v)throw new Error(m);};page.on('pageerror',e=>errors.push(e.message));
 try{
 await page.addInitScript(()=>{Math.random=()=>.49;});
 await page.goto(existingPage.url().split('#')[0]+'#gm');await page.waitForFunction(()=>document.documentElement.dataset.appReady==='true');
 await page.locator('#gm-healing summary').first().click();
 await page.locator('#gm-wound [name="name"]').fill('Cut forearm');await page.locator('#gm-wound [name="bleeding"]').fill('3');await page.locator('#gm-wound button').click();
 assert((await page.locator('#gm-wounds').textContent()).includes('Cut forearm'),'Wound absent');
 await page.locator('#gm-first-aid [name="success"]').check();await page.locator('#gm-first-aid [name="equipment"]').check();await page.locator('#gm-first-aid button').click();
 assert((await page.locator('#gm-wounds').textContent()).includes('0/round'),'First aid did not stop light bleeding');await page.locator('[data-strain]').click();
 assert((await page.locator('#gm-wounds').textContent()).includes('3/round'),'Strain did not restore bleeding');await page.locator('#gm-first-aid button').click();assert((await page.locator('[data-result="gm-first-aid"]').textContent()).includes('cannot further'),'Repeated first aid allowed');
 await page.locator('#gm-hits button').click();assert((await page.locator('[data-result="gm-hits"]').textContent()).includes('1 hits'),'Hit recovery incorrect');
 await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.appReady==='true');assert((await page.locator('#gm-wounds').textContent()).includes('Cut forearm'),'Wound lost on reload');
 await page.evaluate(()=>{localStorage.setItem('rolemaster-fieldbook-characters-v1',JSON.stringify([{id:'patient',name:'Wounded traveler',race:'Common Man',profession:'Fighter',hits:'100',stats:{Constitution:{temp:40,total:0}},skills:[]}]));localStorage.setItem('rolemaster-encounters-v2',JSON.stringify([{id:'recovery',name:'Recovery',state:{round:1,phase:-1,scale:5,terrain:{},tokens:{patient:{q:2,r:3,hits:150,dyingRoundsLeft:5,lastHitCheckRound:1,statuses:['Unconscious'],hitUnconscious:true,criticalEffects:[]}},selected:'patient',drafts:{},lastTargets:{},log:[]}}]));});
 await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.appReady==='true');await page.getByRole('link',{name:'Rolemaster encounters',exact:true}).click();await page.locator('[data-open-encounter="recovery"]').click();await page.locator('[data-view="gm"]').click();await page.locator('#gm-healing summary').first().click();await page.locator('#gm-patient').selectOption('patient');await page.locator('#gm-hits [name="mode"]').selectOption('rest');await page.locator('#gm-hits button').click();await page.locator('#gm-apply-hits').click();
 const target=await page.evaluate(()=>JSON.parse(localStorage.getItem('rolemaster-encounters-v2'))[0].state.tokens.patient);assert(target.hits===147,'Encounter healing not applied');assert(target.dyingRoundsLeft===5,'Healing advanced death clock');assert(await page.locator('#gm-apply-hits').isDisabled(),'Same preview can apply twice');
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile overflow');assert(!errors.length,errors.join('\n'));return {wounds:true,firstAid:true,strain:true,reload:true,encounterHealing:true,deathClockPreserved:true,mobile:true,pageErrors:0};
 }finally{await context.close();}
}
