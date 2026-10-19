async existingPage => {
 const context=await existingPage.context().browser().newContext(),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(existingPage.url());await page.waitForSelector('.courtyard');
  const result=await page.evaluate(async()=>{
   const rules=await import('./src/rules.js'),core=await import('./vendor/rolemaster-core/src/index.js');
   if(rules.rankBonus!==core.rules.rankBonus)throw Error('Fieldbook uses a separate rules instance');
   const status=await rules.initializeRankBonusEngine();if(status.backend!=='wasm')throw Error('Wasm adapter failed: '+status.reason);
   if(core.rules.rankBonus(21,'combined')!==82||core.characterRules.basicStatBonus(99)!==9)throw Error('Core numeric rules changed');
   const clock=await import('./src/critical-stun.js'),ui=await import('./src/critical-presentation.js'),components=await import('./src/rust-components.js');
   for(let seed=0;seed<100;seed++){
    const kinds=['stun','stunNoParry','downOrOut','penalty','bleed','bonus'];
    const effects=kinds.map((kind,index)=>({id:index,kind,roundsLeft:(seed+index)%7===0?null:(seed+index)%5,starts:(seed+index)%3}));
    if(JSON.stringify(clock.expireCriticalEffects(structuredClone(effects),seed%4,'starts'))!==JSON.stringify(clock.expireCriticalEffectsJavaScript(structuredClone(effects),seed%4,'starts')))throw Error('Numeric adapter parity changed');
   }
   const token={label:'Stunned: 2 rounds',emoji:'🌀',initiative:false};
   if(components.rustCriticalToken(token.label,token.emoji,0)!==ui.criticalTokenJavaScript(token,false))throw Error('Host rendering adapter changed');
   if(components.rustComponentStatus().ruleCalls<100)throw Error('Core effect adapter not shared');
   return {backend:status.backend,criticalCases:100};
  });
  if(errors.length)throw Error(errors.join('\n'));return result;
 }finally{await context.close();}
}
