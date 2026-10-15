async existingPage => {
 const context=await existingPage.context().browser().newContext(),page=await context.newPage();
 try{
  const base=existingPage.url();await page.goto(base);await page.waitForFunction(()=>document.documentElement.dataset.appReady==='true');
  const result=await page.evaluate(async()=>{
   const {equipmentIcon,equipmentProfile}=await import('./equipment-art.js');
   const {creatureProfile}=await import('./coliseum-battle.js');
   const source=await (await fetch('assets/coliseum/equipment.svg')).text();
   const ids=[...source.matchAll(/<symbol id="([^"]+)"/g)].map(m=>m[1]);
   const items=(await(await fetch('tables/A-7-equipment.json')).json()).items;
   for(const item of items)if(!ids.includes(equipmentProfile(item.name)))throw new Error('Missing equipment art: '+item.name);
   const humans=['Fighter','Ranger','Thief','Magician','Cleric','Bard'].map(profession=>({profession,profile:creatureProfile({sourceKind:'master',profession})}));
   return {ids,items:items.length,humans,icons:ids.map(id=>`<figure><svg viewBox="0 0 32 32" aria-label="${id}"><use href="assets/coliseum/equipment.svg#${id}"></use></svg><figcaption>${id}</figcaption></figure>`).join(''),decorative:equipmentIcon('<script>')};
  });
  if(!result.decorative.includes('aria-hidden="true"')||result.decorative.includes('<script>'))throw new Error('Unsafe decorative markup');
  await page.setViewportSize({width:1200,height:1050});
  await page.setContent(`<base href="${base}"><style>body{margin:0;padding:34px;background:#202c28;color:#eee3bc;font:14px monospace}h1{font:32px Georgia;margin:0 0 8px}p{color:#a9b69c}h2{font-size:15px;letter-spacing:2px;margin-top:32px}section{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}figure{margin:0;padding:16px 8px;background:#344139;text-align:center;border:1px solid #65745a}svg{width:100%;height:120px;image-rendering:pixelated;shape-rendering:crispEdges}figcaption{margin-top:10px;text-transform:capitalize}.items{grid-template-columns:repeat(9,1fr)}.items svg{height:64px}</style><h1>Coliseum · Adventurers & equipment</h1><p>Original pixel artwork · Six human archetypes · 26 equipment families</p><h2>HUMAN ADVENTURERS</h2><section>${result.humans.map(({profession,profile})=>`<figure><svg viewBox="0 0 96 80"><use href="assets/coliseum/creatures.svg#${profile}"></use></svg><figcaption>${profession}</figcaption></figure>`).join('')}</section><h2>WEAPONS, ARMOR & GEAR</h2><section class="items">${result.icons}</section>`);
  await page.waitForFunction(()=>[...document.querySelectorAll('use')].every(use=>use.getBBox().width>0));
  await page.screenshot({path:'output/playwright/humans-equipment.png',fullPage:true});
  return {humanArchetypes:result.humans.length,equipmentIcons:result.ids.length,catalogItemsCovered:result.items,allSvgSymbolsRendered:true};
 }finally{await context.close();}
}
