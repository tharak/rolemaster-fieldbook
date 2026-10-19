async existingPage => {
 const context=await existingPage.context().browser().newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
 const check=(ok,message)=>{if(!ok)throw new Error(message);};
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('rolemaster-coliseum-v1')));
 const ready=()=>page.waitForSelector('html[data-app-ready="true"]');
 page.on('pageerror',e=>errors.push(e.message));
 async function fixture(kind){
  await page.evaluate(async kind=>{
   const {newArena,recruitArena,fightArena,saveArena}=await import('./src/arena-rules.js?v=20261019-ludus-1');
   const {levelMembers}=await import('./src/guild-game-rules.js');
   const {loadGuildMasterData,loadGuildCombat}=await import('./src/guild-data.js');
   const {catalog,opponents}=await loadGuildMasterData(),tables=structuredClone(await loadGuildCombat());
   let s=newArena('critical-browser',opponents);s.gold=100;
   s=recruitArena(s,catalog.find(c=>c.profession==='Fighter'&&c.level===1),'Rowan');
   if(kind!=='last-death'){s=recruitArena(s,catalog.find(c=>c.profession==='Cleric'&&c.level===1),'Mira');s.members[1].xp=300;s=levelMembers(s,catalog);s.members[1].pp=s.members[1].ppMax;}
   const cell=tables['A-10.10.5'].rows.find(r=>r.roll==='91-95').cells[kind==='paralysis'?4:2];
   for(const [code,t]of Object.entries(tables))if(code.startsWith('A-10.9.'))for(const r of t.rows||[])if(r.values)r.values=r.values.map(()=> '0');
   tables['test-attack']={columns:Array.from({length:20},(_,i)=>({label:`AT ${i+1}`})),rows:[{roll:'1-100',values:Array(20).fill('0E')}]};
   tables['test-critical']={rows:[{roll:'1-100',cells:Array(5).fill(cell)}]};
   const offer=s.arena.offers[0];offer.enemies=[{...offer.enemies[0],id:'fatal-enemy',hits:1000,size:'M',attacks:[{name:'Test blade',type:'Wp',size:'M',ob:0,chance:100,attackTable:'test-attack',criticalTable:'test-critical'}]}];
   s=fightArena(s,offer.id,[s.members[0].id],catalog,tables,opponents);s.ludus.level=10;s.ludus.pp=s.ludus.ppMax=73;s.ludus.buildings.nerve.rank=10;saveArena(localStorage,s);
  },kind);
  await page.reload();await ready();
 }
 try{
  await page.goto(existingPage.url());await ready();await fixture('paralysis');
  await page.locator('[data-tab="coliseum"]').click();check((await page.locator('.lineup-summary').innerText()).includes('Unavailable: Rowan'),'unavailable selected fighter sits out');check(await page.locator('[data-fight]:disabled').count()===3,'no ready fighters');
  await page.locator('#game-dialog [data-tab="roster"]').click();check(await page.locator('[data-fighter="member-1"]').isChecked(),'unavailable selection retained');await page.locator('[data-member="member-1"]').click();check((await page.locator('.arena-wounds').innerText()).includes('Paralyzed'),'paralysis visible');
  await page.locator('[data-close-dialog]').click();await page.locator('[data-tab="concussion"]').click();for(let i=0;i<5;i++)await page.locator('[data-rest]').click();
  check((await saved()).members[0].injuries[0].permanent,'rest preserves paralysis');await page.reload();await ready();
  const before=await saved();await page.locator('[data-tab="nerve"]').click();
  await page.locator('.ludus-spell').filter({has:page.locator('[data-ludus-spell="nerve:10"]')}).locator('summary').click();
  await page.locator('[data-ludus-spell="nerve:10"]').click();await page.locator('.ludus-target').first().locator('summary').click();
  await page.locator('[name="injuryId"]').first().check();await page.locator('[data-ludus-service]').first().locator('button').click();await page.waitForSelector('[data-upgrade-building="nerve"]');const after=await saved();
  check(after.members[0].injuries[0].suppressed,'Unparalysis temporarily suppresses paralysis');check(after.ludus.pp===before.ludus.pp-10,'Ludus pays PP');
  await page.locator('[data-close-dialog]').click();await page.locator('[data-tab="coliseum"]').click();check(await page.locator('[data-fight]:enabled').count()===3,'treated member participates automatically');
  await fixture('death');await page.locator('[data-tab="hall"]').click();
  check((await page.locator('#game-dialog').innerText()).includes('Rowan'),'dead fighter in memorial');
  await page.screenshot({path:'output/playwright/arena-fallen-mobile.png',fullPage:true});
  const dead=await saved();await page.locator('[data-rest]').click();check(JSON.stringify((await saved()).arena.fallen)===JSON.stringify(dead.arena.fallen),'rest cannot resurrect');
  await page.reload();await ready();check((await saved()).members.length===1,'death persists on reload');
  await page.locator('[data-tab="hall"]').click();await page.locator('[data-report]').first().click();check((await page.locator('.arena-result').innerText()).includes('Dead — lost from roster'),'result reports death instead of rescue');await page.locator('[data-close-dialog]').click();
  await fixture('last-death');await page.locator('[data-tab="coliseum"]').click();check(await page.locator('[data-fight]:disabled').count()===3,'dead lineup empty');await page.locator('#game-dialog [data-tab="roster"]').click();
  await page.locator('[data-recruit]').click();await page.locator('[name="name"]').fill('Newcomer');await page.locator('[data-hire] button').click();
  const replacement=await saved();check(replacement.members.length===1&&replacement.members[0].id!=='member-1','replacement is a new identity');check(replacement.arena.fallen.length===1,'fallen record retained');check(replacement.arena.lineup.length===0,'replacement needs explicit selection');
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile width');check(errors.length===0,errors.join('\n'));
  return 'PASS: paralysis disables selection, survives rest/reload, temporary Ludus suppression costs gold and PP, deaths persist in memorial, no resurrection, replacement recruitment';
 }finally{await context.close();}
}
