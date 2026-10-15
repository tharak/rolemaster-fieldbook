async (existingPage)=>{
  const context=await existingPage.context().browser().newContext(),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const assert=(value,message)=>{if(!value)throw new Error(message);};
  const ready=()=>page.waitForFunction(()=>document.documentElement.dataset.appReady==='true');
  const card=id=>page.locator('[data-actor-card="'+id+'"]');
  const unconscious=id=>card(id).locator('[data-status="Unconscious"]').getAttribute('aria-pressed');
  try{
    await page.goto(existingPage.url());await ready();
    await page.evaluate(()=>{
      const ids=['stun-only','hit-cause','manual-cause'];
      localStorage.setItem('rolemaster-fieldbook-characters-v1',JSON.stringify(ids.map(id=>({id,name:id,race:'Common Man',profession:'Fighter',hits:'100',level:'1',stats:{Constitution:{total:2}},skills:[]}))));
      const tokens=Object.fromEntries(ids.map((id,index)=>[id,{q:index+2,r:3,hits:id==='hit-cause'?100:0,hitUnconscious:id==='hit-cause',statuses:id==='stun-only'?[]:['Unconscious'],criticalEffects:[{id:'ordinary',kind:'stun',roundsLeft:7,startsRound:1},{id:'severe',kind:'stunNoParry',roundsLeft:7,startsRound:1},{id:'one',kind:'stun',roundsLeft:1,startsRound:1}]}]));
      localStorage.setItem('rolemaster-encounters-v2',JSON.stringify([{id:'stun-case',name:'Stun boundary',state:{round:1,phase:-1,scale:5,terrain:{},tokens,selected:ids[0],drafts:{},lastTargets:{},log:[]}}]));
    });
    await page.reload();await ready();await page.locator('[data-open-encounter="stun-case"]').click();
    for(const id of ['stun-only','hit-cause','manual-cause'])assert(await unconscious(id)==='true','15 rounds must exceed the Co +2 threshold of 14: '+id);
    await card('stun-only').locator('[data-clear-effect="one"]').click();
    assert(await unconscious('stun-only')==='true','Equality at 14 must not revive a combatant');
    await card('stun-only').locator('[data-clear-effect="severe"]').click();
    assert(await unconscious('stun-only')==='false','Stun-only unconsciousness must clear below 14');
    for(const id of ['hit-cause','manual-cause']){
      await card(id).locator('[data-clear-effect="severe"]').click();
      assert(await unconscious(id)==='true','Stun relief removed another cause of unconsciousness: '+id);
    }
    await page.reload();await ready();await page.locator('[data-open-encounter="stun-case"]').click();
    assert(await unconscious('stun-only')==='false'&&await unconscious('hit-cause')==='true'&&await unconscious('manual-cause')==='true','Consciousness causes did not persist through reload');
    assert(errors.length===0,errors.join('\n'));
    return {threshold:'Co +2 → 14; above loses, equality stays, below recovers',relief:'real clear-effect controls',otherCauses:'damage and manual causes retained',persistence:true,pageErrors:0};
  }finally{await context.close();}
}
