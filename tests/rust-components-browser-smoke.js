async (existingPage)=>{
  const context=await existingPage.context().browser().newContext(),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const assert=(value,message)=>{if(!value)throw new Error(message);};
  try{
    await page.goto(existingPage.url());
    await page.waitForFunction(()=>document.documentElement.dataset.appReady==='true');
    assert(await page.locator('.topbar [data-view="encounter"], .topbar [data-view="tables"], .topbar a[href="critical-review.html"]').count()===0,'Removed navigation links remain');
    assert((await page.request.get(new URL('critical-review.html',page.url()).href)).status()===404,'Critical review page still served');
    const parity=await page.evaluate(async()=>{
      const clock=await import('./critical-stun.js'),ui=await import('./critical-presentation.js'),components=await import('./rust-components.js');
      let effectsChecked=0,tokensChecked=0;
      for(let seed=0;seed<600;seed++){
        const kinds=['stun','stunNoParry','downOrOut','penalty','bleed','bonus'];
        const effects=kinds.map((kind,index)=>({id:index,kind,roundsLeft:(seed+index)%7===0?null:(seed+index)%5,starts:(seed+index)%3}));
        const rust=clock.expireCriticalEffects(structuredClone(effects),seed%4,'starts');
        const js=clock.expireCriticalEffectsJavaScript(structuredClone(effects),seed%4,'starts');
        if(JSON.stringify(rust)!==JSON.stringify(js))throw new Error('Rust effect parity mismatch at '+seed);
        effectsChecked++;
      }
      const labels=['Extra hits: 10','Penalty: −20 until healed','Stunned: 2 rounds','Attacker wins initiative next round (no roll)',`<script> & "quoted" '`, '☠️ Dies instantly'];
      for(const label of labels)for(const emoji of ['🌀','<img src=x>'])for(const mode of [0,1,2]){
        const token={label,emoji,initiative:mode===2};
        if(components.rustCriticalToken(label,emoji,mode)!==ui.criticalTokenJavaScript(token,mode===1))throw new Error('Rust UI parity mismatch');
        tokensChecked++;
      }
      return {effectsChecked,tokensChecked,status:components.rustComponentStatus()};
    });
    await page.goto(existingPage.url());
    await page.waitForFunction(()=>document.documentElement.dataset.appReady==='true');
    await page.getByRole('button',{name:'Coliseum',exact:true}).click();
    await page.waitForFunction(()=>!document.querySelector('#coliseum-step').disabled);
    const before=await page.evaluate(async()=>(await import('./rust-components.js')).rustComponentStatus());
    await page.locator('#coliseum-step').click();
    const after=await page.evaluate(async()=>(await import('./rust-components.js')).rustComponentStatus());
    assert(after.ruleCalls>before.ruleCalls,'Actual Coliseum round did not invoke the Rust rule component');
    assert(errors.length===0,errors.join('\n'));
    return {parity,actualCombat:{before,after},pageErrors:0};
  }finally{await context.close();}
}
