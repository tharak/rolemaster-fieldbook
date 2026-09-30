(() => {
  const storageKey = 'rolemaster-encounters-v2';
  const legacyStorageKey = 'rolemaster-encounter-v1';
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const phases = ['snap','normal','deliberate'];
  const statusChoices = ['Surprised','Stunned','Prone','Bleeding','Wet','Unconscious','Dead'];
  const difficulties = ['Routine','Easy','Light','Medium','Hard','Very Hard','Extremely Hard','Sheer Folly','Absurd'];
  const staticDifficulty = [30,20,10,0,-10,-20,-30,-50,-70];
  const attackTables = {'Weapon • 1-H Concussion':'A-10.9.1','Weapon • 1-H Edged':'A-10.9.2','Weapon • 2-Handed':'A-10.9.3','Weapon • Missile':'A-10.9.4','Weapon • Missile Artillery':'A-10.9.4','Weapon • Pole Arms':'A-10.9.5','Weapon • Thrown':'A-10.9.6'};
  const movingRows = [
    [-150,-101,[10,null,null,null,null,null,null,null,null]],[-100,-51,[30,10,null,null,null,null,null,null,null]],
    [-50,-26,[50,30,10,null,null,null,null,null,null]],[-25,0,[70,50,30,5,null,null,null,null,null]],
    [1,20,[80,60,50,10,5,null,null,null,null]],[21,40,[90,70,60,20,10,5,null,null,null]],
    [41,55,[100,80,70,30,20,10,5,null,null]], [56,65,[100,90,80,40,30,20,10,null,null]],
    [66,75,[100,100,90,50,40,30,20,5,null]], [76,85,[100,100,100,60,50,40,30,10,null]],
    [86,95,[100,100,100,70,60,50,40,20,5]], [96,105,[110,100,100,80,70,60,50,25,10]],
    [106,115,[110,110,100,90,80,70,60,30,20]], [116,125,[120,110,110,100,90,80,70,40,30]],
    [126,135,[120,120,110,100,100,90,80,50,40]], [136,145,[130,120,120,110,100,100,90,60,50]],
    [146,155,[130,130,120,120,110,100,100,70,60]], [156,165,[140,130,120,120,120,110,100,80,70]]
  ];
  const size = 29, columns = 13, rows = 10;
  const xOf = (q,r) => 37 + Math.sqrt(3) * size * (q + r / 2);
  const yOf = r => 37 + 1.5 * size * r;
  const keyOf = (q,r) => `${q},${r}`;
  const within = (q,r) => Number.isInteger(q) && Number.isInteger(r) && q >= 0 && q < columns && r >= 0 && r < rows;
  const distance = (a,b) => Math.max(Math.abs(a.q-b.q),Math.abs(a.r-b.r),Math.abs(a.q+a.r-b.q-b.r));
  const blankState = () => ({round:1,phase:-1,resolved:false,scale:5,terrain:{},tokens:{},selected:'',drafts:{},log:[]});
  const normalizeState = saved => ({round:Math.max(1,Number(saved?.round)||1),phase:Number.isInteger(saved?.phase)&&saved.phase>=-1&&saved.phase<=2?saved.phase:-1,resolved:!!saved?.resolved,scale:[5,10,20,50].includes(Number(saved?.scale))?Number(saved.scale):5,terrain:saved?.terrain||{},tokens:saved?.tokens||{},selected:saved?.selected||'',drafts:saved?.drafts||{},log:Array.isArray(saved?.log)?saved.log:[]});
  function readEncounters() {
    try {
      const stored=localStorage.getItem(storageKey);
      if(stored!==null) {const parsed=JSON.parse(stored);return Array.isArray(parsed)?parsed.filter(item=>item&&typeof item.id==='string'&&item.state).map(item=>({...item,state:normalizeState(item.state)})):[];}
      const legacy=localStorage.getItem(legacyStorageKey);
      if(legacy!==null) {
        const previous=JSON.parse(legacy);
        if(!previous||!Object.keys(previous.tokens||{}).length&&!Object.keys(previous.terrain||{}).length&&!previous.log?.length&&Number(previous.round||1)<=1)return [];
        const migrated=[{id:crypto.randomUUID?.()||String(Date.now()),name:'Previous encounter',updatedAt:Date.now(),state:normalizeState(previous)}];
        localStorage.setItem(storageKey,JSON.stringify(migrated));
        return migrated;
      }
    } catch { /* Keep an empty list if saved data cannot be read. */ }
    return [];
  }
  let encounters=readEncounters(),activeEncounterId=null,state=blankState();
  let activePhase='normal',drafts={},resolving=false,placingActorId='';
  let roster = [];
  const persist = () => localStorage.setItem(storageKey,JSON.stringify(encounters));
  const save = () => { const current=encounters.find(item=>item.id===activeEncounterId);if(!current)return;current.state=state;current.updatedAt=Date.now();persist(); };
  const message = value => { $('#encounter-message').textContent = value; };
  const actor = id => roster.find(item => item.id === id);
  const selected = () => actor(state.selected);
  const token = id => state.tokens[id];
  const d100 = () => Math.floor(Math.random()*100)+1;
  const d10 = () => Math.floor(Math.random()*10)+1;
  function openEnded(unmodifiedExceptions = false) {
    const first = d100(), dice = [first];
    if (unmodifiedExceptions && (first === 66 || first === 100)) return {first,dice,total:first,unmodified:true};
    if (first <= 5) { let next; do { next = d100(); dice.push(-next); } while (next >= 96); }
    else if (first >= 96) { let next; do { next = d100(); dice.push(next); } while (next >= 96); }
    return {first,dice,total:dice.reduce((sum,value)=>sum+value,0),unmodified:false};
  }
  const diceText = roll => roll.dice.map((value,index)=>index===0?String(value):value<0?`−${-value}`:`+${value}`).join(' ');
  const phaseModifier = phase => phase === 'snap' ? -20 : phase === 'deliberate' ? 10 : 0;
  const tableLink = (code,label=code) => `<button type="button" class="encounter-table-link" data-table="${esc(code)}">${esc(label)}</button>`;
  const rollInRow = (label,roll) => { const [low,high]=label.split('-').map(Number);return roll>=low&&roll<=(high||low); };
  function expandTableSymbols(value) {
    const rounds=(count,meaning)=>{const amount=Number(count)||1;return `${amount} round${amount===1?'':'s'} ${meaning}`;};
    return String(value||'')
      .replace(/\+(\d+)H\b/g,(_,hits)=>`${hits} extra hits`)
      .replace(/(\d*)∑∏/g,(_,count)=>rounds(count,'stunned and unable to parry'))
      .replace(/(\d*)\(\s*(\d*)π\s*[-−–]\s*(\d+)\s*\)/g,(_,outer,inner,penalty)=>`${rounds(outer||inner,'must parry')} at −${penalty}`)
      .replace(/(\d*)∑/g,(_,count)=>rounds(count,'stunned'))
      .replace(/(\d*)∏/g,(_,count)=>rounds(count,'unable to parry'))
      .replace(/(\d*)π/g,(_,count)=>rounds(count,'must parry'))
      .replace(/(\d*)∫/g,(_,count)=>{const amount=Number(count)||1;return `${amount} hit${amount===1?'':'s'} per round from bleeding`;})
      .replace(/(\d*)\(\s*([-−–+])\s*(\d+)\s*\)/g,(_,count,sign,amount)=>sign==='+'?`${rounds(count,'attacker gains')} +${amount} bonus`:`${count?rounds(count,'foe suffers'):'Foe suffers'} −${amount} penalty`)
      .replace(/\s+[–—]\s+/g,'; ');
  }
  const activeCriticalEffects=value=>(value?.criticalEffects||[]).filter(effect=>(effect.startsRound??state.round)<=state.round);
  const criticalPenalty=value=>activeCriticalEffects(value).reduce((sum,effect)=>sum-(effect.kind==='penalty'?Number(effect.amount)||0:0),0);
  const criticalBonus=value=>activeCriticalEffects(value).reduce((sum,effect)=>sum+(effect.kind==='bonus'?Number(effect.amount)||0:0),0);
  const criticalModifier=value=>criticalPenalty(value)+criticalBonus(value);
  const criticalRounds=(value,kind)=>activeCriticalEffects(value).filter(effect=>effect.kind===kind).reduce((sum,effect)=>sum+(Number(effect.roundsLeft)||0),0);
  function criticalEffectLabel(effect) {
    const rounds=effect.roundsLeft===null?'until healed':`${effect.roundsLeft} round${effect.roundsLeft===1?'':'s'}`;
    return ({penalty:`−${effect.amount} to rolls`,bonus:`+${effect.amount} to rolls`,stun:'Stunned',stunNoParry:'Stunned; cannot parry',noParry:'Cannot parry',mustParry:`Must parry${effect.amount?` at −${effect.amount}`:''}`,bleed:`Bleeding ${effect.amount} hit${effect.amount===1?'':'s'}/round`})[effect.kind]+` · ${rounds}`;
  }
  function criticalFacts(who,value) {
    const names=(who.equipmentNames||[]).join(' ').toLowerCase(),at=Number(who.at)||1;
    const greaves=[10,14,18].includes(at)||/full chain|full plate|half plate|rein.*full/i.test(names);
    return {
      shield:(who.shieldBonus||0)>0||/shield/.test(names),
      helmet:/helm|helmet/.test(names),
      'nose guard':/visored|nose guard/.test(names),
      'arm greaves':greaves||/arm greave/.test(names),
      'leg greaves':greaves||/leg greave/.test(names),
      'leg armor':greaves||[8,11,12,15,16,19,20].includes(at)||/leg greave/.test(names),
      'thigh armor':greaves||[8,11,12,15,16,19,20].includes(at)||/thigh armor/.test(names),
      'chest armor':at>=5,'abdomen armor':at>=5,'waist armor':at>=5,'shoulder armor':at>=6,
      backpack:/backpack/.test(names),wet:(value.statuses||[]).includes('Wet')
    };
  }
  function chooseCriticalBranch(raw,who,value) {
    const marker=/\b(without|with|w\/o|w\/|if not|if)\s+(arm greaves|leg greaves?|leg armor|thigh armor|chest armor|ch\.? armor|abdom(?:en|inal) armor|waist armor|shoulder armor|nose guard|shield|helmet|helm|backpack|wet)\s*:+/gi;
    const found=[...raw.matchAll(marker)];
    if(!found.length)return /\b(?:w\/o|without)\b/i.test(raw)?{effect:'',unresolved:true}:{effect:raw,unresolved:false};
    const facts=criticalFacts(who,value);
    const prefix=raw.slice(0,found[0].index).trim();
    if(/[∑∏π∫]|\+\d+H|\(\s*[-−–+]\s*\d+\s*\)/.test(prefix))return {effect:'',unresolved:true};
    for(let index=0;index<found.length;index++) {
      const [,word,item]=found[index];let key=item.toLowerCase();
      if(key==='helm')key='helmet';
      if(key==='leg greave')key='leg greaves';
      if(/^ch\.? armor$/.test(key))key='chest armor';
      if(key==='abdominal armor')key='abdomen armor';
      const present=facts[key];
      if(present===undefined)return {effect:'',unresolved:true};
      const wantsAbsent=/without|w\/o|not/i.test(word);
      if(present!==wantsAbsent) {
        const effect=raw.slice(found[index].index+found[index][0].length,index+1<found.length?found[index+1].index:raw.length).trim();
        return /\b(?:w\/o|without)\b/i.test(effect)?{effect:'',unresolved:true}:{effect,unresolved:false};
      }
    }
    return {effect:'',unresolved:false};
  }
  function parseCriticalSymbols(raw) {
    const effects=[];let rest=String(raw||'');
    const take=(pattern,handler)=>{rest=rest.replace(pattern,(...match)=>{handler(...match);return ' ';});};
    take(/\+(\d+)H\b/g,(_,amount)=>effects.push({kind:'hits',amount:Number(amount)}));
    take(/(\d*)∑∏/g,(_,rounds)=>effects.push({kind:'stunNoParry',roundsLeft:Number(rounds)||1}));
    take(/(\d*)\(\s*(\d*)π\s*[-−–]\s*(\d+)\s*\)/g,(_,outer,inner,penalty)=>effects.push({kind:'mustParry',roundsLeft:Number(outer||inner)||1,amount:Number(penalty)}));
    take(/(\d*)∑/g,(_,rounds)=>effects.push({kind:'stun',roundsLeft:Number(rounds)||1}));
    take(/(\d*)∏/g,(_,rounds)=>effects.push({kind:'noParry',roundsLeft:Number(rounds)||1}));
    take(/(\d*)π/g,(_,rounds)=>effects.push({kind:'mustParry',roundsLeft:Number(rounds)||1,amount:0}));
    take(/(\d*)∫/g,(_,amount)=>effects.push({kind:'bleed',amount:Number(amount)||1,roundsLeft:null}));
    take(/(\d*)\(\s*[-−–]\s*(\d+)\s*\)/g,(_,rounds,amount)=>effects.push({kind:'penalty',amount:Number(amount),roundsLeft:rounds?Number(rounds):null}));
    take(/(\d*)\(\s*\+\s*(\d+)\s*\)/g,(_,rounds,amount)=>effects.push({kind:'bonus',amount:Number(amount),roundsLeft:Number(rounds)||1}));
    return effects;
  }
  function addCriticalEffects(target,attacker,effects) {
    for(const effect of effects) {
      if(effect.kind==='hits') {const who=actor(Object.keys(state.tokens).find(id=>token(id)===target));target.hits=who?.hitsMax>0?Math.min(who.hitsMax,(target.hits||0)+effect.amount):(target.hits||0)+effect.amount;continue;}
      const receiver=effect.kind==='bonus'?attacker:target;
      receiver.criticalEffects=Array.isArray(receiver.criticalEffects)?receiver.criticalEffects:[];
      const startsRound=effect.kind==='bleed'||effect.kind==='bonus'?state.round+1:state.round+(effect.roundsLeft!==null&&(target.activityThisRound||0)>=50?1:0);
      const existing=['stun','stunNoParry','noParry','mustParry'].includes(effect.kind)&&receiver.criticalEffects.find(item=>item.kind===effect.kind&&item.startsRound===startsRound&&item.amount===effect.amount);
      if(existing){existing.roundsLeft+=effect.roundsLeft;continue;}
      receiver.criticalEffects.push({...effect,startsRound,id:crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`});
    }
    updateStunConsciousness(target);
  }
  function updateStunConsciousness(value) {
    const who=actor(Object.keys(state.tokens).find(id=>token(id)===value));
    const total=(value.criticalEffects||[]).filter(effect=>['stun','stunNoParry'].includes(effect.kind)).reduce((sum,effect)=>sum+(effect.roundsLeft||0),0);
    const threshold=10+2*(who?.stats?.[1]||0);
    value.statuses=Array.isArray(value.statuses)?value.statuses:[];
    if(total>0&&total>threshold&&!value.statuses.includes('Unconscious')){value.statuses.push('Unconscious');value.stunUnconscious=true;}
    else if(total<=threshold&&value.stunUnconscious){value.statuses=value.statuses.filter(item=>item!=='Unconscious');delete value.stunUnconscious;}
  }
  function advanceCriticalEffects(completedRound) {
    for(const [id,value] of Object.entries(state.tokens)) {
      const stuns=(value.criticalEffects||[]).filter(effect=>['stun','stunNoParry'].includes(effect.kind)&&(effect.startsRound??completedRound)<=completedRound);
      const spent=stuns.find(effect=>effect.kind==='stunNoParry')||stuns[0];
      value.criticalEffects=(value.criticalEffects||[]).filter(effect=>effect.roundsLeft===null||(effect.startsRound??completedRound)>completedRound||(['stun','stunNoParry'].includes(effect.kind)?effect!==spent||--effect.roundsLeft>0:--effect.roundsLeft>0));
      updateStunConsciousness(value);
      const bleeding=activeCriticalEffects(value).filter(effect=>effect.kind==='bleed').reduce((sum,effect)=>sum+effect.amount,0);
      if(bleeding){const who=actor(id);value.hits=who?.hitsMax>0?Math.min(who.hitsMax,(value.hits||0)+bleeding):(value.hits||0)+bleeding;appendLog(id,`Bleeding: ${bleeding} hit${bleeding===1?'':'s'} at the start of round ${state.round}.`);}
    }
  }
  const tableCache=new Map();
  async function loadTable(code) {
    if(!tableCache.has(code))tableCache.set(code,fetch(`tables/${code}.json`).then(response=>{if(!response.ok)throw new Error(`Table ${code} unavailable`);return response.json();}));
    return tableCache.get(code);
  }
  async function narrativeRoll(code,columnIndex,label,modifier=0,criticalTarget=null) {
    const roll=d100(),total=roll+modifier;
    try {
      const table=await loadTable(code);
      const lookup=Math.max(1,total);
      const row=table.rows.find(item=>item.roll.endsWith('+')?lookup>=Number.parseInt(item.roll,10):rollInRow(item.roll,lookup));
      const cell=row?.cells?.[columnIndex];
      const dice=`${roll}${modifier?` ${modifier>=0?'+':'−'} ${Math.abs(modifier)} = ${total}`:''}`;
      if(!cell)return {html:`${tableLink(code,label)} roll ${dice}: no matching entry.`,effects:[]};
      const choice=criticalTarget?chooseCriticalBranch(cell.effect||'',criticalTarget.who,criticalTarget.value):{effect:cell.effect||'',unresolved:false};
      const effect=choice.effect?` <strong>${esc(expandTableSymbols(choice.effect))}</strong>`:'';
      const effects=criticalTarget&&!choice.unresolved?parseCriticalSymbols(choice.effect):[];
      return {html:`${tableLink(code,label)} roll ${dice}: ${esc(expandTableSymbols(cell.description))}${effect}${choice.unresolved?` <strong>Condition needs review: ${esc(expandTableSymbols(cell.effect))}</strong>`:''}`,effects,unresolved:choice.unresolved,rawEffect:cell.effect||''};
    } catch {return {html:`${tableLink(code,label)} roll ${roll}: table unavailable.`,effects:[]};}
  }
  const weaponFumbleColumn=category=>category==='Weapon • 2-Handed'?1:category==='Weapon • Pole Arms'?2:category==='Weapon • Thrown'?4:category==='Weapon • Missile'||category==='Weapon • Missile Artillery'?5:0;
  const spellFailureColumn=(skill,attack)=>attack==='bolt'||attack==='ball'?0:attack==='basic'?1:/inform|divin|detect|sense/i.test(skill?.name||'')?2:3;
  function appendLog(id, detail) {
    state.log.unshift({round:state.round,phase:state.phase<0?'Declaration':phases[state.phase],actor:actor(id)?.name||'GM',detail});
    state.log = state.log.slice(0,80);
  }
  function renderList() {
    const sorted=[...encounters].sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
    $('#encounter-list').innerHTML=sorted.length?sorted.map(item=>{
      const count=Object.keys(item.state.tokens||{}).length;
      const phase=item.state.phase<0?'Declaration':`${phases[item.state.phase]||'Snap'} phase`;
      return `<article class="encounter-list-card"><div><h2>${esc(item.name)}</h2><p>Round ${item.state.round} · ${esc(phase)} · ${count} character${count===1?'':'s'}</p><small>Last played ${esc(new Date(item.updatedAt||Date.now()).toLocaleString())}</small></div><div class="encounter-list-actions"><button type="button" class="button button-dark" data-open-encounter="${esc(item.id)}">Continue</button><button type="button" class="button button-quiet" data-delete-encounter="${esc(item.id)}">Delete</button></div></article>`;
    }).join(''):'<div class="encounter-list-empty"><h2>No encounters yet</h2><p>Name one above to start playing.</p></div>';
  }
  function showList() {
    if(resolving)return message('Finish resolving the round before leaving this encounter.');
    if(activeEncounterId)save();
    activeEncounterId=null;
    placingActorId='';
    $('#encounter-workspace').hidden=true;
    $('#encounter-list-view').hidden=false;
    renderList();
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function openEncounter(id) {
    if(resolving)return;
    const current=encounters.find(item=>item.id===id);if(!current)return;
    activeEncounterId=id;state=normalizeState(current.state);drafts=state.drafts;activePhase='normal';placingActorId='';
    $('#encounter-list-view').hidden=true;
    $('#encounter-workspace').hidden=false;
    $('#encounter-current-name').textContent=current.name;
    refreshRoster();
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function refreshRoster() {
    roster = window.RolemasterEncounter?.roster() || [];
    if(!activeEncounterId){renderList();return;}
    Object.keys(state.tokens).filter(id => !actor(id)).forEach(id => delete state.tokens[id]);
    if(!token(placingActorId))placingActorId='';
    ensureInitiative();
    if (!state.tokens[state.selected]) state.selected = Object.keys(state.tokens)[0] || '';
    save(); render();
  }
  const option=(value,label,current)=>`<option value="${esc(value)}"${String(value)===String(current)?' selected':''}>${esc(label)}</option>`;
  const defaultActivity={simple:20,move:20,static:100,moving:100,melee:100,missile:60,spell:75,resist:0};
  const missileCategories=['Weapon • Missile','Weapon • Thrown','Weapon • Missile Artillery'];
  function choiceFor(action) {
    if(!action)return 'none';
    if(['melee','missile'].includes(action.type))return `attack:${action.skill}`;
    if(action.type==='spell')return `spell:${action.skill}`;
    if(['static','moving'].includes(action.type))return action.skill==='stat'?'stat':`skill:${action.skill}`;
    return action.type;
  }
  function draftFor(id,phase) {
    const key=`${id}:${phase}`;
    if(!drafts[key]) {
      const action=token(id)?.actions?.[phase];
      drafts[key]={choice:choiceFor(action),activity:action?.activity??0,maneuver:action?.type==='moving'?'moving':'static',statIndex:action?.statIndex??0,targetKind:action?.targetHex?'hex':action?.target?'creature':'none',target:action?.target||'',hex:action?.destination||action?.targetHex||null,difficulty:action?.difficulty||'Medium',pace:action?.pace||1,spellLevel:action?.spellLevel||1,preparation:action?.preparation||0,instant:!!action?.instant,spellAttack:action?.spellAttack||'none',areaRadius:action?.areaRadius??0,resistance:action?.resistance||'channeling',attackLevel:action?.attackLevel||1,modifier:action?.modifier||0,range:action?.range||'',description:action?.description||''};
    }
    return drafts[key];
  }
  function movementActivity(id) {
    return phases.reduce((sum,phase)=>{const draft=draftFor(id,phase);return sum+(draftType(draft,actor(id))==='move'?Number(draft.activity)||0:0);},0);
  }
  function ensureInitiative(reroll=false) {
    for(const [id,value] of Object.entries(state.tokens)) {
      const who=actor(id);if(!who)continue;
      if(reroll||!Array.isArray(value.initiativeRoll))value.initiativeRoll=[d10(),d10()];
      const mod=(value.surprised?-4:0)+(who.hitsMax>0&&(value.hits||0)>who.hitsMax/2?-4:0)-Math.floor(movementActivity(id)/10)+(Number(value.initiativeMod)||0)+criticalModifier(value);
      value.initiative=value.initiativeRoll[0]+value.initiativeRoll[1]+(who.stats[8]||0)+mod;
    }
  }
  const orderedActors=()=>Object.entries(state.tokens).filter(([id])=>actor(id)).sort((a,b)=>(b[1].initiative||0)-(a[1].initiative||0)||actor(a[0]).name.localeCompare(actor(b[0]).name));
  function draftType(draft,who) {
    if(draft.choice.startsWith('attack:'))return missileCategories.includes(who?.attacks?.[Number(draft.choice.slice(7))]?.category)?'missile':'melee';
    if(draft.choice.startsWith('spell:'))return 'spell';
    if(draft.choice.startsWith('skill:')||draft.choice==='stat')return draft.maneuver==='moving'?'moving':'static';
    return draft.choice;
  }
  function targetKindFor(draft,who) {
    const type=draftType(draft,who);
    if(type==='move'||type==='spell'&&draft.spellAttack==='ball')return 'hex';
    if(['melee','missile'].includes(type)||type==='spell'&&draft.spellAttack!=='none')return 'creature';
    if(type==='resist'||draft.choice==='none')return 'none';
    return draft.targetKind;
  }
  function validHex(q,r,draft,who,origin) {
    if(!within(q,r)||state.terrain[keyOf(q,r)]==='blocked')return false;
    if(!origin||!within(origin.q,origin.r))return false;
    const type=draftType(draft,who),steps=distance(origin,{q,r});
    if(type==='move') {
      if(!steps)return false;
      const budget=Math.max(0,who.baseMove)*Number(draft.pace||1)*Number(draft.activity||0)/100;
      let cost=0;
      for(const hex of lineTo(origin,{q,r})) {
        const terrain=state.terrain[keyOf(hex.q,hex.r)]||'clear';
        if(terrain==='blocked')return false;
        cost+=state.scale*(terrain==='difficult'?2:1);
      }
      return cost<=budget;
    }
    const range=Number(draft.range);
    if(range>0&&steps*state.scale>range)return false;
    if(origin&&within(origin.q,origin.r)&&lineTo(origin,{q,r}).slice(0,-1).some(hex=>state.terrain[keyOf(hex.q,hex.r)]==='blocked'))return false;
    return true;
  }
  function validCreature(id,draft,who,origin) {
    const foe=token(id);
    const type=draftType(draft,who);
    if(id===who.id&&(['melee','missile'].includes(type)||type==='spell'&&draft.spellAttack!=='none'))return false;
    if(!foe||!within(foe.q,foe.r)||!origin||!within(origin.q,origin.r))return false;
    const steps=distance(origin,foe);
    if(type==='melee'&&steps>1)return false;
    const range=Number(draft.range);
    if(range>0&&steps*state.scale>range)return false;
    if(lineTo(origin,foe).slice(0,-1).some(hex=>state.terrain[keyOf(hex.q,hex.r)]==='blocked'))return false;
    return true;
  }
  function renderMap() {
    const placing=!!token(placingActorId),who=placing?actor(placingActorId):selected(),origin=who?token(who.id):null,draft=who?draftFor(who.id,activePhase):null;
    const kind=draft&&!placing?targetKindFor(draft,who):'none';
    const vertices=Array.from({length:6},(_,index)=>{const angle=Math.PI/180*(60*index-30);return `${(size*Math.cos(angle)).toFixed(1)},${(size*Math.sin(angle)).toFixed(1)}`;}).join(' ');
    const cells=[];
    for(let r=0;r<rows;r++)for(let q=0;q<columns;q++) {
      const terrain=state.terrain[keyOf(q,r)]||'clear';
      const valid=placing?terrain!=='blocked':kind==='hex'&&validHex(q,r,draft,who,origin);
      const aimed=!placing&&draft?.hex?.q===q&&draft?.hex?.r===r;
      cells.push(`<g data-hex="${q},${r}" class="encounter-hex ${terrain}${valid?' valid-target':''}${aimed?' destination':''}" transform="translate(${xOf(q,r)},${yOf(r)})"><polygon points="${vertices}"></polygon>${terrain!=='clear'?`<text text-anchor="middle" y="4">${terrain==='blocked'?'■':'◆'}</text>`:''}</g>`);
    }
    const placed=Object.entries(state.tokens).filter(([,value])=>within(value.q,value.r));
    const pieces=placed.map(([id,value])=>{
      const character=actor(id);if(!character)return '';
      const stacked=placed.filter(([,item])=>item.q===value.q&&item.r===value.r).findIndex(([other])=>other===id);
      const x=xOf(value.q)+(stacked%2)*12-6,y=yOf(value.r)+Math.floor(stacked/2)*13;
      const valid=kind==='creature'&&validCreature(id,draft,who,origin);
      return `<g data-token="${esc(id)}" class="encounter-token${id===state.selected?' selected':''}${valid?' valid-target':''}${draft?.target===id?' destination':''}" transform="translate(${x},${y})"><circle r="17"></circle><text text-anchor="middle" y="4">${esc(character.name.slice(0,2).toUpperCase())}</text><title>${esc(character.name)}</title></g>`;
    }).join('');
    $('#encounter-map').setAttribute('viewBox','0 0 970 480');
    $('#encounter-map').innerHTML=cells.join('')+pieces;
    const tool=$('#encounter-map-tool').value;
    $('#encounter-map-status').textContent=!who?'Add a character to start.':placing?`Tap a highlighted hex to place ${who.name}.`:!origin||!within(origin.q,origin.r)?`Tap a hex to place ${who.name}.`:kind==='creature'?`${who.name} · ${activePhase}: tap a highlighted creature to target it.`:kind==='hex'?`${who.name} · ${activePhase}: tap a highlighted hex to target it.`:tool==='position'?`${who.name} at hex ${origin.q},${origin.r}. Tap another hex to move their token.`:`Tap hexes to ${tool==='clear'?'clear':`paint ${tool}`} terrain.`;
  }
  function renderCharacterButtons() {
    $('#encounter-character-buttons').innerHTML=roster.length?roster.map(who=>{
      const active=!!token(who.id);
      return `<button type="button" data-toggle-character="${esc(who.id)}" aria-pressed="${active}" class="${active?'selected':''}" ${resolving||state.phase>=0?'disabled':''}>${esc(who.name)}<small>Level ${who.level}</small></button>`;
    }).join(''):'<p class="play-muted">Create a character first.</p>';
  }
  function toggleCharacter(id) {
    if(resolving||state.phase>=0||!actor(id))return;
    if(token(id)) {
      delete state.tokens[id];
      if(placingActorId===id)placingActorId='';
      for(const key of Object.keys(drafts))if(key.startsWith(`${id}:`))delete drafts[key];
      for(const draft of Object.values(drafts))if(draft.target===id)draft.target='';
      if(state.selected===id)state.selected=Object.keys(state.tokens)[0]||'';
    } else {
      state.tokens[id]={q:null,r:null,hits:0,pp:0,initiative:null,actions:{}};
      state.selected=id;ensureInitiative();
    }
    state.drafts=drafts;save();render();
  }
  function renderRound() {
    $('#encounter-round').textContent=`Round ${state.round}`;
    $('#encounter-phase').textContent=state.phase<0?'Planning':`${phases[state.phase][0].toUpperCase()+phases[state.phase].slice(1)} phase`;
    $('#encounter-resolve-round').disabled=resolving;
    $('#encounter-resolve-round').textContent=state.phase<0?'Resolve round':'Continue round';
    $('#encounter-round-note').textContent=state.phase<0?'Set actions for each character, then resolve all three phases in initiative order. Unused phases stay empty.':resolving?'Resolving actions…':'Continue the unfinished round.';
  }
  function choiceOptions(who,current) {
    let html='<optgroup label="Actions">'+[['none','No action'],['simple','Simple action'],['move','Move to a hex'],['resist','Resistance roll'],['stat','Maneuver without a skill']].map(([value,label])=>option(value,label,current)).join('')+'</optgroup>';
    const attacks=(who.attacks||[]).map((item,index)=>({item,index})).filter(({item})=>attackTables[item.category]);
    if(attacks.length)html+='<optgroup label="Equipped attacks">'+attacks.map(({item,index})=>option(`attack:${index}`,`${item.name} · ${item.bonus>=0?'+':''}${item.bonus}`,current)).join('')+'</optgroup>';
    const spells=(who.skills||[]).map((item,index)=>({item,index})).filter(({item})=>item.category.startsWith('Spells •')&&item.ranks>0);
    if(spells.length)html+='<optgroup label="Spell lists">'+spells.map(({item,index})=>option(`spell:${index}`,`${item.name} · ${item.ranks} ranks`,current)).join('')+'</optgroup>';
    const skills=(who.skills||[]).map((item,index)=>({item,index})).filter(({item})=>!item.category.startsWith('Spells •')&&!item.category.startsWith('Weapon •'));
    if(skills.length)html+='<optgroup label="Skills">'+skills.map(({item,index})=>option(`skill:${index}`,`${item.name} · ${item.bonus>=0?'+':''}${item.bonus}${item.ranks?'':' (untrained)'}`,current)).join('')+'</optgroup>';
    return html;
  }
  function renderPhaseCards() {
    const scrollPosition=$('#encounter-phase-cards').scrollLeft;
    if(!orderedActors().length){$('#encounter-phase-cards').innerHTML='<p class="play-muted">Add a character above to plan their actions.</p>';return;}
    $('#encounter-phase-cards').innerHTML=orderedActors().map(([id,value])=>{
      const who=actor(id);
      const used=phases.reduce((sum,phase)=>{const draft=draftFor(id,phase);return sum+(draft.choice==='none'?0:Number(draft.activity)||0);},0);
      const statuses=statusChoices.map(status=>{const active=status==='Surprised'?!!value.surprised:(value.statuses||[]).includes(status);return `<button type="button" data-status="${status}" aria-pressed="${active}" class="${active?'selected':''}">${status}</button>`;}).join('');
      const effects=(value.criticalEffects||[]).map(effect=>`<span>${(effect.startsRound??state.round)>state.round?'Starts next round · ':''}${esc(criticalEffectLabel(effect))}<button type="button" data-clear-effect="${esc(effect.id)}" aria-label="Clear ${esc(criticalEffectLabel(effect))}">×</button></span>`).join('');
      const header=`<header class="encounter-actor-header"><div class="encounter-actor-initiative"><small>Initiative</small><strong>${value.initiative}</strong><small>${value.initiativeRoll?.join(' + ')||''} + Qu/mods</small></div><div class="encounter-actor-name"><small>Name</small><strong>${esc(who.name)}</strong><small>DB ${who.db} · AT ${who.at} · ${who.baseMove} ft/round</small></div><label><span>Hits</span><span class="encounter-vital-input"><input type="number" min="0" max="${Math.max(0,who.hitsMax)}" data-vital="hits" value="${value.hits||0}"><small>/ ${who.hitsMax||'—'}</small></span></label><label><span>PP</span><span class="encounter-vital-input"><input type="number" min="0" max="${Math.max(0,who.ppMax)}" data-vital="pp" value="${value.pp||0}"><small>/ ${who.ppMax||'—'}</small></span></label></header><div class="encounter-actor-tools"><span>${used} / 100% activity</span><label>Initiative modifier <input type="number" data-initiative-mod value="${value.initiativeMod||0}"></label><button type="button" data-place-actor="${esc(id)}">Place on map</button></div><div class="encounter-status"><strong>Status</strong><div class="encounter-status-options">${statuses}</div></div>${effects?`<div class="encounter-critical-effects" aria-label="Critical effects">${effects}</div>`:''}`;
      const cards=phases.map((phase,index)=>{
      const draft=draftFor(who.id,phase),type=draftType(draft,who),kind=targetKindFor(draft,who);
      const target=kind==='creature'?(actor(draft.target)?.name||'Tap a highlighted creature on the map'):kind==='hex'?(draft.hex?`Hex ${draft.hex.q},${draft.hex.r} · ${token(who.id)?.q!=null?distance(token(who.id),draft.hex)*state.scale:0} ft`:'Tap a highlighted hex on the map'):'';
      const active=phase===activePhase&&who.id===state.selected;
      return `<article class="encounter-phase-card${active?' active':''}${state.phase===index?' current':''}"><div><strong>${index+1}. ${phase[0].toUpperCase()+phase.slice(1)}</strong><small>${index===0?'Acts early · −20':index===2?'Acts late · +10':'Acts normally'}</small></div><form class="encounter-phase-form" data-actor="${esc(who.id)}" data-phase="${phase}"><label class="encounter-phase-wide">Skill or action<select name="choice">${choiceOptions(who,draft.choice)}</select></label>${draft.choice==='none'?'':`<label>Activity %<input name="activity" type="number" min="0" max="100" value="${esc(draft.activity)}"></label>${['static','moving'].includes(type)?`<label>Maneuver<select name="maneuver">${option('static','Static',draft.maneuver)}${option('moving','Moving',draft.maneuver)}</select></label><label>Difficulty<select name="difficulty">${difficulties.map(item=>option(item,item,draft.difficulty)).join('')}</select></label>`:''}${draft.choice==='stat'?`<label>Applicable stat<select name="statIndex">${['Agility','Constitution','Memory','Reasoning','Self Discipline','Empathy','Intuition','Presence','Quickness','Strength'].map((item,i)=>option(i,item,draft.statIndex)).join('')}</select></label>`:''}${type==='move'?`<label>Pace<select name="pace">${[[1,'Walk ×1'],[1.5,'Jog ×1.5'],[2,'Run ×2'],[3,'Sprint ×3'],[4,'Fast sprint ×4'],[5,'Dash ×5']].map(([value,label])=>option(value,label,draft.pace)).join('')}</select></label>`:''}${type==='spell'?`<label>Spell level<input name="spellLevel" type="number" min="1" max="50" value="${esc(draft.spellLevel)}"></label><label>Preparation rounds<input name="preparation" type="number" min="0" max="20" value="${esc(draft.preparation)}"></label><label>Spell attack<select name="spellAttack">${[['none','No attack'],['basic','Basic'],['bolt','Bolt'],['ball','Ball']].map(([value,label])=>option(value,label,draft.spellAttack)).join('')}</select></label>${draft.spellAttack==='ball'?`<label>Area radius (ft)<input name="areaRadius" type="number" min="0" value="${esc(draft.areaRadius)}"></label>`:''}<label class="encounter-inline-check"><input name="instant" type="checkbox" ${draft.instant?'checked':''}> Instantaneous</label>`:''}${type==='resist'?`<label>Resistance<select name="resistance">${['channeling','essence','mentalism','poison','disease','fear'].map(item=>option(item,item,draft.resistance)).join('')}</select></label><label>Attack level<input name="attackLevel" type="number" min="1" max="100" value="${esc(draft.attackLevel)}"></label>`:''}${!['move','melee','missile','resist'].includes(type)&&!(type==='spell'&&draft.spellAttack!=='none')?`<label>Target<select name="targetKind">${[['none','No target'],['creature','Creature'],['hex','Hex']].map(([value,label])=>option(value,label,draft.targetKind)).join('')}</select></label>`:''}${kind!=='none'&&type!=='move'?`<label>Max range (ft)<input name="range" type="number" min="1" placeholder="Optional" value="${esc(draft.range)}"><small>Blank shows all visible targets.</small></label>`:''}${kind!=='none'?`<div class="encounter-phase-target encounter-phase-wide"><span>${esc(target)}</span><button type="button" data-focus-target="${phase}">Show targets</button></div>`:''}<label>Other modifier<input name="modifier" type="number" value="${esc(draft.modifier)}"></label><label class="encounter-phase-wide">Description<input name="description" type="text" maxlength="100" placeholder="Optional" value="${esc(draft.description)}"></label>`}</form></article>`;
      }).join('');
      return `<section class="encounter-actor-card" data-actor-card="${esc(id)}">${header}<div class="encounter-phase-cards">${cards}</div></section>`;
    }).join('');
    $('#encounter-phase-cards').scrollLeft=scrollPosition;
    $('#encounter-phase-cards').querySelectorAll('input,select,button').forEach(control=>{control.disabled=state.phase>=0||resolving;});
  }
  function renderLog() {
    $('#encounter-log').innerHTML=state.log.length?state.log.map(entry=>`<article><small>Round ${entry.round} · ${esc(entry.phase)} · ${esc(entry.actor)}</small><p>${entry.detail}</p></article>`).join(''):'<p class="play-muted">Resolved actions appear here.</p>';
  }
  function render() {renderCharacterButtons();renderRound();renderPhaseCards();renderMap();renderLog();$('#encounter-scale').value=String(state.scale);}
  function returnToActivePhase(){[...document.querySelectorAll('.encounter-phase-form')].find(form=>form.dataset.actor===state.selected&&form.dataset.phase===activePhase)?.scrollIntoView({behavior:'smooth',block:'center'});}
  function moveResult(total,difficulty) {
    const row=movingRows.find(([low,high])=>total>=low&&total<=high);
    return row?.[2]?.[difficulties.indexOf(difficulty)]??null;
  }
  function staticResult(total,unmodified) {
    if (unmodified&&total===66) return 'Unusual event';
    if (unmodified&&total===100) return 'Unusual success · 125%';
    if (total<=-26) return 'Spectacular failure';
    if (total<=4) return 'Absolute failure';
    if (total<=75) return 'Failure';
    if (total<=90) return 'Partial success · 20%';
    if (total<=110) return 'Near success · 80%';
    if (total<=175) return 'Success · 100%';
    return 'Absolute success · 120%';
  }
  function staticNarrative(outcome) {
    return {
      'Spectacular failure':'You make a thorough mess of your attempt. You are at -20 to your next two actions.',
      'Absolute failure':'Your remarkable failure marks you for ridicule. Hope your parents weren’t watching…',
      'Failure':'You fail. Your skill is not up to the task. Maybe next time.',
      'Unusual event':'Your maneuver is beset by an unusual event. The GM determines what happens.',
      'Partial success':'Your attempt bears little fruit, but you appear to be on the right track.',
      'Near success':'You are within sight of your goal. You may attempt to complete it with another roll at +10.',
      'Unusual success':'You have achieved a remarkable success in an unusual fashion.',
      'Success':'Congratulations! You are completely successful in your attempt. Carry on.',
      'Absolute success':'You operate at +10 to future attempts with this skill until an Absolute or Spectacular Failure.'
    }[outcome.split(' · ')[0]]||'';
  }
  function spellResult(total,unmodified) {
    if (unmodified&&total===66) return 'Unusual event';
    if (unmodified&&total===100) return 'Unusual success';
    if (total<=-76) return 'Spectacular failure';
    if (total<=1) return 'Absolute failure';
    if (total<=25) return 'Failure';
    if (total<=40) return 'Partial success';
    if (total<=60) return 'Near success';
    if (total<=125) return 'Success';
    return 'Absolute success';
  }
  function spellNarrative(outcome) {
    return {
      'Spectacular failure':'The spell fails; roll on the Spell Failure Table with triple the applicable spell-casting modifiers subtracted.',
      'Absolute failure':'The spell fails; roll on the Spell Failure Table with twice the applicable spell-casting modifiers subtracted.',
      'Failure':'The spell fails; roll on the Spell Failure Table with the applicable spell-casting modifiers subtracted.',
      'Unusual event':'You cast the wrong spell. The GM chooses one of your other spells.',
      'Partial success':'You may cast the spell normally next round as a 50% activity action.',
      'Near success':'The spell is cast at the end of the deliberate phase this round.',
      'Unusual success':'The spell is cast. Gain +30 to your next spell-casting maneuver within 10 minutes.',
      'Success':'The spell is cast normally.',
      'Absolute success':'The spell is cast. Gain +10 to your next spell-casting maneuver within 10 minutes.'
    }[outcome]||'';
  }
  function resistanceThreshold(attackLevel,targetLevel) {
    const base=[0,50,45,40,35,30,27,24,21,18,15,13,11,9,7,5];
    const attack=[0,0,5,10,15,20,23,26,29,32,35,37,39,41,43,45];
    return (targetLevel<=15?base[Math.max(1,targetLevel)]:5-(targetLevel-15))+(attackLevel<=15?attack[Math.max(1,attackLevel)]:45+attackLevel-15);
  }
  function spellPreparation(diff,rounds,instant) {
    if (instant) return diff>=9?15:diff>=6?10:diff>=3?5:diff>=0?0:diff>=-5?-25+5*diff:diff>=-7?-70:diff>=-10?-95:diff>=-15?-120:diff>=-20?-170:-220;
    const band=rounds>=9?6:rounds>=7?5:rounds>=5?4:rounds>=3?3:rounds>=2?2:rounds>=1?1:0;
    const rows=[[9,[5,10,15,20,25,30,35]],[6,[0,5,10,15,20,25,30]],[5,[-10,0,5,10,15,20,25]],[4,[-20,0,5,10,15,20,25]],[3,[-30,0,5,10,15,20,25]],[2,[-35,-10,0,5,10,15,20]],[1,[-45,-20,0,5,10,15,20]],[0,[-55,-30,0,5,10,15,20]],[-1,[-85,-60,-30,-25,-20,-15,-10]],[-2,[-90,-65,-35,-30,-25,-20,-15]],[-3,[-95,-70,-40,-35,-30,-25,-20]],[-4,[-100,-75,-45,-40,-35,-30,-25]],[-5,[-105,-80,-50,-45,-40,-35,-30]],[-6,[-125,-100,-70,-65,-60,-55,-50]],[-8,[-150,-125,-95,-90,-85,-80,-75]],[-11,[-175,-150,-120,-115,-110,-105,-100]],[-16,[-225,-200,-170,-165,-160,-155,-150]],[-21,[-275,-250,-220,-215,-210,-205,-200]]];
    return (rows.find(([minimum])=>diff>=minimum)||[-99,[-275,-250,-220,-215,-210,-205,-200]])[1][band];
  }
  function lineTo(a,b) {
    const n=distance(a,b),result=[];
    for(let step=1;step<=n;step++) {
      const t=step/n,x=a.q+(b.q-a.q)*t,z=a.r+(b.r-a.r)*t,y=-x-z;
      let rx=Math.round(x),ry=Math.round(y),rz=Math.round(z);
      const dx=Math.abs(rx-x),dy=Math.abs(ry-y),dz=Math.abs(rz-z);
      if(dx>dy&&dx>dz) rx=-ry-rz; else if(dy>dz) ry=-rx-rz; else rz=-rx-ry;
      result.push({q:rx,r:rz});
    }
    return result;
  }
  async function attackResult(who,value,declaration) {
    const weapon=who.attacks[Number(declaration.skill)];
    const foe=actor(declaration.target),foeToken=token(declaration.target);
    if(!weapon||!foe||!foeToken) return 'Attack has no valid weapon or target.';
    if(!within(value.q,value.r)||!within(foeToken.q,foeToken.r)) return 'Place both combatants on the map first.';
    if(declaration.type==='melee'&&distance(value,foeToken)>1) return 'Target is outside adjacent melee range.';
    if(declaration.range&&distance(value,foeToken)*state.scale>declaration.range)return 'Target is outside the selected attack range.';
    if(lineTo(value,foeToken).slice(0,-1).some(hex=>state.terrain[keyOf(hex.q,hex.r)]==='blocked'))return 'Blocked terrain obscures the target.';
    const code=attackTables[weapon.category];
    if(!code) return 'No matching attack table for this item. Use the Tables page.';
    const roll=openEnded(),activityMax=declaration.type==='melee'?100:60,penalty=criticalModifier(value);
    const modified=roll.total+weapon.bonus-foe.db+phaseModifier(declaration.phase)-Math.max(0,activityMax-declaration.activity)+declaration.modifier+penalty;
    try {
      const table=await loadTable(code),regular=table.rows.filter(row=>!row.unmodified);
      const row=regular.find(item=>{const [a,b]=item.roll.split('-');return modified>=(a==='XX'?-Infinity:Number(a))&&modified<=Number(b||a);})||(modified>150?regular[0]:regular.at(-1));
      const column=table.columns.findIndex(item=>item.label===`AT ${foe.at}`);
      const result=row?.values[column]||'–';
      const hits=Number(/^\d+/.exec(result)?.[0])||0;
      foeToken.hits=foe.hitsMax>0?Math.min(foe.hitsMax,Math.max(0,foeToken.hits||0)+hits):Math.max(0,foeToken.hits||0)+hits;
      const critical=/[A-E]/.exec(result)?.[0];
      const criticalTable=code==='A-10.9.1'||code==='A-10.9.3'?'A-10.10.3':code==='A-10.9.2'?'A-10.10.5':'A-10.10.4';
      const actionPenalty=phaseModifier(declaration.phase)-Math.max(0,activityMax-declaration.activity);
      let criticalText='',fumbleText='';
      if(critical){
        const outcome=await narrativeRoll(criticalTable,critical.charCodeAt(0)-65,`${critical} critical`,0,{who:foe,value:foeToken});
        addCriticalEffects(foeToken,value,outcome.effects);
        criticalText=` · ${outcome.html}${outcome.effects.length?' · critical effects applied':''}`;
      }
      if(roll.first<=2||result==='F')fumbleText=` · ${(await narrativeRoll('A-10.11.1',weaponFumbleColumn(weapon.category),'weapon fumble')).html}`;
      return `${esc(weapon.name)} vs ${esc(foe.name)}: ${diceText(roll)} ${roll.total} + ${weapon.bonus} OB − ${foe.db} DB ${actionPenalty>=0?'+':'−'} ${Math.abs(actionPenalty)} action ${declaration.modifier>=0?'+':'−'} ${Math.abs(declaration.modifier)} other${penalty?` ${penalty} critical modifier`:''} = ${modified}. ${tableLink(code)} result <strong>${esc(result)}</strong>${hits?` · ${hits} hits applied`:''}${criticalText}${fumbleText}.`;
    } catch { return `Attack roll ${modified}. ${esc(code)} could not be loaded; use the Tables page.`; }
  }
  async function spellAttackResult(who,declaration,spellSkill) {
    const foe=actor(declaration.target),foeToken=token(declaration.target);
    if(!foe||!foeToken||!within(foeToken.q,foeToken.r))return 'Choose and place a spell target to resolve its attack.';
    const origin=token(who.id);
    if(!origin||!within(origin.q,origin.r))return 'Place the caster on the map first.';
    const penalty=criticalModifier(origin);
    if(declaration.range&&distance(origin,foeToken)*state.scale>declaration.range)return 'Spell target is outside the selected range.';
    if(lineTo(origin,foeToken).slice(0,-1).some(hex=>state.terrain[keyOf(hex.q,hex.r)]==='blocked'))return 'Blocked terrain obscures the spell target.';
    const kind=declaration.spellAttack,code=kind==='basic'?'A-10.9.11':kind==='bolt'?'A-10.9.9':'A-10.9.10';
    try {
      const table=await loadTable(code);
      const first=d100(),unmodified=table.rows.some(item=>item.unmodified&&rollInRow(item.roll,first));
      const dice=[first];
      if(!unmodified&&(first<=5||first>=96)) {let next;do {next=d100();dice.push(first<=5?-next:next);}while(next>=96);}
      const roll={first,dice,total:dice.reduce((sum,item)=>sum+item,0),unmodified};
      if(kind==='basic') {
        const modified=roll.total+penalty;
        const regular=table.rows.filter(item=>!item.unmodified&&/^\d{2}(?:-\d{2})?$/.test(item.roll));
        const row=(unmodified&&table.rows.find(item=>item.unmodified&&rollInRow(item.roll,first)))||regular.find(item=>rollInRow(item.roll,modified))||(modified>95?regular[0]:regular.at(-1));
        const possible=table.columns.map((column,index)=>({column,index})).filter(({column})=>column.group===who.realm&&(column.label==='Other'||column.label==='Metal armor'&&foe.at>=13||column.label==='Leather armor'&&foe.at>=5&&foe.at<=12||column.label==='Metal shield'&&foe.shieldBonus>0));
        const chosen=possible.sort((a,b)=>(Number(row.values[b.index])||0)-(Number(row.values[a.index])||0))[0];
        if(row.values[chosen?.index] === 'F')return `Basic spell vs ${esc(foe.name)}: ${diceText(roll)}${penalty?` ${penalty} critical modifier`:''} → ${modified}. <strong>Spell failure</strong> · ${tableLink(code)} · ${(await narrativeRoll('A-10.11.2',spellFailureColumn(spellSkill,kind),'spell failure')).html}.`;
        const rrModifier=Number(row?.values[chosen?.index??table.columns.findIndex(column=>column.group===who.realm&&column.label==='Other')])||0;
        const resist=openEnded(),resistType=who.realm.toLowerCase(),sameRealm=foe.realm===who.realm?15:0;
        const rrTotal=resist.total+(foe.resistances[resistType]||0)+rrModifier+sameRealm;
        const threshold=resistanceThreshold(who.level,foe.level);
        return `Basic spell vs ${esc(foe.name)}: ${diceText(roll)}${penalty?` ${penalty} critical modifier`:''} → ${modified}: ${rrModifier} RR modifier (${tableLink(code)}). ${esc(foe.name)} resists: ${diceText(resist)} → ${rrTotal}, needs ${threshold}; <strong>${rrTotal>=threshold?'resisted':'affected'}</strong> · ${tableLink('T-3.4')}.`;
      }
      const bonus=kind==='bolt'?(who.skills.find(item=>item.category==='Directed Spells'&&item.ranks>0)?.bonus||0):spellSkill.ranks;
      const modified=roll.total+bonus-foe.db+declaration.modifier+penalty;
      const regular=table.rows.filter(item=>!item.unmodified);
      const row=(unmodified&&table.rows.find(item=>item.unmodified&&rollInRow(item.roll,first)))||regular.find(item=>rollInRow(item.roll,modified))||(modified>150?regular[0]:regular.at(-1));
      const column=table.columns.findIndex(item=>item.label===`AT ${foe.at}`),result=row?.values[column]||'–';
      const hits=Number(/^\d+/.exec(result)?.[0])||0;
      foeToken.hits=foe.hitsMax>0?Math.min(foe.hitsMax,(foeToken.hits||0)+hits):(foeToken.hits||0)+hits;
      const failure=result==='F'?` · ${(await narrativeRoll('A-10.11.2',spellFailureColumn(spellSkill,kind),'spell failure')).html}`:'';
      return `${kind} spell vs ${esc(foe.name)}: ${diceText(roll)} + ${bonus} OB − ${foe.db} DB ${declaration.modifier>=0?'+':'−'} ${Math.abs(declaration.modifier)} other${penalty?` ${penalty} critical modifier`:''} = ${modified}. ${tableLink(code)} result <strong>${esc(result)}</strong>${hits?` · ${hits} hits applied`:''}${/[A-E]/.test(result)?' · resolve the critical type named by the spell in Tables':''}${failure}.`;
    }catch{return `${kind} spell attack table could not be loaded; use the Tables page.`;}
  }
  async function resolveAction(id,declaration) {
    const who=actor(id),value=token(id); if(!who||!value) return;
    const statuses=value.statuses||[];
    if((statuses.includes('Dead')||statuses.includes('Unconscious'))&&declaration.type!=='resist') {
      appendLog(id,`${esc(declaration.description||declaration.type)} cannot be performed while ${statuses.includes('Dead')?'dead':'unconscious'}.`);
      return;
    }
    const stunned=statuses.includes('Stunned')||criticalRounds(value,'stun')>0||criticalRounds(value,'stunNoParry')>0;
    const parryOnly=criticalRounds(value,'stunNoParry')>0||criticalRounds(value,'noParry')>0||criticalRounds(value,'mustParry')>0;
    if((stunned||parryOnly)&&!['move','moving','static','resist'].includes(declaration.type)) {
      appendLog(id,`${esc(declaration.description||declaration.type)} cannot be performed while ${stunned?'stunned':'restricted by a parry critical'}.`);
      return;
    }
    const conditionModifier=parryOnly?-75:stunned?-50+3*(who.stats?.[4]||0):0;
    const skill=declaration.skill==='stat'?null:who.skills[Number(declaration.skill)];
    const skillBonus=declaration.skill==='stat'?3*(who.stats[declaration.statIndex]||0):skill?.bonus||0;
    const phase=phaseModifier(declaration.phase),modifier=declaration.modifier||0,penalty=criticalModifier(value);
    const targetText=declaration.targetHex?` at hex ${declaration.targetHex.q},${declaration.targetHex.r}`:declaration.target?` vs ${esc(actor(declaration.target)?.name||'target')}`:'';
    let detail='';
    if(declaration.type==='simple') detail=`${esc(declaration.description||'Simple action')}${targetText} · ${declaration.activity}% activity.`;
    else if(['melee','missile'].includes(declaration.type)) detail=await attackResult(who,value,declaration);
    else if(declaration.type==='static') {
      const roll=openEnded(true),total=roll.unmodified?roll.total:roll.total+skillBonus+staticDifficulty[difficulties.indexOf(declaration.difficulty)]+phase+modifier+penalty+conditionModifier-(100-declaration.activity);
      const outcome=staticResult(total,roll.unmodified);
      detail=`${esc(declaration.description||skill?.name||'Static maneuver')}${targetText}: ${diceText(roll)}${penalty&&!roll.unmodified?` ${penalty} critical modifier`:''}${conditionModifier&&!roll.unmodified?` ${conditionModifier} condition`:''} → ${total}. <strong>${outcome}</strong> · ${tableLink('T-4.3')}. ${esc(staticNarrative(outcome))}`;
    } else if(declaration.type==='moving') {
      const roll=openEnded(),total=roll.total+skillBonus+phase+modifier+penalty+conditionModifier;
      const result=moveResult(total,declaration.difficulty);
      detail=`${esc(declaration.description||skill?.name||'Moving maneuver')}${targetText}: ${diceText(roll)}${penalty?` ${penalty} critical modifier`:''}${conditionModifier?` ${conditionModifier} condition`:''} → ${total} (${esc(declaration.difficulty)}). <strong>${result===null?'Special result; consult table':`${result}%`}</strong> · ${tableLink('T-4.1')}.`;
    } else if(declaration.type==='move') {
      if(!declaration.destination||value.q==null) {detail='Movement needs a placed character and destination.';}
      else {
        const pace=Number(declaration.pace)||1;
        let rate=who.baseMove*pace*declaration.activity/100,rollText='';
        if(pace>=3) {
          const difficulty=pace===3?'Easy':pace===4?'Light':'Medium';
          const sprint=who.skills.find(item=>item.name==='Sprinting');
          const roll=openEnded(),total=roll.total+(sprint?.bonus||0)+modifier+penalty+conditionModifier;
          const result=moveResult(total,difficulty);
          if(result===null) {detail=`Movement maneuver ${diceText(roll)} → ${total}. Special result; consult ${tableLink('T-4.1')} before moving.`;appendLog(id,detail);return;}
          rate*=result/100;rollText=` · ${diceText(roll)}${penalty?` ${penalty} critical modifier`:''}${conditionModifier?` ${conditionModifier} condition`:''} → ${total} (${result}%)`;
        }
        const path=lineTo(value,declaration.destination);let budget=rate;
        for(const hex of path) {const terrain=state.terrain[keyOf(hex.q,hex.r)]||'clear';const cost=state.scale*(terrain==='difficult'?2:1);if(terrain==='blocked'||budget<cost)break;value.q=hex.q;value.r=hex.r;budget-=cost;}
        detail=`Move at ${pace}× pace, ${declaration.activity}% activity: ${Math.round(rate)} ft available${rollText}. Reached hex ${value.q},${value.r} · ${tableLink('T-3.2','activity rules')}.`;
      }
    } else if(declaration.type==='spell') {
      if(!skill||declaration.spellLevel>skill.ranks||declaration.spellLevel>who.ppMax-(value.pp||0)) detail='Spell cannot be cast: insufficient list ranks or power points.';
      else {
        const diff=who.level-declaration.spellLevel;
        const prep=spellPreparation(diff,declaration.preparation,declaration.instant);
        const used=who.ppMax?(value.pp||0)/who.ppMax:0;
        const power=used>.75?-30:used>.5?-20:used>.25?-10:0;
        const snap=declaration.phase==='snap'&&!declaration.instant?-20:0;
        const armor=who.realm==='Essence'&&who.at>4?who.at<=6?-10:who.at<=8?-20:who.at<=10?-25:-40:0;
        const list=skill.category.includes('Own Base')?10:skill.category.includes('Open Lists')?5:0;
        const mods=prep+power+snap+armor+list+modifier+penalty+(declaration.phase==='deliberate'?10:0);
        value.pp=(value.pp||0)+declaration.spellLevel;
        let cast=false;
        if([prep,power,snap,armor,modifier,penalty].some(number=>number<0)) {
          const roll=openEnded(true),total=roll.unmodified?roll.total:roll.total+skill.bonus+mods;
          const outcome=spellResult(total,roll.unmodified);
          cast=['Success','Absolute success','Unusual success'].includes(outcome);
          const failure=/failure/i.test(outcome)?` · ${(await narrativeRoll('A-10.11.2',spellFailureColumn(skill,declaration.spellAttack),'spell failure',-mods*(outcome==='Spectacular failure'?3:outcome==='Absolute failure'?2:1))).html}`:'';
          detail=`${esc(declaration.description||skill.name)}${targetText} (level ${declaration.spellLevel}): ${diceText(roll)}${penalty&&!roll.unmodified?` ${penalty} critical modifier`:''} → ${total}. <strong>${outcome}</strong> · ${tableLink('T-4.5')}. ${esc(spellNarrative(outcome))}${failure} ${declaration.spellLevel} PP used.`;
        } else {const roll=d100(),failed=roll<=2;cast=!failed;const failure=failed?` · ${(await narrativeRoll('A-10.11.2',spellFailureColumn(skill,declaration.spellAttack),'spell failure')).html}`:'';detail=`${esc(declaration.description||skill.name)}${targetText} (level ${declaration.spellLevel}): automatic cast check ${roll}. <strong>${failed?'Fails':'Cast'}</strong> · ${declaration.spellLevel} PP used${failure}.`;}
        if(cast&&declaration.spellAttack==='ball'&&declaration.targetHex) {
          const caster=token(who.id),center=declaration.targetHex;
          if(!caster||!within(caster.q,caster.r)||declaration.range&&distance(caster,center)*state.scale>declaration.range)detail+=' Ball spell center is out of range.';
          else {
            const radius=Math.max(0,Number(declaration.areaRadius)||0);
            const targets=Object.keys(state.tokens).filter(id=>{const item=token(id);return within(item.q,item.r)&&distance(item,center)*state.scale<=radius;});
            detail+=targets.length?` Area centered on hex ${center.q},${center.r} (${radius} ft): ${ (await Promise.all(targets.map(id=>spellAttackResult(who,{...declaration,target:id,range:0},skill)))).join(' ')}`:` No characters are within ${radius} ft of hex ${center.q},${center.r}.`;
          }
        } else if(cast&&declaration.spellAttack!=='none')detail+=` ${await spellAttackResult(who,declaration,skill)}`;
      }
    } else if(declaration.type==='resist') {
      const roll=openEnded(),bonus=who.resistances[declaration.resistance]||0;
      const total=roll.total+bonus+modifier,threshold=resistanceThreshold(declaration.attackLevel,who.level);
      detail=`${esc(declaration.resistance)} resistance vs level ${declaration.attackLevel}: ${diceText(roll)} + ${bonus}${modifier?` ${modifier>=0?'+':''}${modifier}`:''} = ${total}; need ${threshold}. <strong>${total>=threshold?'Resisted':'Failed'}</strong> · ${tableLink('T-3.4')}.`;
    }
    appendLog(id,detail);
  }
  function readDraft(phaseForm,changed='') {
    const who=actor(phaseForm.dataset.actor),phase=phaseForm.dataset.phase,draft=draftFor(who.id,phase),data=new FormData(phaseForm);
    const oldChoice=draft.choice,oldAttack=draft.spellAttack,oldTargetKind=draft.targetKind;
    draft.choice=String(data.get('choice')||'none');
    if(data.has('activity'))draft.activity=Number(data.get('activity'));
    if(data.has('maneuver'))draft.maneuver=String(data.get('maneuver'));
    if(data.has('difficulty'))draft.difficulty=String(data.get('difficulty'));
    if(data.has('statIndex'))draft.statIndex=Number(data.get('statIndex'));
    if(data.has('pace'))draft.pace=Number(data.get('pace'));
    if(data.has('spellLevel'))draft.spellLevel=Number(data.get('spellLevel'));
    if(data.has('preparation'))draft.preparation=Number(data.get('preparation'));
    if(data.has('spellAttack'))draft.spellAttack=String(data.get('spellAttack'));
    if(data.has('areaRadius'))draft.areaRadius=Number(data.get('areaRadius'));
    if(draftType(draft,who)==='spell')draft.instant=data.has('instant');
    if(data.has('resistance'))draft.resistance=String(data.get('resistance'));
    if(data.has('attackLevel'))draft.attackLevel=Number(data.get('attackLevel'));
    if(data.has('targetKind'))draft.targetKind=String(data.get('targetKind'));
    if(data.has('modifier'))draft.modifier=Number(data.get('modifier'));
    if(data.has('range'))draft.range=String(data.get('range'));
    if(data.has('description'))draft.description=String(data.get('description')).trim();
    if(changed==='choice'&&oldChoice!==draft.choice){draft.activity=defaultActivity[draftType(draft,who)]??0;draft.target='';draft.hex=null;draft.targetKind='none';draft.spellAttack='none';draft.areaRadius=0;draft.range='';draft.description='';draft.modifier=0;draft.instant=false;}
    if(changed==='spellAttack'&&oldAttack!==draft.spellAttack){draft.target='';draft.hex=null;}
    if(changed==='targetKind'&&oldTargetKind!==draft.targetKind){draft.target='';draft.hex=null;}
    if(changed==='instant'&&draftType(draft,who)==='spell')draft.activity=draft.instant?10:75;
    state.drafts=drafts;save();
    return draft;
  }
  function compilePhaseAction(who,phase,draft) {
    const value=token(who.id),type=draftType(draft,who);
    if(type==='none')return {action:null};
    const activity=Number(draft.activity);
    if(!Number.isInteger(activity)||activity<0||activity>100)return {error:'Activity must be from 0 to 100%.'};
    if(type==='move'&&activity>({snap:20,normal:50,deliberate:80}[phase]))return {error:`${phase} movement cannot exceed ${({snap:20,normal:50,deliberate:80}[phase])}% activity.`};
    if(type==='melee'&&activity<60||type==='missile'&&(activity<30||activity>60)||type==='static'&&activity<50)return {error:'This action is outside its allowed activity range.'};
    if(type==='spell'&&activity<(draft.instant?10:75))return {error:`Spell casting needs at least ${draft.instant?10:75}% activity.`};
    const skillIndex=Number(draft.choice.split(':')[1]);
    if(['melee','missile'].includes(type)&&!who.attacks[skillIndex]||['static','moving','spell'].includes(type)&&draft.choice!=='stat'&&!who.skills[skillIndex])return {error:'Choose an available skill or attack item.'};
    const kind=targetKindFor(draft,who);
    if(kind==='creature'&&(!draft.target||!validCreature(draft.target,draft,who,value)))return {error:'Tap a highlighted creature on the map first.'};
    if(kind==='hex'&&(!draft.hex||!validHex(draft.hex.q,draft.hex.r,draft,who,value)))return {error:'Tap a highlighted hex on the map first.'};
    return {action:{phase,type,activity,skill:draft.choice==='stat'?'stat':skillIndex,statIndex:Number(draft.statIndex)||0,target:kind==='creature'?draft.target:'',targetHex:kind==='hex'&&type!=='move'?{...draft.hex}:null,difficulty:draft.difficulty,pace:Number(draft.pace)||1,spellLevel:Number(draft.spellLevel)||1,preparation:Number(draft.preparation)||0,instant:!!draft.instant,spellAttack:draft.spellAttack||'none',areaRadius:Math.max(0,Number(draft.areaRadius)||0),resistance:draft.resistance,attackLevel:Number(draft.attackLevel)||1,modifier:Number(draft.modifier)||0,range:Number(draft.range)||0,description:draft.description,destination:type==='move'?{...draft.hex}:null}};
  }
  function prepareRoundActions() {
    for(const form of $('#encounter-phase-cards').querySelectorAll('form'))readDraft(form);
    let any=false;
    for(const [id,value] of orderedActors()) {
      const who=actor(id),actions={};let used=0,spells=0;
      for(const phase of phases) {
        const {action,error}=compilePhaseAction(who,phase,draftFor(id,phase));
        if(error){state.selected=id;activePhase=phase;message(`${who.name} · ${phase}: ${error}`);returnToActivePhase();return false;}
        if(action){actions[phase]=action;used+=action.activity;any=true;if(action.type==='spell')spells++;}
      }
      if(used>100){message(`${who.name} would use ${used}% activity this round.`);return false;}
      if(spells>1){message(`${who.name} can cast only one spell per round.`);return false;}
      value.actions=actions;
    }
    if(!any){message('Choose at least one phase action before resolving.');return false;}
    ensureInitiative();save();return true;
  }
  async function resolveRound() {
    if(resolving)return;
    if(!Object.keys(state.tokens).length)return message('Add a character before resolving a round.');
    if(state.phase<0&&!prepareRoundActions())return;
    resolving=true;
    try {
      if(state.phase<0){Object.values(state.tokens).forEach(value=>{value.activityThisRound=0;});state.phase=0;state.resolved=false;appendLog('',`Initiative rolled · ${tableLink('T-3.1','round sequence')}.`);save();render();}
      const order=Object.entries(state.tokens).sort((a,b)=>(b[1].initiative||0)-(a[1].initiative||0));
      for(let index=state.phase;index<phases.length;index++) {
        state.phase=index;
        if(!state.resolved){for(const [id,value] of order)if(value.actions?.[phases[index]]){const action=value.actions[phases[index]];await resolveAction(id,action);value.activityThisRound=(value.activityThisRound||0)+action.activity;}}
        state.resolved=false;save();render();
      }
      const completedRound=state.round;state.round++;state.phase=-1;state.resolved=false;advanceCriticalEffects(completedRound);
      Object.values(state.tokens).forEach(value=>{value.actions={};value.surprised=false;delete value.activityThisRound;});
      drafts={};state.drafts=drafts;ensureInitiative(true);save();render();message(`Round ${state.round-1} resolved. Plan the next round.`);
    } catch(error){message(`Could not finish the round: ${error.message||error}`);}
    finally {resolving=false;render();}
  }
  $('#encounter-map').addEventListener('click',event=>{
    if(resolving)return;
    const who=selected(),origin=token(state.selected),draft=who?draftFor(who.id,activePhase):null;
    const kind=draft&&state.phase<0&&!placingActorId?targetKindFor(draft,who):'none';
    const piece=event.target.closest('[data-token]'),cell=event.target.closest('[data-hex]');
    if(!piece&&!cell)return;
    const targetId=piece?.dataset.token;
    const position=piece?token(targetId):(()=>{const[q,r]=cell.dataset.hex.split(',').map(Number);return{q,r};})();
    const {q,r}=position;
    if(placingActorId){
      const placing=token(placingActorId);if(!placing)return;
      if(state.terrain[keyOf(q,r)]==='blocked')return message('That hex is blocked.');
      placing.q=q;placing.r=r;state.selected=placingActorId;placingActorId='';save();render();return message(`${selected()?.name||'Character'} placed at hex ${q},${r}.`);
    }
    if(origin&&!within(origin.q,origin.r)&&who){if(state.terrain[keyOf(q,r)]==='blocked')return message('That hex is blocked.');origin.q=q;origin.r=r;save();render();return;}
    if(kind==='creature') {
      const candidate=targetId||Object.keys(state.tokens).find(id=>token(id)?.q===q&&token(id)?.r===r&&validCreature(id,draft,who,origin));
      if(!candidate||!validCreature(candidate,draft,who,origin))return message('Choose a highlighted creature.');
      draft.target=candidate;draft.hex=null;state.drafts=drafts;save();renderPhaseCards();renderMap();returnToActivePhase();return message(`${actor(candidate)?.name||'Creature'} selected as the ${activePhase} target.`);
    }
    if(kind==='hex') {
      if(!validHex(q,r,draft,who,origin))return message('Choose a highlighted hex.');
      draft.hex={q,r};draft.target='';state.drafts=drafts;save();renderPhaseCards();renderMap();returnToActivePhase();return message(`Hex ${q},${r} selected for the ${activePhase} action.`);
    }
    if(piece){state.selected=targetId;save();render();return;}
    const tool=$('#encounter-map-tool').value;
    if(['clear','difficult','blocked'].includes(tool)){if(tool==='clear')delete state.terrain[keyOf(q,r)];else state.terrain[keyOf(q,r)]=tool;save();render();return;}
    if(!origin)return message('Add and select a character first.');
    if(state.terrain[keyOf(q,r)]==='blocked')return message('That hex is blocked.');
    origin.q=q;origin.r=r;save();render();
  });
  $('#encounter-character-buttons').addEventListener('click',event=>{const button=event.target.closest('[data-toggle-character]');if(button)toggleCharacter(button.dataset.toggleCharacter);});
  $('#encounter-phase-cards').addEventListener('focusin',event=>{
    const form=event.target.closest('form');if(!form)return;
    if(state.selected===form.dataset.actor&&activePhase===form.dataset.phase)return;
    state.selected=form.dataset.actor;activePhase=form.dataset.phase;save();
    document.querySelectorAll('.encounter-phase-card').forEach(card=>card.classList.toggle('active',card.contains(form)));
    renderMap();
  });
  $('#encounter-phase-cards').addEventListener('input',event=>{
    const form=event.target.closest('form');if(!form||event.target.tagName==='SELECT')return;
    state.selected=form.dataset.actor;activePhase=form.dataset.phase;readDraft(form);renderMap();
  });
  $('#encounter-phase-cards').addEventListener('change',event=>{
    const card=event.target.closest('[data-actor-card]');if(!card)return;
    const id=card.dataset.actorCard,value=token(id);if(!value)return;
    const form=event.target.closest('form');
    if(form){state.selected=id;activePhase=form.dataset.phase;readDraft(form,event.target.name);ensureInitiative();save();renderPhaseCards();renderMap();return;}
    if(event.target.dataset.vital){const who=actor(id),max=event.target.dataset.vital==='hits'?who.hitsMax:who.ppMax;value[event.target.dataset.vital]=Math.max(0,Math.min(max,Number(event.target.value)||0));}
    if(event.target.hasAttribute('data-initiative-mod'))value.initiativeMod=Number(event.target.value)||0;
    ensureInitiative();save();renderPhaseCards();renderMap();
  });
  $('#encounter-phase-cards').addEventListener('click',event=>{
    const clear=event.target.closest('[data-clear-effect]');
    if(clear){
      if(resolving||state.phase>=0)return;
      const id=clear.closest('[data-actor-card]').dataset.actorCard,value=token(id);if(!value)return;
      value.criticalEffects=(value.criticalEffects||[]).filter(effect=>effect.id!==clear.dataset.clearEffect);
      updateStunConsciousness(value);
      ensureInitiative();save();renderPhaseCards();return;
    }
    const status=event.target.closest('[data-status]');
    if(status){
      if(resolving||state.phase>=0)return;
      const id=status.closest('[data-actor-card]').dataset.actorCard,value=token(id),name=status.dataset.status;
      if(!value)return;
      if(name==='Surprised')value.surprised=!value.surprised;
      else {value.statuses=Array.isArray(value.statuses)?value.statuses:[];value.statuses=value.statuses.includes(name)?value.statuses.filter(item=>item!==name):[...value.statuses,name];}
      ensureInitiative();save();renderPhaseCards();renderMap();return;
    }
    const place=event.target.closest('[data-place-actor]');
    if(place){placingActorId=place.dataset.placeActor;state.selected=placingActorId;$('#encounter-map-tool').value='position';save();renderMap();$('#encounter-map').scrollIntoView({behavior:'smooth',block:'center'});return;}
    const button=event.target.closest('[data-focus-target]');if(!button)return;
    state.selected=button.closest('[data-actor-card]').dataset.actorCard;activePhase=button.dataset.focusTarget;save();renderMap();$('#encounter-map').scrollIntoView({behavior:'smooth',block:'center'});
  });
  $('#encounter-scale').addEventListener('change',event=>{state.scale=Number(event.target.value);save();render();});
  $('#encounter-map-tool').addEventListener('change',renderMap);
  $('#encounter-log').addEventListener('click',event=>{const button=event.target.closest('[data-table]');if(button)window.RolemasterEncounter?.openTable(button.dataset.table);});
  $('#encounter-resolve-round').addEventListener('click',resolveRound);
  $('#encounter-reset').addEventListener('click',showList);
  $('#new-encounter-form').addEventListener('submit',event=>{
    event.preventDefault();
    const name=String(new FormData(event.currentTarget).get('name')||'').trim();if(!name)return;
    const id=crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`;
    encounters.push({id,name,updatedAt:Date.now(),state:blankState()});
    persist();event.currentTarget.reset();openEncounter(id);
  });
  $('#encounter-list').addEventListener('click',event=>{
    const open=event.target.closest('[data-open-encounter]'),remove=event.target.closest('[data-delete-encounter]');
    if(open){openEncounter(open.dataset.openEncounter);return;}
    if(remove){const item=encounters.find(entry=>entry.id===remove.dataset.deleteEncounter);if(!item)return;if(!confirm(`Delete ${item.name}? This removes its map, round, and action log.`))return;encounters=encounters.filter(entry=>entry.id!==item.id);persist();renderList();}
  });
  window.addEventListener('rolemaster-view-changed',event=>{if(event.detail==='encounter')showList();});
  window.addEventListener('rolemaster-roster-updated',refreshRoster);
  refreshRoster();
})();
