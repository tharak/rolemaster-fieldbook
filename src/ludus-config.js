/** Human-editable Ludus settings. See docs/ludus-tuning.md.
 * Prices/progression are arena rules. Sections marked CORE reproduce printed
 * defaults; editing them intentionally creates house rules. No build required.
 */
export const ludusConfig = {
  starting: {level:1, xp:0, rank:0, residentBonus:0, statBonus:0, categoryBonus:0},
  economy: {
    rankPrices:[5,10,15,20,25,30,35,40,45,50],
    goldPerSpellLevel:1,
    servicePrices:{}, // Optional overrides, e.g. 'nerve:4': 3.
  },
  progression: {
    maxRank:10,
    // PP and hits: T-5.8 Cleric profiles. XP/prices are arena rules.
    levels:[
      {level:1,xp:0,gold:0,pp:16,hits:30},
      {level:5,xp:100,gold:25,pp:43,hits:51},
      {level:10,xp:300,gold:50,pp:73,hits:63},
      {level:15,xp:600,gold:75,pp:98,hits:81},
      {level:20,xp:1000,gold:100,pp:123,hits:89},
    ],
    victoryXpMultiplier:1,
  },
  time: {secondsPerRound:10, secondsPerMinute:60, minutesPerHour:60, hoursPerDay:24,
    restDays:1, restPpFraction:1, restHpFraction:0.25, defaultRegenerationMinutes:10, maxRegenerationMinutes:1440},
  arena: {autoRefresh:true,offerCount:3,blessingsPerFighter:1,
    // Abstract arena positions, in feet. Melee attackers close to their target.
    attendantX:-30,partyX:0,enemyX:40,formationSpacing:2,meleeReach:3,
    targetRatios:[0.65,1,1.35], historyLimit:30,
    elementNames:{electricity:'shock|lightning|electric',cold:'cold|ice|frost',heat:'fire|heat|flame'},
    elementTables:{'A-10.10.1':'cold','A-10.10.2':'heat'}},
  // CORE §14 pp.46–47. The Ludus is an unarmored, speaking Channeler.
  casting: {
    dieSides:100, openHigh:96, openLow:5, ordinaryFailureMax:2,
    ppPerSpellLevel:1, actionRounds:1,
    preparation:[{difference:6,rounds:0,bonus:0},{difference:3,rounds:1,bonus:0},{difference:0,rounds:2,bonus:0}],
    instantaneous:[{difference:9,bonus:15},{difference:6,bonus:10},{difference:3,bonus:5},{difference:0,bonus:0}],
    depletion:[{above:0.75,modifier:-30},{above:0.5,modifier:-20},{above:0.25,modifier:-10}],
    listBonuses:{nerve:0,concussion:0,protections:0},
    rankBonusPerRank:1, impactCriticalTable:'A-10.10.3', // Limited progression, first 20 ranks (A-4.18).
    unusualRoll:66, unusualSuccessRoll:100, unusualSuccessBonus:30,
    absoluteSuccessMinimum:126, absoluteSuccessBonus:10, successBonusMinutes:10,
    spectacularMaximum:-76, absoluteFailureMaximum:1, failureMaximum:25,
    partialMaximum:40, nearMaximum:60, spectacularFactor:3, absoluteFailureFactor:2, failureFactor:1,
    // CORE A-10.11.2 p.241, non-attack "Other" and "Informational" columns.
    // pp is a fraction of normal cost unless ppFixed is set. Missing pp = normal cost.
    failures:[
      {max:20,other:{delay:1,pp:1},info:{delay:1,pp:1}},
      {max:30,other:{pp:0},info:{diagnosis:'Outdated or incorrect information'}},
      {max:40,other:{pp:0},info:{diagnosis:'Incomplete and incorrect information'}},
      {max:60,other:{pp:0},info:{diagnosis:'Information has no identifiable subject'}},
      {max:75,other:{ppFixed:1},info:{stun:1,diagnosis:'Information concerns a similar subject'}},
      {max:90,other:{pp:0.5,stun:2},info:{diagnosis:'Extraneous feedback obscures the result'}},
      {max:95,other:{pp:0.5,stun:1},info:{stun:1,diagnosis:'An ominous vision interrupts diagnosis'}},
      {max:100,other:{hitsDice:[2,10],stunDice:[2,10]},info:{hitsDice:[1,10],diagnosis:'Specific but incorrect information'}},
      {max:125,other:{stun:3},info:{stun:2,diagnosis:'Garbled information'}},
      {max:150,other:{stun:4},info:{stun:3,diagnosis:'Information concerns an unknown subject'}},
      {max:175,other:{hitsDice:[1,10],stunDice:[1,10]},info:{hits:3,stun:5}},
      {max:185,other:{hitsDice:[2,10],disabledHours:1},info:{hits:5,disabledMinutesDice:[5,10]}},
      {max:191,other:{hitsDice:[1,10],impact:'A',disabledHoursDice:[1,10]},info:{hitsDice:[2,10],impact:'A',disabledHours:1}},
      {max:195,other:{hitsDice:[5,10],noCastingWeeksDice:[1,10],disabledHours:12,disorder:'Nervous disorder'},info:{hitsDice:[3,10],disabledHoursDice:[1,10],disorder:'Paranoia'}},
      {max:200,other:{hits:20,noCastingWeeks:2,penalty:50,penaltyDaysDice:[1,10]},info:{hitsDice:[4,10],noCastingWeeks:1,penalty:40,penaltyDaysDice:[1,10]}},
      {max:250,other:{hitsDice:[4,10],disabledHoursDice:[2,10],noCastingWeeksDice:[1,10]},info:{hits:20,disabledHours:9,noCastingWeeks:4}},
      {max:300,other:{stunDice:[2,10],forbidSpell:true,disorder:'Nervous disorder'},info:{stunDice:[1,10],forbidSpell:true,disorder:'Progressive nervous tic'}},
      {max:Infinity,other:{disabledMonthsDice:[1,10]},info:{disabledMonths:3}},
    ],
    daysPerWeek:7,daysPerMonth:30, // Month length is the arena calendar convention.
  },
  buildings:{
    nerve:{name:'Nerve Law',source:'A-9.6.8 · Core p.164'},
    concussion:{name:'Concussion’s Ways',source:'A-9.5.2 · Core p.156'},
    protections:{name:'Protections',source:'A-9.7.4 · Core p.167'},
  },
  // CORE spell definitions: level also determines PP and default service price.
  spells:[
    {id:'nerve:1',building:'nerve',level:1,name:'Nerve Lore',kind:'diagnose',information:true,range:0},
    {id:'nerve:4',building:'nerve',level:4,name:'Minor Nerve Repair',kind:'nerveRepair',maxPenalty:20,recoveryDays:1,range:0},
    {id:'nerve:5',building:'nerve',level:5,name:'Limb Preservation',kind:'preserve',durationDaysPerLevel:1,range:0,
      prerequisites:['Blood Law 5','Bone Law 5','Muscle Law 5']},
    {id:'nerve:9',building:'nerve',level:9,name:'Major Nerve Repair',kind:'nerveRepair',recoveryDays:1,range:0},
    {id:'nerve:10',building:'nerve',level:10,name:'Unparalysis',kind:'unparalysis',durationMinutesPerLevel:10,range:0},
    {id:'concussion:1',building:'concussion',level:1,name:'Healing I',kind:'heal',dice:[1,10],range:0},
    {id:'concussion:2',building:'concussion',level:2,name:'Frost/Burn Relief I',kind:'burn',capacity:1,degreeCosts:{1:1},range:0},
    {id:'concussion:3',building:'concussion',level:3,name:'Minor Irritation Relief',kind:'irritation',range:0},
    {id:'concussion:4',building:'concussion',level:4,name:'Healing III',kind:'heal',dice:[3,10],range:0},
    {id:'concussion:5',building:'concussion',level:5,name:'Stun Relief',kind:'stun',rounds:1,instant:true,range:0},
    {id:'concussion:6',building:'concussion',level:6,name:'Frost/Burn Relief II',kind:'burn',capacity:2,degreeCosts:{1:1,2:2},range:0},
    {id:'concussion:7',building:'concussion',level:7,name:'Regeneration I',kind:'regenerate',hitsPerMinute:1,instant:true,concentration:true,range:0},
    {id:'concussion:8',building:'concussion',level:8,name:'Healing V',kind:'heal',dice:[5,10],range:0},
    {id:'concussion:9',building:'concussion',level:9,name:'Frost/Burn Relief III',kind:'burn',capacity:3,degreeCosts:{1:1,2:2,3:3},range:0},
    {id:'concussion:10',building:'concussion',level:10,name:'Awakening',kind:'awaken',range:100},
    {id:'protections:1',building:'protections',level:1,name:'Prayer I',kind:'blessing',rr:5,maneuver:5,durationMinutesPerLevel:1,range:100,group:'protection'},
    {id:'protections:2',building:'protections',level:2,name:'Bless I',kind:'blessing',db:5,maneuver:5,durationMinutesPerLevel:1,range:100,group:'protection'},
    {id:'protections:3',building:'protections',level:3,name:'Resistance I',kind:'blessing',rr:5,db:5,durationMinutesPerLevel:1,range:100,group:'protection'},
    {id:'protections:4',building:'protections',level:4,name:'Heat Resistance',kind:'blessing',element:'heat',rr:20,db:20,naturalLimitF:170,temperatureOffsetF:-100,durationMinutesPerLevel:10,range:100,group:'temperature',instant:true},
    {id:'protections:5',building:'protections',level:5,name:'Cold Resistance',kind:'blessing',element:'cold',rr:20,db:20,naturalLimitF:20,temperatureOffsetF:50,durationMinutesPerLevel:10,range:100,group:'temperature',instant:true},
    {id:'protections:8',building:'protections',level:8,name:'Temperature Sphere I',kind:'blessing',choices:['protections:4','protections:5'],radius:10,durationMinutesPerLevel:10,range:10,tetherRange:100,group:'temperature'},
    {id:'protections:10',building:'protections',level:10,name:'Protections Sphere I',kind:'blessing',choices:['protections:1','protections:2','protections:3'],radius:10,durationMinutesPerLevel:1,range:10,tetherRange:100,group:'protection'},
  ],
};

export function validateLudusConfig(c=ludusConfig){
  const fail=path=>{throw new Error(`Invalid Ludus configuration: ${path}`);};
  const number=(v,path,min=0)=>{if(!Number.isFinite(v)||v<min)fail(path);};
  const integer=(v,path,min=0)=>{number(v,path,min);if(!Number.isSafeInteger(v))fail(path);};
  for(const [key,value] of Object.entries(c.starting))number(value,`starting.${key}`,key.endsWith('Bonus')?-Infinity:0);
  if(!c.progression.levels.length)fail('progression.levels');
  c.progression.levels.forEach((p,i)=>{
    for(const k of ['level','xp','gold','pp','hits'])integer(p[k],`progression.levels[${i}].${k}`,['level','pp','hits'].includes(k)?1:0);
    if(i&&(p.level<=c.progression.levels[i-1].level||p.xp<=c.progression.levels[i-1].xp))fail('progression.levels must increase');
  });
  if(!c.progression.levels.some(p=>p.level===c.starting.level))fail('starting.level');
  integer(c.progression.maxRank,'progression.maxRank',1);
  if(c.economy.rankPrices.length<c.progression.maxRank)fail('economy.rankPrices');
  c.economy.rankPrices.forEach((v,i)=>integer(v,`economy.rankPrices[${i}]`));
  integer(c.economy.goldPerSpellLevel,'economy.goldPerSpellLevel');
  for(const [k,v] of Object.entries(c.economy.servicePrices))integer(v,`economy.servicePrices.${k}`);
  for(const [k,v] of Object.entries(c.time))number(v,`time.${k}`,k.includes('Fraction')?0:1);
  if(c.time.restPpFraction>1||c.time.restHpFraction>1)fail('time recovery fractions must be at most 1');
  integer(c.arena.offerCount,'arena.offerCount',1);if(c.arena.offerCount>5)fail('arena.offerCount (maximum 5 themes)');
  integer(c.arena.blessingsPerFighter,'arena.blessingsPerFighter',1);
  if(c.arena.targetRatios.length<c.arena.offerCount||c.arena.targetRatios.some(v=>!Number.isFinite(v)||v<=0))fail('arena.targetRatios');
  const ids=new Set();
  for(const s of c.spells){
    if(ids.has(s.id)||!c.buildings[s.building])fail(`spells.${s.id}`);ids.add(s.id);
    integer(s.level,`spells.${s.id}.level`,1);
    for(const [k,v] of Object.entries(s))if(typeof v==='number')number(v,`spells.${s.id}.${k}`,k==='temperatureOffsetF'?-Infinity:0);
    if(s.dice&&(!Array.isArray(s.dice)||s.dice.length!==2||s.dice.some(n=>!Number.isSafeInteger(n)||n<1)))fail(`spells.${s.id}.dice`);
  }
  for(const s of c.spells)if(s.choices?.some(id=>!ids.has(id)))fail(`spells.${s.id}.choices`);
  const finiteTree=(value,path)=>{
    if(typeof value==='number'&&!Number.isFinite(value)&&!(value===Infinity&&path.endsWith('.max')))fail(path);
    else if(value&&typeof value==='object')for(const [k,v] of Object.entries(value))finiteTree(v,`${path}.${k}`);
  };
  finiteTree(c,'config');
  for(const k of ['level','xp','rank'])integer(c.starting[k],`starting.${k}`);
  if(c.starting.rank>Math.min(c.starting.level,c.progression.maxRank))fail('starting.rank');
  number(c.progression.victoryXpMultiplier,'progression.victoryXpMultiplier');
  for(const k of ['secondsPerRound','secondsPerMinute','minutesPerHour','hoursPerDay','restDays','defaultRegenerationMinutes','maxRegenerationMinutes'])integer(c.time[k],`time.${k}`,1);
  if(c.time.secondsPerMinute%c.time.secondsPerRound)fail('time.secondsPerRound must divide secondsPerMinute');
  if(c.time.defaultRegenerationMinutes>c.time.maxRegenerationMinutes)fail('time.defaultRegenerationMinutes');
  integer(c.arena.historyLimit,'arena.historyLimit',1);
  for(const k of ['formationSpacing','meleeReach'])number(c.arena[k],`arena.${k}`);
  for(const k of ['dieSides','openHigh','openLow','ppPerSpellLevel','actionRounds','rankBonusPerRank','daysPerWeek','daysPerMonth'])integer(c.casting[k],`casting.${k}`,1);
  if(c.casting.openLow>=c.casting.openHigh||c.casting.openHigh>c.casting.dieSides)fail('casting.openHigh/openLow');
  integer(c.casting.ordinaryFailureMax,'casting.ordinaryFailureMax');
  if(c.casting.ordinaryFailureMax>=c.casting.dieSides)fail('casting.ordinaryFailureMax');
  for(const group of ['preparation','instantaneous']){
    if(!c.casting[group].length||c.casting[group].at(-1).difference!==0)fail(`casting.${group}`);
    c.casting[group].forEach((r,i)=>{if(i&&r.difference>=c.casting[group][i-1].difference)fail(`casting.${group} order`);if(group==='preparation')integer(r.rounds,`casting.${group}.${i}.rounds`);});
  }
  if(c.casting.failures.at(-1)?.max!==Infinity)fail('casting.failures must cover all rolls');
  c.casting.failures.forEach((r,i)=>{
    if(i&&r.max<=c.casting.failures[i-1].max)fail('casting.failures order');
    for(const type of ['info','other']){
      if(!r[type])fail(`casting.failures.${i}.${type}`);
      for(const [k,v] of Object.entries(r[type])){
        if(typeof v==='number')number(v,`casting.failures.${i}.${type}.${k}`);
        if(k.endsWith('Dice')&&(!Array.isArray(v)||v.length!==2||v.some(n=>!Number.isSafeInteger(n)||n<1)))fail(`casting.failures.${i}.${type}.${k}`);
      }
    }
  });
  for(const [id] of Object.entries(c.economy.servicePrices))if(!ids.has(id))fail(`economy.servicePrices.${id}`);
  return true;
}
validateLudusConfig();
