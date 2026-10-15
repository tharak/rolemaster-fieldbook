async (existingPage) => {
  const context=await existingPage.context().browser().newContext();
  const page=await context.newPage();
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  const assert=(v,m)=>{if(!v)throw new Error(m);};
  const ready=()=>page.waitForFunction(()=>document.documentElement.dataset.appReady==='true');
  const arena=async()=>{await page.getByRole('button',{name:'Coliseum',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('#coliseum-reset').disabled);};
  try {
    await page.addInitScript(()=>{Math.random=()=>.79;});
    await page.goto(existingPage.url()); await ready();
    await page.getByRole('button',{name:'Tables',exact:true}).click();
    await page.locator('.table-choice[data-code="A-10.10.1"]').click();
    await page.locator('.critical-effect strong.critical-token').first().waitFor();
    const proof=[];
    for(const viewport of [{width:1280,height:900},{width:375,height:812}]) {
      await page.setViewportSize(viewport);
      const cell=await page.evaluate(async()=>{
        const t=await (await fetch('tables/A-10.10.1.json')).json();
        for(const r of t.rows)for(let col=0;col<r.cells.length;col++)if(r.cells[col].effect.includes('∑∏'))return{roll:Number.parseInt(r.roll),col,raw:r.cells[col].effect};
      });
      await page.locator('#table-roll').fill(String(cell.roll));
      await page.locator('#table-column').selectOption(String(cell.col));
      const result=page.locator('#lookup-result .critical-lookup-effect [data-critical-raw]');
      assert((await result.textContent()).includes('Stunned and unable to parry'),'Default combined stun/parry text missing');
      assert(await result.locator('strong.critical-token').count()>0,'Text must be bold');
      assert(!/[∑∏π∫]/.test(await page.locator('#attack-grid').textContent()),'Raw shorthand remains in table');
      const raw=await result.getAttribute('data-critical-raw');
      const boldText=await result.textContent();
      await arena();
      const legend=page.locator('#critical-symbol-legend');
      assert(await legend.locator('li').count()===9,'Incomplete critical legend');
      assert(await page.locator('.coliseum-rules #critical-symbol-legend').count()===1,'Legend not under Arena rules');
      await page.getByRole('checkbox',{name:'Use emojis',exact:true}).check();
      await page.getByRole('button',{name:'Tables',exact:true}).click();
      assert(await result.getAttribute('data-critical-raw')===raw,'Toggling changed source');
      assert(await result.locator('[role="img"][aria-label*="Stunned and unable to parry"]').count()>0,'Existing lookup did not update immediately');
      assert((await result.textContent()).includes('😵🚫🛡️'),'Combined emoji missing');
      assert(await page.locator('#attack-grid .critical-token[role="img"]').count()>10,'Existing full grid not updated');
      proof.push({viewport,source:raw,text:boldText,emoji:await result.textContent(),immediate:true});
      await arena(); await page.getByRole('checkbox',{name:'Use emojis',exact:true}).uncheck();
      await page.getByRole('button',{name:'Tables',exact:true}).click();
      assert(await result.locator('[role="img"]').count()===0,'Text mode not restored');
    }
    await arena();
    for(const [side,name] of [['left','Dragon (typical adult)'],['right','Ant (Giant)']]) {
      const value=await page.locator('#coliseum-select-'+side+' option').evaluateAll((o,name)=>o.find(x=>x.textContent.startsWith(name+' ·')).value,name);
      await page.locator('#coliseum-select-'+side).selectOption(value);
    }
    await page.locator('#coliseum-step').click();
    const log=page.locator('#coliseum-log [data-critical-raw]');
    assert(await log.count()>0,'Real combat did not produce a critical');
    const state=await page.evaluate(()=>JSON.stringify({round:document.querySelector('#coliseum-round').textContent,hits:[...document.querySelectorAll('.coliseum-fighter progress')].map(e=>e.value),raw:[...document.querySelectorAll('#coliseum-log [data-critical-raw]')].map(e=>e.dataset.criticalRaw)}));
    await page.getByRole('checkbox',{name:'Use emojis',exact:true}).check();
    assert(await log.locator('[role="img"]').count()>0,'Existing combat critical not updated');
    assert(state===await page.evaluate(()=>JSON.stringify({round:document.querySelector('#coliseum-round').textContent,hits:[...document.querySelectorAll('.coliseum-fighter progress')].map(e=>e.value),raw:[...document.querySelectorAll('#coliseum-log [data-critical-raw]')].map(e=>e.dataset.criticalRaw)})),'Toggling mutated combat');
    await page.reload(); await ready();
    await page.getByRole('button',{name:'Tables',exact:true}).click();
    await page.locator('.table-choice[data-code="A-10.10.1"]').click();
    await page.locator('#attack-grid .critical-token[role="img"]').first().waitFor();
    for (const code of ['A-10.10.3','A-10.10.6']) {
      await page.locator('.table-choice[data-code="'+code+'"]').click();
      await page.locator('#attack-grid .critical-token[role="img"]').first().waitFor();
      assert(!/[∑∏π∫]/.test(await page.locator('#attack-grid').textContent()),'Shorthand remains in '+code);
    }
    assert(errors.length===0,errors.join('\n'));
    return {critical:proof,combatLog:'real critical updates without state changes',persistence:'emoji mode restored in Tables',pageErrors:0};
  } finally {await context.close();}
}
