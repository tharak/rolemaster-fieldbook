async (existingPage) => {
  const context=await existingPage.context().browser().newContext(),page=await context.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const assert=(value,message)=>{if(!value)throw new Error(message);};
  const ready=()=>page.waitForFunction(()=>document.documentElement.dataset.appReady==='true');
  const form=()=>page.locator('.encounter-phase-form[data-actor="caster"][data-phase="normal"]');
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('rolemaster-encounters-v2'))[0].state);
  const seed=async({caster={q:4,r:4},foe={q:5,r:4},extra={},terrain={},scale=5}={})=>{
    await page.evaluate(({caster,foe,extra,terrain,scale})=>{
      const base={race:'Common Man',profession:'Magician',realm:'Mentalism',level:'1',hits:'100',powerPoints:'100',stats:{},skills:[]};
      const characters=[{...base,id:'caster',name:'Caster',skills:[{name:'Test list',category:'Spells • Own Base Lists',ranks:10},{name:'Broadsword',category:'Weapon • 1-H Edged',ranks:10}],startingWeapons:JSON.stringify([JSON.stringify(['Weapon • 1-H Edged','Broadsword'])])},{...base,id:'foe',name:'Foe'},...Object.keys(extra).map(id=>({...base,id,name:id}))];
      localStorage.setItem('rolemaster-fieldbook-characters-v1',JSON.stringify(characters));
      const token=position=>({hits:0,pp:0,actions:{},criticalEffects:[],initiativeRoll:[1,1],...position});
      const tokens={caster:{...token(caster),initiativeRoll:[8,8]},foe:token(foe),...Object.fromEntries(Object.entries(extra).map(([id,position])=>[id,token(position)]))};
      const state={round:1,phase:-1,resolved:false,scale,terrain,tokens,selected:'caster',drafts:{},lastTargets:{},log:[]};
      localStorage.setItem('rolemaster-encounters-v2',JSON.stringify([{id:'recoil-case',name:'Recoil case',updatedAt:Date.now(),state}]));
    },{caster,foe,extra,terrain,scale});
    await page.reload();await ready();await page.evaluate(()=>window.RolemasterEncounter.openEncounters());await page.locator('[data-open-encounter="recoil-case"]').click();
  };
  const chooseTarget=async(kind,value)=>{
    await form().locator('[data-focus-target="normal"]').click();
    await page.locator(kind==='hex'?'[data-target-hex="'+value+'"]':'[data-target-creature="'+value+'"]').click();
  };
  const resolve=async()=>{await page.locator('#encounter-resolve-round').click();await page.waitForFunction(()=>document.querySelector('#encounter-round').textContent==='Round 2'&&!document.querySelector('#encounter-resolve-round').disabled);return saved();};
  const attackTable={columns:[{label:'AT 1'}],rows:[{roll:'01-150',values:['1A']}]};
  try {
    await page.addInitScript(()=>{Math.random=()=>.49;});
    for(const code of ['A-10.9.2','A-10.9.9','A-10.9.10'])await page.route('**/tables/'+code+'.json',route=>route.fulfill({json:attackTable}));
    for(const code of ['A-10.10.1','A-10.10.5'])await page.route('**/tables/'+code+'.json',route=>route.fulfill({json:{rows:[{roll:'01-100',cells:[{description:'Foe recoils 10 feet from the blast.',effect:'+2H'}]}]}}));
    await page.goto(existingPage.url());await ready();

    await seed();await form().locator('[name="choice"]').selectOption('attack:0');await chooseTarget('creature','foe');
    const before=await page.locator('[data-token="foe"]').getAttribute('transform');
    let state=await resolve();assert(state.tokens.foe.q===7&&state.tokens.foe.r===4,'Weapon recoil did not use the stated 10 ft away from the attacker');
    assert(state.tokens.caster.q===4&&state.tokens.foe.hits===3,'Recoil altered attacker position or critical damage');
    assert(!state.tokens.foe.criticalEffects.some(effect=>effect.kind==='recoil'),'Recoil was stored as a timed status');
    assert(await page.locator('[data-token="foe"]').getAttribute('transform')!==before,'Map did not render the displaced foe: before '+before+'; after '+await page.locator('[data-token="foe"]').getAttribute('transform')+'; status '+await page.locator('#encounter-message').textContent());
    assert((await page.locator('#encounter-log').textContent()).includes('moved 10 of 10 ft'),'Movement log missing');
    await page.reload();await ready();await page.evaluate(()=>window.RolemasterEncounter.openEncounters());await page.locator('[data-open-encounter="recoil-case"]').click();assert((await saved()).tokens.foe.q===7,'Recoil position was not saved');

    const reports=[];
    for(const kind of ['bolt','ball']){
      await seed({caster:{q:2,r:4},extra:kind==='ball'?{second:{q:6,r:5}}:{}});
      await form().locator('[name="choice"]').selectOption('spell:0');await form().locator('[name="spellAttack"]').selectOption(kind);
      assert(await form().locator('[name="spellCritical"]').inputValue()==='','Existing spells must retain manual critical selection by default');
      await form().locator('[name="spellCritical"]').selectOption('A-10.10.1');
      await form().locator('[name="preparation"]').fill('9');await form().locator('[name="preparation"]').dispatchEvent('change');
      if(kind==='ball'){
        await page.setViewportSize({width:375,height:812});
        await form().locator('[name="areaRadius"]').fill('10');await form().locator('[name="areaRadius"]').dispatchEvent('change');
        await chooseTarget('hex','6,4');
      }else await chooseTarget('creature','foe');
      state=await resolve();
      assert(state.tokens.foe.q===(kind==='ball'?3:7)&&state.tokens.foe.r===4,kind+' recoil used the wrong origin');
      assert(state.tokens.caster.q===2&&state.tokens.caster.pp===1,'Recoil changed caster position or charged PP per target');
      if(kind==='ball')assert(state.tokens.second.q===6&&state.tokens.second.r===7,'Second area target did not recoil radially from the same fixed center');
      const log=await page.locator('#encounter-log').textContent();assert(log.includes('away from hex '+(kind==='ball'?'6,4':'2,4')),'Spell recoil origin not logged');
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Spell critical controls overflow viewport');
      reports.push({kind,origin:kind==='ball'?'area center':'caster',statedDistance:10,persistence:true});
    }
    await seed({terrain:{'6,4':'blocked'}});await form().locator('[name="choice"]').selectOption('attack:0');await chooseTarget('creature','foe');state=await resolve();
    assert(state.tokens.foe.q===5&&(await page.locator('#encounter-log').textContent()).includes('Blocked terrain stops recoil'),'Recoil passed through blocked terrain');
    assert(errors.length===0,errors.join('\n'));
    return {weapon:'immediate 10 ft displacement, map and storage updated',spells:reports,blocked:'stops before obstacle',pageErrors:0};
  }finally{await context.close();}
}
