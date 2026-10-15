async (existingPage) => {
 const context=await existingPage.context().browser().newContext(),page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));const assert=(v,m)=>{if(!v)throw new Error(m);};
 let mode='duration';
 const ready=()=>page.waitForFunction(()=>document.documentElement.dataset.appReady==='true');
 const open=async()=>{await page.getByRole('button',{name:'Coliseum',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('#coliseum-step').disabled);};
 const gear=(side,key)=>page.locator('#coliseum-equipment-'+side+' [data-gear="'+key+'"]');
 try{
  await page.addInitScript(()=>{window.testDice=0;window.testValue=.79;Math.random=()=>{window.testDice++;return window.testValue;};});
  await page.route('**/tables/creatures.json',async route=>{const data=await(await route.fetch()).json();for(const row of data.animal_statistics_chart)if(['Wolf','Tiger'].includes(row.name)){Object.assign(row,{hits:10000,defensive_bonus:0,armor_type:1,speed_ms_aq:row.name==='Wolf'?'MD/CR':'MD/BF',primary_attack:row.name==='Wolf'?'100LBi100':'100LCl100',secondary_attack:'',tertiary_attack:''});}await route.fulfill({json:data});});
  await page.route('**/tables/A-10.9.7.json',route=>route.fulfill({json:{columns:[{label:'AT 1'}],rows:[{roll:'01-150',values:['1A']}]}}));
  for(const code of ['4','5'])await page.route('**/tables/A-10.10.'+code+'.json',route=>{
   const key=mode==='helmet'?'helmet':mode==='chest'?'chest armor':'abdomen armor';
   const description=code==='4'?(mode==='duration'?'You gain the initiative. Temporary penalty.':mode==='abdomen'?'If foe has abdominal armor, he dies in 2 rounds. If not, he dies instantly.':'If no '+key+' he dies instantly. Otherwise he dies after 3 rounds.'):'No further effects.';
   const rows=mode==='duration'?[{roll:'01-79',cells:[{description:'No further effects.',effect:'+0H'}]},{roll:'80-100',cells:[{description,effect:'(-15) – 2∫'}]}]:[{roll:'01-100',cells:[{description,effect:'+0H'}]}];
   return route.fulfill({json:{rows}});
  });
  await page.goto(existingPage.url());await ready();await open();
  assert(await page.locator('[data-gear]:checked').count()===0,'Equipment default must be unchecked');
  assert(await page.locator('#coliseum-symbol-legend').count()===0,'Arena symbol legend still present');
  await page.evaluate(()=>{window.testDice=0;});await page.locator('#coliseum-step').click();
  const first=await page.locator('#coliseum-log .coliseum-initiative').first().textContent();assert(first.indexOf('Tiger')<first.indexOf('Wolf'),'Normal initiative wrong');
  assert((await page.locator('#coliseum-fighter-right .coliseum-effects').textContent()).includes('1 round'),'Unspecified penalty must show one round');
  await page.evaluate(()=>{window.testValue=.49;window.testDice=0;});await page.locator('#coliseum-step').click();
  const second=await page.locator('#coliseum-log .coliseum-initiative').nth(1).textContent();
  assert(second.indexOf('Wolf')<second.indexOf('Tiger')&&second.includes('no roll'),'Critical must win next round automatically');
  assert(await page.evaluate(()=>window.testDice)===6,'Automatic initiative rolled dice');
  assert(!(await page.locator('.coliseum-effects').allTextContents()).join('').includes('−15'),'Temporary penalty did not expire');
  assert((await page.locator('.coliseum-effects').allTextContents()).join('').includes('Bleed 2/round'),'Bleeding incorrectly expired');
  await page.evaluate(()=>{window.testDice=0;});await page.locator('#coliseum-step').click();assert(await page.evaluate(()=>window.testDice)===12,'Normal initiative not restored');
  const reports=[];
  for(const [index,key] of ['helmet','chest armor','abdomen armor'].entries()){
   mode=index===0?'helmet':index===1?'chest':'abdomen';await page.reload();await ready();await open();
   await page.setViewportSize(index===1?{width:375,height:812}:{width:1280,height:900});
   await page.getByText('First contender equipment',{exact:true}).click();await page.getByText('Second contender equipment',{exact:true}).click();
   await gear('left',key).check();await gear('right',key).uncheck();
   assert(await gear('left',key).isChecked()&&!await gear('right',key).isChecked(),'Equipment sides are not independent');
   await page.locator('#coliseum-step').click();assert(await page.locator('#coliseum-fighter-right progress').getAttribute('value')==='0','Missing foe '+key+' must trigger instant death: '+await page.locator('#coliseum-log').textContent());
   await page.locator('#coliseum-reset').click();await gear('right',key).check();await page.locator('#coliseum-step').click();
   assert(Number(await page.locator('#coliseum-fighter-right progress').getAttribute('value'))>0,'Protected foe died immediately');
   assert((await page.locator('#coliseum-fighter-right .coliseum-effects [data-critical-raw]').getAttribute('data-critical-raw')).includes('Foe dies in'),'Death countdown status missing');
   assert(await gear('right',key).isDisabled(),'Equipment should lock for current fight');
   const round=await page.locator('#coliseum-round').textContent(),health=await page.locator('#coliseum-fighter-right progress').getAttribute('value');
   await page.getByRole('checkbox',{name:'Use emojis',exact:true}).check();
   assert((await page.locator('#coliseum-fighter-right .coliseum-effects').textContent()).includes('☠️'),'Dies emoji missing');
   assert(await page.locator('#coliseum-round').textContent()===round&&await page.locator('#coliseum-fighter-right progress').getAttribute('value')===health,'Emoji toggle reset combat');
   for(let n=0;n<(mode==='abdomen'?2:3);n++)await page.locator('#coliseum-step').click();
   assert(await page.locator('#coliseum-fighter-right progress').getAttribute('value')==='0','Death countdown did not reach zero hits');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Equipment UI overflows viewport');
   await page.reload();await ready();await open();await page.getByText('Second contender equipment',{exact:true}).click();assert(await gear('right',key).isChecked(),'Equipment preference not restored');
   reports.push({key,foeNotAttacker:true,instantWithout:true,countdownWith:true,persistence:true});
  }
  // Exercise the existing actual Hits/damage editing path; no fake heal button.
  await page.evaluate(()=>{
   const chars=[{id:'heal-a',name:'Healed Fighter',race:'Common Man',profession:'Fighter',level:'1',hits:'100',stats:{},skills:[]},{id:'heal-b',name:'Other Fighter',race:'Common Man',profession:'Fighter',level:'1',hits:'100',stats:{},skills:[]}];
   localStorage.setItem('rolemaster-fieldbook-characters-v1',JSON.stringify(chars));
   localStorage.setItem('rolemaster-encounters-v2',JSON.stringify([{id:'healing-case',name:'Healing case',updatedAt:Date.now(),state:{round:1,phase:-1,scale:5,terrain:{},selected:'heal-a',drafts:{},lastTargets:{},log:[],tokens:{'heal-a':{hits:5,deathRound:3,deathDamage:5,automaticInitiativeRound:1,criticalEffects:[{kind:'bleed',amount:2,roundsLeft:null,startsRound:1,id:'bleed'}]},'heal-b':{hits:0,criticalEffects:[]}}}}]));
  });
  await page.reload();await ready();await page.evaluate(()=>{window.testDice=0;});await page.locator('[data-open-encounter="healing-case"]').click();
  const card=page.locator('[data-actor-card="heal-a"]');assert((await card.textContent()).includes('Automatic winner'),'Encounter duel initiative not applied');assert(await page.evaluate(()=>window.testDice)===0,'Encounter automatic initiative rolled dice');
  assert((await card.textContent()).includes('☠️'),'Pending encounter Dies status missing');
  await card.locator('[data-vital="hits"]').fill('4');await card.locator('[data-vital="hits"]').dispatchEvent('change');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('rolemaster-encounters-v2')).find(e=>e.id==='healing-case').state.tokens['heal-a']);
  assert(saved.deathRound===undefined,'Actual healing path did not clear pending death');assert(saved.criticalEffects.some(e=>e.kind==='bleed'),'Healing wrongly removed bleeding');
  assert(errors.length===0,errors.join('\n'));
  return {duration:'one active round; bleeding preserved',initiative:'automatic next round, 6 RNG calls instead of 12; then normal',equipment:reports,healing:'real damage input cancels death; bleed survives',legend:'arena marker legend removed',pageErrors:0};
 }finally{await context.close();}
}
