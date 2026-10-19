async existingPage => {
 const context=await existingPage.context().browser().newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
 const check=(ok,message)=>{if(!ok)throw new Error(message);};
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('rolemaster-coliseum-v1')));
 const ready=()=>page.waitForSelector('html[data-app-ready="true"]');
 page.on('pageerror',e=>errors.push(e.message));
 async function openSpell(id){await page.locator(`[data-ludus-spell="${id}"]`).click();}
 try{
  await page.goto(existingPage.url());await ready();
  await page.evaluate(async()=>{
   const {newArena,recruitArena,saveArena}=await import('./src/arena-rules.js');const {loadGuildMasterData}=await import('./src/guild-data.js');
   const {catalog,opponents}=await loadGuildMasterData();let s=recruitArena(newArena('ludus-browser',opponents),catalog.find(c=>c.profession==='Fighter'&&c.level===1),'Rowan');
   s.gold=2000;s.ludus.xp=300;s.members[0].damage=15;
   s.members[0].injuries=[{id:'nerve-wound',kind:'nerve',nervePenalty:10,label:'Nerve damage',description:'A damaged nerve in the arm.',penalty:10,days:null,permanent:true,disabling:false,treatment:'Nerve Law'}];saveArena(localStorage,s);
  });
  await page.reload();await ready();await page.locator('[data-tab="hall"]').click();
  check((await page.locator('#game-dialog-title').innerText())==='Ludus Hall','Ludus Hall');
  await page.locator('[data-promote-ludus]').click();check((await saved()).ludus.level===5,'paid level five');
  await page.locator('[data-close-dialog]').click();await page.locator('[data-tab="nerve"]').click();await page.locator('[data-ludus-spell].is-locked').first().click();check(await page.locator('.spell-locked').isVisible()&&await page.locator('[data-ludus-service]').count()===0,'locked spell is readable but cannot cast');await page.locator('[data-back]').click();for(let i=0;i<4;i++)await page.locator('[data-upgrade-building="nerve"]').click();
  const before=await saved();await openSpell('nerve:4');await page.locator('[name="injuryId"]').check();await page.locator('[data-ludus-service] button').click();await page.waitForSelector('[data-upgrade-building="nerve"]');
  let s=await saved();check(s.ludus.pp===before.ludus.pp-4,'shared PP cost');check(s.members[0].injuries[0].recoveryUntil>s.ludus.clock,'repair has recovery time');
  await page.reload();await ready();check((await saved()).members[0].injuries.length===1,'recovery persists');await page.locator('[data-tab="concussion"]').click();await page.locator('[data-rest]').click();check((await saved()).members[0].injuries.length===0,'one day completes nerve repair');
  await page.locator('[data-close-dialog]').click();await page.locator('[data-tab="hall"]').click();await page.locator('[data-promote-ludus]').click();await page.locator('[data-close-dialog]').click();await page.locator('[data-tab="protections"]').click();for(let i=0;i<2;i++)await page.locator('[data-upgrade-building="protections"]').click();
  await openSpell('protections:2');await page.locator('[data-ludus-service] button').click();
  s=await saved();check(s.ludus.selections['member-1'][0].spellId==='protections:2','blessing selected');
  await page.locator('[data-close-dialog]').click();await page.locator('[data-tab="coliseum"]').click();check((await page.locator('.lineup-summary').innerText()).includes('2 gold · 2 PP'),'preflight costs');
  // Force only the enemy profile for a reproducible browser victory.
  await page.evaluate(()=>{const key='rolemaster-coliseum-v1',s=JSON.parse(localStorage.getItem(key));const o=s.arena.offers[0];o.enemies=[{...o.enemies[0],hits:1,db:-100,attacks:[{name:'Weak bash',type:'Ba',attackTable:'A-10.9.7',size:'S',ob:-100,chance:100}]}];localStorage.setItem(key,JSON.stringify(s));});
  await page.reload();await ready();const preBattle=await saved();await page.locator('[data-tab="coliseum"]').click();await page.locator('[data-fight]').first().click();await page.waitForSelector('[data-arena-playback]');
  const committed=await saved();check(committed.arena.revision===preBattle.arena.revision+1,'battle rerolls enemies');check(committed.arena.reports[0].services.length===1,'blessing outcome saved');
  await page.locator('[data-skip]').click();check(JSON.stringify(await saved())===JSON.stringify(committed),'skip never charges twice');
  await page.locator('[data-close-dialog]').click();await page.locator('[data-tab="hall"]').click();
  for(const width of [320,390,1280]){await page.setViewportSize({width,height:900});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Ludus overflow '+width);}
  await page.screenshot({path:'output/playwright/ludus-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'output/playwright/ludus-mobile.png',fullPage:true});
  check(errors.length===0,errors.join('\n'));
  return 'PASS: Ludus upgrades, paid promotion, nerve repair and recovery, PP, blessings, enemy refresh, replay safety, reload and mobile layouts';
 }finally{await context.close();}
}
