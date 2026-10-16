// Actual combat drives the screen; fixed tables make each visual amount verifiable.
async (existingPage)=>{
  const context=await existingPage.context().browser().newContext(),page=await context.newPage();
  const errors=[],art=[];let fatal=false;
  const assert=(value,message)=>{if(!value)throw new Error(message);};
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.url().includes('/assets/coliseum/'))art.push({url:response.url(),status:response.status(),mime:response.headers()['content-type']});});
  const idle=()=>page.waitForFunction(()=>document.querySelector('#coliseum-battle').dataset.playback==='idle');
  const ready=async()=>{
    await page.waitForFunction(()=>document.documentElement.dataset.appReady==='true');
    await page.waitForFunction(()=>!document.querySelector('#coliseum-step').disabled);
  };
  const health=()=>page.locator('#coliseum-battle [role="meter"]').evaluateAll(meters=>meters.map(meter=>Number(meter.getAttribute('aria-valuenow'))));
  const step=async()=>{await page.locator('#coliseum-step').click();await idle();};
  try{
    await page.addInitScript(()=>{window.battleDice=0;Math.random=()=>{window.battleDice++;return .49;};});
    await page.route('**/tables/creatures.json',async route=>{
      const data=await(await route.fetch()).json();
      for(const creature of data.animal_statistics_chart)if(['Wolf','Tiger'].includes(creature.name))Object.assign(creature,{hits:10000,armor_type:1,defensive_bonus:0,primary_attack:creature.name==='Wolf'?'100LBi100':'100LCl100',secondary_attack:'',tertiary_attack:''});
      await route.fulfill({json:data});
    });
    await page.route('**/tables/A-10.9.7.json',route=>route.fulfill({json:{columns:[{label:'AT 1'}],rows:[{roll:'01-150',values:['5A']}]}}));
    for(const code of ['4','5'])await page.route('**/tables/A-10.10.'+code+'.json',route=>route.fulfill({json:{rows:[{roll:'01-100',cells:[{description:fatal?'Foe dies instantly.':'Impact.',effect:fatal?'+0H':'+7H – 2∫'}]}]}}));
    await page.goto(existingPage.url().split('#')[0]+'#coliseum');await ready();
    assert(await page.locator('#coliseum-view').isVisible(),'Direct Coliseum link did not open the arena');
    await page.waitForFunction(()=>[...document.querySelectorAll('.battle-sprite')].every(sprite=>sprite.getBBox().width>0));
    assert(await page.locator('.battle-unit').count()===2,'Missing opposing creatures');
    assert((await health()).join(',')==='10000,10000','Initial HUD health does not match contenders');
    const rust=await page.evaluate(async()=>(await import('./rust-components.js')).rustComponentStatus());
    assert(rust.battleCalls>=2,'Actual battle HUD did not use Rust');
    const parity=await page.evaluate(async()=>{
      const ui=await import('./coliseum-battle.js'),rust=await import('./rust-components.js');let checked=0;
      for(const profile of ['wolf','tiger','bear','dragon','serpent','bird','insect','humanoid','warrior','ranger','rogue','mage','cleric','bard','horse','aquatic','elemental','turtle','unknown'])for(const side of [0,1])for(const [hits,maximum] of [[0,0],[1,1600],[79,150],[999,100]]){
        const view={name:`<script> & "creature" '`,attack:'<bite>',profile,side,hits,maximum,ob:-20};
        if(rust.rustBattleContender(view)!==ui.battleContenderJavaScript(view))throw new Error('Battle HUD parity mismatch: '+profile);
        checked++;
      }
      const response=await fetch('assets/coliseum/creatures.svg'),doc=new DOMParser().parseFromString(await response.text(),'image/svg+xml');
      const data=await(await fetch('tables/creatures.json')).json();
      const creatures=[...data.monster_statistics_chart,...data.animal_statistics_chart];
      if(!creatures.every(creature=>doc.getElementById(ui.creatureProfile(creature))))throw new Error('A creature has no sprite family');
      return {checked,creatures:creatures.length};
    });
    await page.locator('#coliseum-speed').selectOption('4');
    await page.evaluate(()=>{
      window.battleHealthChanges=[];
      window.battleHealthObserver=new MutationObserver(records=>{
        records.forEach((record,index)=>{
          const next=records.slice(index+1).find(item=>item.target===record.target);
          window.battleHealthChanges.push({from:Number(record.oldValue),to:Number(next?next.oldValue:record.target.getAttribute('aria-valuenow'))});
        });
      });
      window.battleHealthObserver.observe(document.querySelector('#coliseum-battle-fighters'),{subtree:true,attributes:true,attributeFilter:['aria-valuenow'],attributeOldValue:true});
    });
    const dice=await page.evaluate(()=>window.battleDice);
    await page.locator('#coliseum-step').click();
    await page.waitForFunction(()=>document.querySelector('#coliseum-battle').dataset.activeSide!==undefined);
    assert(await page.locator('#coliseum-step').isDisabled(),'A second round can start during playback');
    await idle();
    assert((await health()).join(',')==='9988,9988','Critical extra hits missing from animated health');
    assert((await page.locator('[data-battle-hits]').allTextContents()).join(',')==='12,12','HUD hits do not include critical damage');
    assert((await page.locator('[data-battle-critical]').allTextContents()).join(',')==='A,A','Actual critical severity is not displayed');
    assert((await page.locator('[data-battle-statuses]').allTextContents()).every(text=>text.includes('Bleeding: 2/round')),'Status list omitted the applied bleeding');
    assert(await page.evaluate(()=>window.battleDice)-dice===12,'Playback consumed extra combat randomness');
    assert((await page.locator('.coliseum-fighter progress').evaluateAll(elements=>elements.map(element=>element.value))).join(',')===(await health()).join(','),'HUD and actual combat state disagree');
    await step();
    assert((await health()).join(',')==='9974,9974','Round-two bleeding and attacks replayed incorrectly');
    const healing=await page.evaluate(()=>{window.battleHealthObserver.disconnect();return window.battleHealthChanges.filter(change=>change.to>change.from);});
    assert(healing.length===0,'Playback visibly healed before damage: '+JSON.stringify(healing));
    await page.locator('#coliseum-step').click();await page.locator('#coliseum-reset').click();
    await page.waitForTimeout(600);
    assert(await page.locator('#coliseum-round').textContent()==='Ready'&&(await health()).join(',')==='10000,10000','Cancelled playback overwrote the new fight');
    assert(await page.locator('#coliseum-log details').count()===0,'Cancelled playback restored an old round');
    assert((await page.locator('[data-battle-statuses]').allTextContents()).every(text=>text==='No active effects'),'New fight kept stale statuses');
    await page.locator('#coliseum-simulate').click();await page.locator('#coliseum-pause').click();await idle();
    const paused=await page.locator('#coliseum-round').textContent();await page.waitForTimeout(250);
    assert(await page.locator('#coliseum-round').textContent()===paused,'Pause advanced another round');
    await page.locator('#coliseum-simulate').click();await page.getByRole('link',{name:'Rolemaster GuildMaster',exact:true}).click();
    const hiddenRound=await page.locator('#coliseum-round').textContent();await page.waitForTimeout(250);
    assert(await page.locator('#coliseum-round').textContent()===hiddenRound,'Navigation kept combat running');
    await page.getByRole('button',{name:'Coliseum',exact:true}).click();await idle();
    await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#coliseum-reset').click();await step();
    assert((await health()).join(',')==='9988,9988','Reduced-motion playback changed combat');
    assert(await page.locator('.battle-sprite').first().evaluate(sprite=>getComputedStyle(sprite).animationName)==='none','Reduced motion still animates sprites');
    const mobile=[];
    for(const viewport of [{width:1280,height:900},{width:375,height:812},{width:320,height:740}]){
      await page.setViewportSize(viewport);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Battle screen overflows at '+viewport.width);
      assert(await page.locator('#coliseum-step').isVisible(),'Battle controls missing at '+viewport.width);
      const wolf=await page.locator('[data-battle-side="0"] .battle-sprite').boundingBox(),tiger=await page.locator('[data-battle-side="1"] .battle-sprite').boundingBox();
      assert(wolf.width>100&&tiger.width>100,'Unreadable mobile sprites');mobile.push(viewport.width);
      for(const unit of await page.locator('.battle-unit').all()){
        const hp=await unit.locator('.battle-health').boundingBox(),statuses=await unit.locator('[data-battle-statuses]').boundingBox();
        assert(statuses.y>=hp.y+hp.height,'Statuses do not appear below HP at '+viewport.width);
      }
    }
    fatal=true;await page.reload();await ready();await page.emulateMedia({reducedMotion:'reduce'});await step();
    assert(await page.locator('#coliseum-battle-outcome').isVisible(),'Finished duel has no result banner');
    assert(await page.locator('.battle-unit.is-winner').count()===1&&await page.locator('.battle-unit.is-defeated').count()===1,'Winner/defeated poses do not reflect the combat result');
    assert((await page.locator('.battle-unit.is-defeated [data-battle-statuses]').textContent()).includes('Dead'),'Fatal status missing below HP');
    assert(await page.locator('#coliseum-step').isDisabled(),'Finished duel can advance');
    assert(art.some(asset=>asset.url.endsWith('/arena.svg')&&asset.status===200&&asset.mime.includes('image/svg+xml')),'Arena artwork did not load');
    assert(art.some(asset=>asset.url.endsWith('/creatures.svg')&&asset.status===200),'Creature artwork did not load');
    const fallbackContext=await existingPage.context().browser().newContext({reducedMotion:'reduce'});
    let fallback;
    try{
      const fallbackPage=await fallbackContext.newPage();
      fallbackPage.on('pageerror',error=>errors.push(error.message));
      await fallbackPage.route('**/*.wasm',route=>route.fulfill({status:404,body:'missing'}));
      await fallbackPage.addInitScript(()=>{Math.random=()=>.49;});
      await fallbackPage.goto(existingPage.url().split('#')[0]+'#coliseum');
      await fallbackPage.waitForFunction(()=>document.documentElement.dataset.appReady==='true'&&!document.querySelector('#coliseum-step').disabled);
      assert(await fallbackPage.locator('.battle-unit').count()===2,'Fallback has no battle screen');
      await fallbackPage.locator('#coliseum-step').click();
      await fallbackPage.waitForFunction(()=>document.querySelector('#coliseum-battle').dataset.playback==='idle');
      fallback=await fallbackPage.evaluate(async()=>({
        engine:(await import('./rust-components.js')).rustComponentStatus(),
        meters:[...document.querySelectorAll('#coliseum-battle [role="meter"]')].map(meter=>Number(meter.getAttribute('aria-valuenow'))),
        combat:[...document.querySelectorAll('.coliseum-fighter progress')].map(progress=>progress.value),
      }));
      assert(fallback.engine.backend==='javascript'&&fallback.engine.battleCalls===0,'Missing Wasm still reports Rust battle calls');
      assert(JSON.stringify(fallback.meters)===JSON.stringify(fallback.combat),'Fallback HUD disagrees with combat');
    }finally{await fallbackContext.close();}
    assert(errors.length===0,errors.join('\n'));
    return {rust,parity,playback:'attacks, critical damage and bleeding match real combat',cancellation:'reset, pause and navigation passed',reducedMotion:true,mobile,finishedDuel:true,fallback,pageErrors:0};
  }finally{await context.close();}
}
