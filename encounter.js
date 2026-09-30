(() => {
  const storageKey = 'rolemaster-encounter-v1';
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const phases = ['snap','normal','deliberate'];
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
  const readState = () => {
    try { const saved = JSON.parse(localStorage.getItem(storageKey) || '{}'); return {round:Math.max(1,Number(saved.round)||1),phase:Number.isInteger(saved.phase)?saved.phase:-1,resolved:!!saved.resolved,scale:[5,10,20,50].includes(Number(saved.scale))?Number(saved.scale):5,terrain:saved.terrain||{},tokens:saved.tokens||{},selected:saved.selected||'',log:Array.isArray(saved.log)?saved.log:[]}; }
    catch { return {round:1,phase:-1,resolved:false,scale:5,terrain:{},tokens:{},selected:'',log:[]}; }
  };
  let state = readState();
  let destination = null;
  let roster = [];
  const form = $('#encounter-action-form');
  const spellAttackField = document.createElement('label');
  spellAttackField.className = 'encounter-field-spell';
  spellAttackField.innerHTML = 'Spell attack<select name="spellAttack"><option value="none">No attack</option><option value="basic">Basic spell</option><option value="bolt">Bolt</option><option value="ball">Ball</option></select>';
  form.querySelector('.encounter-field-resist').before(spellAttackField);
  const save = () => localStorage.setItem(storageKey, JSON.stringify(state));
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
  function appendLog(id, detail) {
    state.log.unshift({round:state.round,phase:state.phase<0?'Declaration':phases[state.phase],actor:actor(id)?.name||'GM',detail});
    state.log = state.log.slice(0,80);
  }
  function refreshRoster() {
    roster = window.RolemasterEncounter?.roster() || [];
    Object.keys(state.tokens).filter(id => !actor(id)).forEach(id => delete state.tokens[id]);
    if (!state.tokens[state.selected]) state.selected = Object.keys(state.tokens)[0] || '';
    save(); render(); selectPhase(form.elements.phase.value);
  }
  function renderMap() {
    const vertices = Array.from({length:6},(_,index)=>{ const angle = Math.PI/180*(60*index-30); return `${(size*Math.cos(angle)).toFixed(1)},${(size*Math.sin(angle)).toFixed(1)}`; }).join(' ');
    const cells = [];
    for (let r=0;r<rows;r++) for (let q=0;q<columns;q++) {
      const x=xOf(q,r),y=yOf(r),terrain=state.terrain[keyOf(q,r)]||'clear';
      const aimed = destination?.q===q && destination?.r===r;
      cells.push(`<g data-hex="${q},${r}" class="encounter-hex ${terrain}${aimed?' destination':''}" transform="translate(${x},${y})"><polygon points="${vertices}"></polygon>${terrain!=='clear'?`<text text-anchor="middle" y="4">${terrain==='blocked'?'■':'◆'}</text>`:''}</g>`);
    }
    const placed = Object.entries(state.tokens).filter(([,value])=>within(value.q,value.r));
    const pieces = placed.map(([id,value],index)=>{
      const who=actor(id); if(!who) return '';
      const stacked=placed.filter(([,item])=>item.q===value.q&&item.r===value.r).findIndex(([other])=>other===id);
      const x=xOf(value.q,value.r)+(stacked%2)*12-6,y=yOf(value.r)+Math.floor(stacked/2)*13;
      return `<g data-token="${esc(id)}" class="encounter-token${id===state.selected?' selected':''}" transform="translate(${x},${y})"><circle r="17"></circle><text text-anchor="middle" y="4">${esc(who.name.slice(0,2).toUpperCase())}</text><title>${esc(who.name)}</title></g>`;
    }).join('');
    $('#encounter-map').setAttribute('viewBox','0 0 970 480');
    $('#encounter-map').innerHTML=cells.join('')+pieces;
    $('#encounter-map-status').textContent=selected()?`${selected().name}${token(state.selected)?.q!=null?` · hex ${token(state.selected).q},${token(state.selected).r}`:' · tap a hex to place'}${destination?` · destination ${destination.q},${destination.r} (${token(state.selected)?.q!=null?distance(token(state.selected),destination)*state.scale:0} ft)`:''}`:'Add a character to start.';
  }
  function renderRoster() {
    $('#encounter-roster').innerHTML=roster.length?roster.map(who=>{
      const active=!!token(who.id);
      return `<div class="encounter-roster-row${who.id===state.selected?' selected':''}"><button type="button" data-select="${esc(who.id)}"${active?'':' disabled'}><strong>${esc(who.name)}</strong><small>Level ${who.level} · ${esc(who.profession)}</small></button><button type="button" data-toggle="${esc(who.id)}" aria-label="${active?'Remove':'Add'} ${esc(who.name)}">${active?'Remove':'Add'}</button></div>`;
    }).join(''):'<p class="play-muted">Create a character first.</p>';
    const who=selected(),value=who&&token(who.id);
    $('#encounter-selected').innerHTML=who&&value?`<h3>${esc(who.name)}</h3><div class="encounter-vitals"><label>Hits taken<input type="number" min="0" max="${Math.max(0,who.hitsMax)}" data-vital="hits" value="${value.hits||0}"></label><span>/ ${who.hitsMax||'—'}</span><label>PP used<input type="number" min="0" max="${Math.max(0,who.ppMax)}" data-vital="pp" value="${value.pp||0}"></label><span>/ ${who.ppMax||'—'}</span></div><p>DB ${who.db} · AT ${who.at} · ${who.baseMove} ft/round</p><label class="encounter-status-toggle"><input type="checkbox" data-surprised ${value.surprised?'checked':''}> Surprised</label><label>Initiative modifier<input type="number" data-initiative-mod value="${value.initiativeMod||0}"></label>`:'';
  }
  function renderRound() {
    $('#encounter-round').textContent=`Round ${state.round}`;
    $('#encounter-phase').textContent=state.phase<0?'Declaration':`${phases[state.phase][0].toUpperCase()+phases[state.phase].slice(1)} phase`;
    $('#encounter-initiative').hidden=state.phase>=0;
    $('#encounter-resolve').hidden=state.phase<0||state.resolved;
    $('#encounter-next').hidden=state.phase<0||!state.resolved;
    $('#encounter-next').textContent=state.phase===2?'Next round':'Next phase';
    $('#encounter-round-note').textContent=state.phase<0?'Declare up to one snap, normal, and deliberate action per character.':state.resolved?'Phase resolved. Continue when ready.':'Resolve actions in initiative order.';
    const ordered=Object.entries(state.tokens).filter(([,value])=>value.initiative!=null).sort((a,b)=>b[1].initiative-a[1].initiative);
    $('#encounter-order').innerHTML=ordered.map(([id,value])=>`<div><span>${esc(actor(id)?.name||id)}</span><strong>${value.initiative}</strong></div>`).join('');
  }
  function renderGuide() {
    const tokens=Object.values(state.tokens);
    const declared=tokens.some(value=>Object.values(value.actions||{}).length);
    const step=state.phase>=0?'resolve':!tokens.length||tokens.some(value=>!within(value.q,value.r))?'place':declared?'initiative':'declare';
    document.querySelectorAll('[data-guide-step]').forEach(item=>item.classList.toggle('current',item.dataset.guideStep===step));
    $('#encounter-guide-current').textContent=!roster.length?'Create a character on the Characters page to begin.':step==='place'?'Next: add characters and place every token on a hex.':step==='declare'?'Next: select a character and declare what they will do.':step==='initiative'?'Next: declare more actions, or roll initiative when ready.':state.resolved?'Next: tap Next phase to continue.':'Next: tap Resolve phase to see the results.';
  }
  function renderActionForm() {
    const who=selected(),type=form.elements.type.value;
    for(const [field,show] of [['skill',['static','moving','melee','missile','spell'].includes(type)],['stat',['static','moving'].includes(type)&&form.elements.skill.value==='stat'],['target',['melee','missile','spell'].includes(type)],['difficulty',['static','moving'].includes(type)],['pace',type==='move'],['spell',type==='spell'],['resist',type==='resist']])
      document.querySelectorAll(`.encounter-field-${field}`).forEach(element=>element.hidden=!show);
    const skillSelect=form.elements.skill,old=skillSelect.value,oldTarget=form.elements.target.value;
    const skills=type==='melee'||type==='missile'?(who?.attacks||[]).map((item,index)=>({...item,index})).filter(item=>type==='missile'?['Weapon • Missile','Weapon • Thrown','Weapon • Missile Artillery'].includes(item.category):!['Weapon • Missile','Weapon • Missile Artillery'].includes(item.category))
      :type==='spell'?(who?.skills||[]).map((item,index)=>({...item,index})).filter(item=>item.category.startsWith('Spells •')&&item.ranks>0)
      :(who?.skills||[]).map((item,index)=>({...item,index})).filter(item=>item.ranks>0);
    skillSelect.innerHTML=(['static','moving'].includes(type)?'<option value="stat">No skill · 3× stat bonus</option>':'')+(skills.map(item=>`<option value="${item.index}">${esc(item.name)} · ${item.bonus>=0?'+':''}${item.bonus}</option>`).join('')||(['static','moving'].includes(type)?'':'<option value="">No matching skill or item</option>'));
    if ([...skillSelect.options].some(option=>option.value===old)) skillSelect.value=old;
    document.querySelectorAll('.encounter-field-stat').forEach(element=>{element.hidden=!['static','moving'].includes(type)||skillSelect.value!=='stat';});
    form.elements.target.innerHTML='<option value="">Choose target</option>'+Object.keys(state.tokens).filter(id=>id!==state.selected).map(id=>`<option value="${esc(id)}">${esc(actor(id)?.name||id)}</option>`).join('');
    if ([...form.elements.target.options].some(option=>option.value===oldTarget)) form.elements.target.value=oldTarget;
    $('#encounter-destination').textContent=type==='move'?(destination?`Destination: hex ${destination.q},${destination.r} · ${token(state.selected)?.q!=null?distance(token(state.selected),destination)*state.scale:0} ft`:'Choose Action destination in the map toolbar, then tap a hex.') : '';
    const help={simple:'For drawing a weapon, opening a door, or another action with no roll. Describe it below.',move:'Choose Action destination in the map toolbar and tap the destination hex. Movement happens when its phase resolves.',static:'For actions such as searching or picking a lock. Choose a skill and difficulty.',moving:'For risky movement such as climbing or jumping. Choose a skill and difficulty.',melee:'Choose an attack item and another character as the target. Put both tokens on the map.',missile:'Choose a ranged attack item and target. Enter range and cover adjustments in Other modifier.',spell:'Choose a known spell list, its spell level, and optionally an attack type and target.',resist:'Choose the resistance type and the level of the attack being resisted.'}[type];
    $('#encounter-action-help').textContent=!who?'Tap Add next to a saved character in the Characters panel first.':state.phase>=0?'Declarations are closed after initiative. Resolve the current phase and continue to the next round.':`${form.elements.phase.value[0].toUpperCase()+form.elements.phase.value.slice(1)} phase · ${help}`;
    $('#encounter-action-form').classList.toggle('locked',state.phase>=0);
  }
  function renderPhaseCards() {
    const who=selected(),value=who&&token(who.id),actions=value?.actions||{};
    $('#encounter-activity-used').textContent=`${Object.values(actions).reduce((sum,action)=>sum+action.activity,0)} / 100% activity`;
    $('#encounter-phase-cards').innerHTML=phases.map((phase,index)=>{
      const action=actions[phase],active=form.elements.phase.value===phase;
      const label=action?.description||({simple:'Simple action',move:'Movement',static:'Static maneuver',moving:'Moving maneuver',melee:'Melee attack',missile:'Missile attack',spell:'Cast spell',resist:'Resistance roll'}[action?.type]||'No action set');
      return `<article class="encounter-phase-card${active?' active':''}${state.phase===index?' current':''}"><div><strong>${index+1}. ${phase[0].toUpperCase()+phase.slice(1)}</strong><small>${index===0?'Acts early · −20':index===2?'Acts late · +10':'Acts normally'}</small></div><p>${esc(label)}${action?` · ${action.activity}% activity`:''}</p><button type="button" data-edit-phase="${phase}" ${who&& (state.phase<0||action)?'':'disabled'}>${action?state.phase<0?'View / edit action':'View action':'Set action'}</button></article>`;
    }).join('');
  }
  function selectPhase(phase,scroll=false) {
    if(!phases.includes(phase))return;
    form.reset();
    form.elements.phase.value=phase;
    const action=token(state.selected)?.actions?.[phase];
    destination=action?.destination?{...action.destination}:null;
    if(action) {
      form.elements.type.value=action.type;
      renderActionForm();
      for(const [field,key] of [['activity','activity'],['skill','skill'],['stat','statIndex'],['target','target'],['difficulty','difficulty'],['pace','pace'],['spellLevel','spellLevel'],['preparation','preparation'],['spellAttack','spellAttack'],['resistance','resistance'],['attackLevel','attackLevel'],['modifier','modifier'],['description','description']]) {
        if(form.elements[field]&&action[key]!=null)form.elements[field].value=String(action[key]);
      }
      form.elements.instant.checked=!!action.instant;
    }
    renderActionForm();renderPhaseCards();
    if(scroll){form.scrollIntoView({behavior:'smooth',block:'start'});form.elements.type.focus({preventScroll:true});}
  }
  function renderActions() {
    $('#encounter-actions').innerHTML=Object.entries(state.tokens).flatMap(([id,value])=>phases.flatMap(phase=>value.actions?.[phase]?[`<div class="encounter-declaration"><span><strong>${esc(actor(id)?.name||id)}</strong> · ${phase} · ${esc(value.actions[phase].type)} · ${value.actions[phase].activity}%</span>${state.phase<0?`<button type="button" data-remove-action="${esc(id)}" data-phase="${phase}">Remove</button>`:''}</div>`]:[])).join('')||'<p class="play-muted">No actions declared.</p>';
  }
  function renderLog() {
    $('#encounter-log').innerHTML=state.log.length?state.log.map(entry=>`<article><small>Round ${entry.round} · ${esc(entry.phase)} · ${esc(entry.actor)}</small><p>${entry.detail}</p></article>`).join(''):'<p class="play-muted">Resolved actions appear here.</p>';
  }
  function render() { renderMap();renderRoster();renderRound();renderGuide();renderActionForm();renderPhaseCards();renderActions();renderLog();$('#encounter-scale').value=String(state.scale); }
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
    const code=attackTables[weapon.category];
    if(!code) return 'No matching attack table for this item. Use the Tables page.';
    const roll=openEnded(),activityMax=declaration.type==='melee'?100:60;
    const modified=roll.total+weapon.bonus-foe.db+phaseModifier(declaration.phase)-Math.max(0,activityMax-declaration.activity)+declaration.modifier;
    try {
      const response=await fetch(`tables/${code}.json`); if(!response.ok) throw new Error('Table unavailable');
      const table=await response.json(),regular=table.rows.filter(row=>!row.unmodified);
      const row=regular.find(item=>{const [a,b]=item.roll.split('-');return modified>=(a==='XX'?-Infinity:Number(a))&&modified<=Number(b||a);})||(modified>150?regular[0]:regular.at(-1));
      const column=table.columns.findIndex(item=>item.label===`AT ${foe.at}`);
      const result=row?.values[column]||'–';
      const hits=Number(/^\d+/.exec(result)?.[0])||0;
      foeToken.hits=foe.hitsMax>0?Math.min(foe.hitsMax,Math.max(0,foeToken.hits||0)+hits):Math.max(0,foeToken.hits||0)+hits;
      const critical=/[A-E]/.exec(result)?.[0];
      const criticalTable=code==='A-10.9.1'||code==='A-10.9.3'?'A-10.10.3':code==='A-10.9.2'?'A-10.10.5':'A-10.10.4';
      const actionPenalty=phaseModifier(declaration.phase)-Math.max(0,activityMax-declaration.activity);
      return `${esc(weapon.name)} vs ${esc(foe.name)}: ${diceText(roll)} ${roll.total} + ${weapon.bonus} OB − ${foe.db} DB ${actionPenalty>=0?'+':'−'} ${Math.abs(actionPenalty)} action ${declaration.modifier>=0?'+':'−'} ${Math.abs(declaration.modifier)} other = ${modified}. ${tableLink(code)} result <strong>${esc(result)}</strong>${hits?` · ${hits} hits applied`:''}${critical?` · ${critical} critical; check ${tableLink(criticalTable,'critical table')}`:''}${roll.first<=2||result==='F'?` · check ${tableLink('A-10.11.1','weapon fumble')}`:''}.`;
    } catch { return `Attack roll ${modified}. ${esc(code)} could not be loaded; use the Tables page.`; }
  }
  async function spellAttackResult(who,declaration,spellSkill) {
    const foe=actor(declaration.target),foeToken=token(declaration.target);
    if(!foe||!foeToken||!within(foeToken.q,foeToken.r))return 'Choose and place a spell target to resolve its attack.';
    const kind=declaration.spellAttack,code=kind==='basic'?'A-10.9.11':kind==='bolt'?'A-10.9.9':'A-10.9.10';
    try {
      const response=await fetch(`tables/${code}.json`);if(!response.ok)throw new Error('Table unavailable');
      const table=await response.json();
      const first=d100(),unmodified=table.rows.some(item=>item.unmodified&&rollInRow(item.roll,first));
      const dice=[first];
      if(!unmodified&&(first<=5||first>=96)) {let next;do {next=d100();dice.push(first<=5?-next:next);}while(next>=96);}
      const roll={first,dice,total:dice.reduce((sum,item)=>sum+item,0),unmodified};
      if(kind==='basic') {
        const regular=table.rows.filter(item=>!item.unmodified&&/^\d{2}(?:-\d{2})?$/.test(item.roll));
        const row=(unmodified&&table.rows.find(item=>item.unmodified&&rollInRow(item.roll,first)))||regular.find(item=>rollInRow(item.roll,roll.total))||(roll.total>95?regular[0]:regular.at(-1));
        const possible=table.columns.map((column,index)=>({column,index})).filter(({column})=>column.group===who.realm&&(column.label==='Other'||column.label==='Metal armor'&&foe.at>=13||column.label==='Leather armor'&&foe.at>=5&&foe.at<=12||column.label==='Metal shield'&&foe.shieldBonus>0));
        const chosen=possible.sort((a,b)=>(Number(row.values[b.index])||0)-(Number(row.values[a.index])||0))[0];
        if(row.values[chosen?.index] === 'F')return `Basic spell vs ${esc(foe.name)}: ${diceText(roll)} → <strong>Spell failure</strong> · ${tableLink(code)} · ${tableLink('A-10.11.2','spell failure')}.`;
        const rrModifier=Number(row?.values[chosen?.index??table.columns.findIndex(column=>column.group===who.realm&&column.label==='Other')])||0;
        const resist=openEnded(),resistType=who.realm.toLowerCase(),sameRealm=foe.realm===who.realm?15:0;
        const rrTotal=resist.total+(foe.resistances[resistType]||0)+rrModifier+sameRealm;
        const threshold=resistanceThreshold(who.level,foe.level);
        return `Basic spell vs ${esc(foe.name)}: ${diceText(roll)} → ${rrModifier} RR modifier (${tableLink(code)}). ${esc(foe.name)} resists: ${diceText(resist)} → ${rrTotal}, needs ${threshold}; <strong>${rrTotal>=threshold?'resisted':'affected'}</strong> · ${tableLink('T-3.4')}.`;
      }
      const bonus=kind==='bolt'?(who.skills.find(item=>item.category==='Directed Spells'&&item.ranks>0)?.bonus||0):spellSkill.ranks;
      const modified=roll.total+bonus-foe.db+declaration.modifier;
      const regular=table.rows.filter(item=>!item.unmodified);
      const row=(unmodified&&table.rows.find(item=>item.unmodified&&rollInRow(item.roll,first)))||regular.find(item=>rollInRow(item.roll,modified))||(modified>150?regular[0]:regular.at(-1));
      const column=table.columns.findIndex(item=>item.label===`AT ${foe.at}`),result=row?.values[column]||'–';
      const hits=Number(/^\d+/.exec(result)?.[0])||0;
      foeToken.hits=foe.hitsMax>0?Math.min(foe.hitsMax,(foeToken.hits||0)+hits):(foeToken.hits||0)+hits;
      return `${kind} spell vs ${esc(foe.name)}: ${diceText(roll)} + ${bonus} OB − ${foe.db} DB ${declaration.modifier>=0?'+':'−'} ${Math.abs(declaration.modifier)} other = ${modified}. ${tableLink(code)} result <strong>${esc(result)}</strong>${hits?` · ${hits} hits applied`:''}${/[A-E]/.test(result)?' · resolve the critical type named by the spell in Tables':''}${result==='F'?` · ${tableLink('A-10.11.2','spell failure')}`:''}.`;
    }catch{return `${kind} spell attack table could not be loaded; use the Tables page.`;}
  }
  async function resolveAction(id,declaration) {
    const who=actor(id),value=token(id); if(!who||!value) return;
    const skill=declaration.skill==='stat'?null:who.skills[Number(declaration.skill)];
    const skillBonus=declaration.skill==='stat'?3*(who.stats[declaration.statIndex]||0):skill?.bonus||0;
    const phase=phaseModifier(declaration.phase),modifier=declaration.modifier||0;
    let detail='';
    if(declaration.type==='simple') detail=`${esc(declaration.description||'Simple action')} · ${declaration.activity}% activity.`;
    else if(['melee','missile'].includes(declaration.type)) detail=await attackResult(who,value,declaration);
    else if(declaration.type==='static') {
      const roll=openEnded(true),total=roll.unmodified?roll.total:roll.total+skillBonus+staticDifficulty[difficulties.indexOf(declaration.difficulty)]+phase+modifier-(100-declaration.activity);
      detail=`${esc(declaration.description||skill?.name||'Static maneuver')}: ${diceText(roll)} → ${total}. <strong>${staticResult(total,roll.unmodified)}</strong> · ${tableLink('T-4.3')}.`;
    } else if(declaration.type==='moving') {
      const roll=openEnded(),total=roll.total+skillBonus+phase+modifier;
      const result=moveResult(total,declaration.difficulty);
      detail=`${esc(declaration.description||skill?.name||'Moving maneuver')}: ${diceText(roll)} → ${total} (${esc(declaration.difficulty)}). <strong>${result===null?'Special result; consult table':`${result}%`}</strong> · ${tableLink('T-4.1')}.`;
    } else if(declaration.type==='move') {
      if(!declaration.destination||value.q==null) {detail='Movement needs a placed character and destination.';}
      else {
        const pace=Number(declaration.pace)||1;
        let rate=who.baseMove*pace*declaration.activity/100,rollText='';
        if(pace>=3) {
          const difficulty=pace===3?'Easy':pace===4?'Light':'Medium';
          const sprint=who.skills.find(item=>item.name==='Sprinting');
          const roll=openEnded(),total=roll.total+(sprint?.bonus||0)+modifier;
          const result=moveResult(total,difficulty);
          if(result===null) {detail=`Movement maneuver ${diceText(roll)} → ${total}. Special result; consult ${tableLink('T-4.1')} before moving.`;appendLog(id,detail);return;}
          rate*=result/100;rollText=` · ${diceText(roll)} → ${total} (${result}%)`;
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
        const mods=prep+power+snap+armor+list+modifier+(declaration.phase==='deliberate'?10:0);
        value.pp=(value.pp||0)+declaration.spellLevel;
        let cast=false;
        if([prep,power,snap,armor,modifier].some(number=>number<0)) {
          const roll=openEnded(true),total=roll.unmodified?roll.total:roll.total+skill.bonus+mods;
          const outcome=spellResult(total,roll.unmodified);
          cast=['Success','Absolute success','Unusual success'].includes(outcome);
          detail=`${esc(declaration.description||skill.name)} (level ${declaration.spellLevel}): ${diceText(roll)} → ${total}. <strong>${outcome}</strong> · ${tableLink('T-4.5')}${/Failure/.test(outcome)?` · ${tableLink('A-10.11.2','spell failure')}`:''}. ${declaration.spellLevel} PP used.`;
        } else {const roll=d100(),failed=roll<=2;cast=!failed;detail=`${esc(declaration.description||skill.name)} (level ${declaration.spellLevel}): automatic cast check ${roll}. <strong>${failed?'Fails':'Cast'}</strong> · ${declaration.spellLevel} PP used${failed?` · ${tableLink('A-10.11.2','spell failure')}`:''}.`;}
        if(cast&&declaration.spellAttack!=='none')detail+=` ${await spellAttackResult(who,declaration,skill)}`;
      }
    } else if(declaration.type==='resist') {
      const roll=openEnded(),bonus=who.resistances[declaration.resistance]||0;
      const total=roll.total+bonus+modifier,threshold=resistanceThreshold(declaration.attackLevel,who.level);
      detail=`${esc(declaration.resistance)} resistance vs level ${declaration.attackLevel}: ${diceText(roll)} + ${bonus}${modifier?` ${modifier>=0?'+':''}${modifier}`:''} = ${total}; need ${threshold}. <strong>${total>=threshold?'Resisted':'Failed'}</strong> · ${tableLink('T-3.4')}.`;
    }
    appendLog(id,detail);
  }
  function declareAction(event) {
    event.preventDefault();
    const who=selected(),value=token(state.selected);
    if(!who||!value)return message('Tap Add next to a saved character, then select them before declaring an action.');
    if(state.phase>=0)return message('Declarations are closed for this round. Resolve each phase, then declare again in the next round.');
    const data=new FormData(form),phase=data.get('phase'),type=data.get('type'),activity=Number(data.get('activity'));
    const defaults={simple:20,move:20,static:100,moving:100,melee:100,missile:60,spell:data.get('instant')?10:75,resist:0};
    if(!Number.isInteger(activity)||activity<0||activity>100) return message('Activity must be from 0 to 100%.');
    if(type==='move'&&activity>({snap:20,normal:50,deliberate:80}[phase]))return message('Movement exceeds this phase’s activity limit.');
    if(type==='melee'&&activity<60||type==='missile'&&(activity<30||activity>60)||type==='static'&&activity<50)return message('This action is outside its allowed activity range.');
    if(type==='spell'&&activity<defaults.spell)return message(`Spell casting needs at least ${defaults.spell}% activity.`);
    const used=Object.entries(value.actions||{}).reduce((sum,[name,item])=>sum+(name===phase?0:item.activity),0);
    if(used+activity>100)return message(`${who.name} would use ${used+activity}% activity this round.`);
    if(type==='spell'&&Object.entries(value.actions||{}).some(([name,item])=>name!==phase&&item.type==='spell'))return message('Only one spell may be cast per round.');
    const skillKey=String(data.get('skill')||''),skillIndex=Number(skillKey);
    if(['melee','missile','static','moving','spell'].includes(type)&&skillKey==='')return message('Choose an available skill or attack item.');
    if(['melee','missile'].includes(type)&&!who.attacks[skillIndex]||['static','moving','spell'].includes(type)&&skillKey!=='stat'&&!who.skills[skillIndex])return message('Choose an available skill or attack item.');
    if(type==='move'&&!destination)return message('Choose an action destination on the map.');
    if((['melee','missile'].includes(type)||type==='spell'&&data.get('spellAttack')!=='none')&&!data.get('target'))return message('Choose a target.');
    value.actions||={};value.actions[phase]={phase,type,activity,skill:skillKey==='stat'?'stat':skillIndex,statIndex:Number(data.get('stat'))||0,target:data.get('target')||'',difficulty:data.get('difficulty'),pace:Number(data.get('pace')),spellLevel:Number(data.get('spellLevel'))||1,preparation:Number(data.get('preparation'))||0,instant:!!data.get('instant'),spellAttack:data.get('spellAttack')||'none',resistance:data.get('resistance'),attackLevel:Number(data.get('attackLevel'))||1,modifier:Number(data.get('modifier'))||0,description:String(data.get('description')||'').trim(),destination:type==='move'?{...destination}:null};
    message(`${who.name}: ${type} declared for the ${phase} phase.`);destination=null;save();render();
  }
  function rollInitiative() {
    if(state.phase>=0)return;
    if(!Object.keys(state.tokens).length)return message('Add a character before rolling initiative.');
    for(const [id,value] of Object.entries(state.tokens)) {
      const who=actor(id);if(!who)continue;
      const movement=Object.values(value.actions||{}).filter(item=>item.type==='move').reduce((sum,item)=>sum+item.activity,0);
      const mod=(value.surprised?-4:0)+(who.hitsMax>0&&(value.hits||0)>who.hitsMax/2?-4:0)-Math.floor(movement/10)+(value.initiativeMod||0);
      value.initiative=d10()+d10()+(who.stats[8]||0)+mod;
    }
    state.phase=0;state.resolved=false;appendLog('',`Initiative rolled · ${tableLink('T-3.1','round sequence')}.`);save();render();
  }
  async function resolvePhase() {
    if(state.phase<0||state.resolved)return;
    $('#encounter-resolve').disabled=true;
    const phase=phases[state.phase];
    const order=Object.entries(state.tokens).sort((a,b)=>(b[1].initiative||0)-(a[1].initiative||0));
    for(const [id,value] of order) if(value.actions?.[phase]) await resolveAction(id,value.actions[phase]);
    state.resolved=true;save();render();$('#encounter-resolve').disabled=false;
  }
  function nextPhase() {
    if(!state.resolved)return;
    if(state.phase===2) {state.round++;state.phase=-1;Object.values(state.tokens).forEach(value=>{value.actions={};value.initiative=null;value.surprised=false;});}
    else state.phase++;
    state.resolved=false;save();render();
  }
  $('#encounter-map').addEventListener('click',event=>{
    const piece=event.target.closest('[data-token]');if(piece){state.selected=piece.dataset.token;destination=null;save();render();selectPhase(form.elements.phase.value);return;}
    const cell=event.target.closest('[data-hex]');if(!cell)return;
    const [q,r]=cell.dataset.hex.split(',').map(Number),tool=$('#encounter-map-tool').value;
    if(['clear','difficult','blocked'].includes(tool)) {if(tool==='clear')delete state.terrain[keyOf(q,r)];else state.terrain[keyOf(q,r)]=tool;save();render();return;}
    if(!token(state.selected))return message('Add and select a character first.');
    if(state.terrain[keyOf(q,r)]==='blocked')return message('That hex is blocked.');
    if(tool==='destination')destination={q,r};else {token(state.selected).q=q;token(state.selected).r=r;destination=null;save();}
    render();
  });
  $('#encounter-roster').addEventListener('click',event=>{
    const toggle=event.target.closest('[data-toggle]'),pick=event.target.closest('[data-select]');
    if(toggle){const id=toggle.dataset.toggle;if(token(id)){delete state.tokens[id];if(state.selected===id)state.selected=Object.keys(state.tokens)[0]||'';}else{state.tokens[id]={q:null,r:null,hits:0,pp:0,initiative:null,actions:{}};state.selected=id;}destination=null;save();render();selectPhase(form.elements.phase.value);}
    else if(pick){state.selected=pick.dataset.select;destination=null;save();render();selectPhase(form.elements.phase.value);}
  });
  $('#encounter-selected').addEventListener('change',event=>{
    const value=token(state.selected);if(!value)return;
    if(event.target.dataset.vital){const who=selected(),max=event.target.dataset.vital==='hits'?who.hitsMax:who.ppMax;value[event.target.dataset.vital]=Math.max(0,Math.min(max,Number(event.target.value)||0));}
    if(event.target.hasAttribute('data-surprised'))value.surprised=event.target.checked;
    if(event.target.hasAttribute('data-initiative-mod'))value.initiativeMod=Number(event.target.value)||0;
    save();render();
  });
  $('#encounter-action-form').addEventListener('submit',declareAction);
  $('#encounter-action-form').addEventListener('change',event=>{
    if(event.target.name==='phase'){selectPhase(event.target.value);return;}
    if(event.target.name==='type'){form.elements.activity.value=String({simple:20,move:20,static:100,moving:100,melee:100,missile:60,spell:75,resist:0}[event.target.value]);destination=null;}
    if(event.target.name==='instant'&&form.elements.type.value==='spell')form.elements.activity.value=event.target.checked?'10':'75';
    renderActionForm();
  });
  $('#encounter-phase-cards').addEventListener('click',event=>{
    const button=event.target.closest('[data-edit-phase]');
    if(button)selectPhase(button.dataset.editPhase,true);
  });
  $('#encounter-scale').addEventListener('change',event=>{state.scale=Number(event.target.value);save();render();});
  $('#encounter-map-tool').addEventListener('change',()=>renderMap());
  $('#encounter-actions').addEventListener('click',event=>{const button=event.target.closest('[data-remove-action]');if(!button||state.phase>=0)return;delete state.tokens[button.dataset.removeAction]?.actions?.[button.dataset.phase];save();render();});
  $('#encounter-log').addEventListener('click',event=>{const button=event.target.closest('[data-table]');if(button)window.RolemasterEncounter?.openTable(button.dataset.table);});
  $('#encounter-initiative').addEventListener('click',rollInitiative);
  $('#encounter-resolve').addEventListener('click',resolvePhase);
  $('#encounter-next').addEventListener('click',nextPhase);
  $('#encounter-reset').addEventListener('click',()=>{if(!confirm('Start a new encounter and clear the map and action log?'))return;localStorage.removeItem(storageKey);state=readState();destination=null;message('New encounter ready.');render();});
  window.addEventListener('rolemaster-roster-updated',refreshRoster);
  refreshRoster();
})();
