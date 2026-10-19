import {ludusConfig as C,validateLudusConfig} from './ludus-config.js';
import {seededRandom} from './adventure-rules.js';
import {resolveCritical} from './coliseum-rules.js';

const clone=v=>structuredClone(v);
export const spellById=id=>C.spells.find(s=>s.id===id);
export const roundsPerMinute=()=>C.time.secondsPerMinute/C.time.secondsPerRound;
export const roundsPerDay=()=>roundsPerMinute()*C.time.minutesPerHour*C.time.hoursPerDay;
export const servicePrice=s=>C.economy.servicePrices[s.id]??s.level*C.economy.goldPerSpellLevel;
export const spellPp=s=>s.level*C.casting.ppPerSpellLevel;
export const profileFor=level=>[...C.progression.levels].reverse().find(p=>p.level<=level)||C.progression.levels[0];
export function newLudus(){
 const p=profileFor(C.starting.level);
 return {version:1,level:C.starting.level,xp:C.starting.xp,pp:p.pp,ppMax:p.pp,hits:p.hits,damage:0,clock:0,sequence:0,
  buildings:Object.fromEntries(Object.keys(C.buildings).map(id=>[id,{rank:C.starting.rank,residentBonus:C.starting.residentBonus}])),
  selections:{},auras:[],history:[],conditions:[],forbiddenSpells:[]};
}
export function validLudus(l){
 const nat=n=>Number.isSafeInteger(n)&&n>=0;
 return !!l&&l.version===1&&nat(l.level)&&l.level>0&&nat(l.xp)&&nat(l.pp)&&nat(l.ppMax)&&l.pp<=l.ppMax&&nat(l.clock)&&nat(l.sequence)&&Number.isFinite(l.damage)&&l.damage>=0&&Number.isFinite(l.hits)&&l.hits>0&&
  !!l.buildings&&Object.keys(C.buildings).every(id=>nat(l.buildings[id]?.rank)&&Number.isFinite(l.buildings[id]?.residentBonus))&&
  !!l.selections&&typeof l.selections==='object'&&!Array.isArray(l.selections)&&Object.values(l.selections).every(a=>Array.isArray(a)&&a.every(s=>typeof s.spellId==='string'))&&
  Array.isArray(l.history)&&Array.isArray(l.auras)&&Array.isArray(l.conditions)&&l.conditions.every(c=>typeof c.kind==='string'&&Number.isFinite(c.until))&&Array.isArray(l.forbiddenSpells);
}
export function migrateLudus(state){
 validateLudusConfig();
 state.ludus??=newLudus();
 if(!validLudus(state.ludus))throw new Error('The Ludus save could not be read.');
 const l=state.ludus,p=profileFor(l.level),spent=l.ppMax-l.pp;
 l.ppMax=p.pp;l.pp=Math.max(0,p.pp-spent);l.hits=p.hits;
 for(const m of state.members){m.supportEffects??=[];m.conditions??=[];}
 return state;
}
export const nextPromotion=state=>C.progression.levels.find(p=>p.level>state.ludus.level);
export function upgradeBuilding(state,id){
 const next=migrateLudus(clone(state)),b=next.ludus.buildings[id];
 if(!b)throw new Error('Choose a Ludus building.');
 if(b.rank>=Math.min(next.ludus.level,C.progression.maxRank))throw new Error('Promote the Ludus before buying this rank, or this list is complete.');
 const cost=C.economy.rankPrices[b.rank];if(next.gold<cost)throw new Error('Not enough gold for this rank.');
 next.gold-=cost;b.rank++;return next;
}
export function promoteLudus(state){
 const next=migrateLudus(clone(state)),p=nextPromotion(next);
 if(!p)throw new Error('The Ludus has reached its highest level.');
 if(next.ludus.xp<p.xp||next.gold<p.gold)throw new Error('The Ludus needs more XP or gold for promotion.');
 next.gold-=p.gold;next.ludus.level=p.level;return migrateLudus(next);
}
// Every state operation advances the same clock; replay never calls this function.
export function advanceLudusTime(state,rounds){
 if(!Number.isSafeInteger(rounds)||rounds<0)throw new Error('Invalid elapsed rounds.');
 const l=state.ludus,oldClock=l.clock;l.clock+=rounds;
 state.arena.day+=Math.floor(l.clock/roundsPerDay())-Math.floor(oldClock/roundsPerDay());
 state.hours+=rounds*C.time.secondsPerRound/(C.time.secondsPerMinute*C.time.minutesPerHour);
 l.conditions=l.conditions.filter(c=>c.until>l.clock);
 l.auras=l.auras.filter(e=>e.until>l.clock);
 if(l.nextBonus?.until<=l.clock)delete l.nextBonus;
 for(const m of state.members){
  m.conditions=(m.conditions||[]).filter(c=>c.until>l.clock);
  m.supportEffects=(m.supportEffects||[]).filter(c=>c.until>l.clock);
  m.injuries=m.injuries.filter(i=>!i.recoveryUntil||i.recoveryUntil>l.clock);
  for(const i of m.injuries)if(i.suppressedUntil&&i.suppressedUntil<=l.clock){delete i.suppressedUntil;delete i.suppressed;}
 }
}
export function restLudus(state){
 advanceLudusTime(state,Math.ceil(roundsPerDay()*C.time.restDays));
 state.ludus.pp=Math.min(state.ludus.ppMax,state.ludus.pp+Math.ceil(state.ludus.ppMax*C.time.restPpFraction));
 state.ludus.damage=Math.max(0,state.ludus.damage-Math.ceil(state.ludus.hits*C.time.restHpFraction));
}
export const casterUnavailable=l=>l.damage>=l.hits||l.conditions.some(c=>['stun','disabled','noCasting'].includes(c.kind)&&c.until>l.clock);
export function spellRequirement(state,s){
 if(!s)return 'Unknown spell.';
 const l=state.ludus;
 if(s.level>l.level)return `Requires Ludus level ${s.level}.`;
 if((l.buildings[s.building]?.rank??0)<s.level)return `Requires ${C.buildings[s.building].name} rank ${s.level}.`;
 if(s.prerequisites)return `Requires ${s.prerequisites.join(', ')}; those buildings are not available yet.`;
 if(l.forbiddenSpells.includes(s.id))return 'A casting injury prevents this spell.';
 if(casterUnavailable(l))return 'The Ludus caster must recover before casting.';
 if(l.pp<spellPp(s))return 'Not enough Ludus PP.';
 if(state.gold<servicePrice(s))return 'Not enough gold.';
 return '';
}
function chosenInjuries(m,options){return m.injuries.filter(i=>(options.injuryIds||[options.injuryId]).includes(i.id));}
export function targetRequirement(state,s,m,options={}){
 if(!m||m.dead)return 'Choose a living target.';
 const injuries=chosenInjuries(m,options);
 if(s.kind==='nerveRepair'){
  if(injuries.length!==1||!['nerve','paralysis'].includes(injuries[0].kind))return 'Choose one nerve injury.';
  const i=injuries[0];if(i.destroyed)return 'Destroyed nerves cannot be repaired by this spell.';
  if(i.recoveryUntil)return 'This injury is already recovering.';
  if(s.maxPenalty!==undefined&&(i.disabling||i.nervePenalty===undefined&&i.kind==='paralysis'||Math.abs(i.nervePenalty??i.penalty)>s.maxPenalty))return 'This nerve injury requires Major Nerve Repair.';
 }
 if(s.kind==='unparalysis'&&(injuries.length!==1||injuries[0].kind!=='paralysis'))return 'Choose one paralysis condition.';
 if(s.kind==='diagnose'&&!m.injuries.some(i=>['nerve','paralysis'].includes(i.kind)))return 'No nerve injury to diagnose.';
 if(['heal','regenerate'].includes(s.kind)&&m.damage<=0)return 'This fighter has no concussion hits to heal.';
 if(s.kind==='burn'){
  if(!injuries.length||injuries.some(i=>i.kind!=='burn'||!s.degreeCosts[i.degree]))return 'Choose eligible burn or frostbite areas.';
  if(injuries.reduce((sum,i)=>sum+s.degreeCosts[i.degree],0)>s.capacity)return 'Too many or too severe burn areas for this spell.';
 }
 if(s.kind==='irritation'&&(injuries.length!==1||injuries[0].kind!=='irritation'))return 'Choose one minor irritation.';
 if(s.kind==='stun'&&!m.conditions?.some(c=>c.kind==='stun'&&c.until>state.ludus.clock))return 'This fighter is not stunned.';
 if(s.kind==='awaken'&&!m.conditions?.some(c=>c.kind==='sleep'))return 'This fighter is not asleep. Awakening does not revive the dead or heal a coma.';
 if(s.kind==='regenerate'&&(!Number.isSafeInteger(options.minutes)||options.minutes<1||options.minutes>C.time.maxRegenerationMinutes))return `Choose 1–${C.time.maxRegenerationMinutes} minutes of concentration.`;
 if(s.choices&&!s.choices.includes(options.choice))return 'Choose the sphere’s effect.';
 return '';
}
function openRoll(die){
 const first=die(),c=C.casting;let total=first,r=first;
 if(first>=c.openHigh){do{r=die();total+=r;}while(r>=c.openHigh);}
 else if(first<=c.openLow){do{r=die();total-=r;}while(r>=c.openHigh);}
 return {first,total};
}
const sumDice=(dice,random)=>dice?Array.from({length:dice[0]},()=>1+Math.floor(random()*dice[1])).reduce((a,b)=>a+b,0):0;
function failSpell(state,s,random,modifier,factor,tables){
 const c=C.casting,l=state.ludus,roll=1+Math.floor(random()*c.dieSides)-factor*modifier;
 const effects=c.failures.find(r=>roll<=r.max)[s.information?'info':'other'];
 const pp=effects.ppFixed??Math.floor(spellPp(s)*(effects.pp??1));
 l.pp=Math.max(0,l.pp-pp);l.damage+=(effects.hits||0)+sumDice(effects.hitsDice,random);
 const timed=(kind,rounds,extra={})=>{if(rounds)l.conditions.push({kind,until:l.clock+Math.ceil(rounds),...extra});};
 timed('stun',(effects.stun||0)+sumDice(effects.stunDice,random));
 const hours=(effects.disabledHours||0)+sumDice(effects.disabledHoursDice,random);
 const minutes=sumDice(effects.disabledMinutesDice,random);
 const months=(effects.disabledMonths||0)+sumDice(effects.disabledMonthsDice,random);
 timed('disabled',hours*roundsPerMinute()*C.time.minutesPerHour+minutes*roundsPerMinute()+months*c.daysPerMonth*roundsPerDay());
 timed('noCasting',((effects.noCastingWeeks||0)+sumDice(effects.noCastingWeeksDice,random))*c.daysPerWeek*roundsPerDay());
 timed('penalty',sumDice(effects.penaltyDaysDice,random)*roundsPerDay(),{amount:effects.penalty||0});
 if(effects.forbidSpell&&!l.forbiddenSpells.includes(s.id))l.forbiddenSpells.push(s.id);
 if(effects.disorder)l.disorder=effects.disorder;
 let critical;
 if(effects.impact){
  if(!tables?.[C.casting.impactCriticalTable])throw new Error('Load the critical tables before resolving casting injuries.');
  const victim={creature:{hits:l.hits,size:'M',equipment:{}},hits:l.damage,effects:[]};
  critical=resolveCritical(victim,{effects:[]},{type:'Wp',criticalTable:C.casting.impactCriticalTable},effects.impact,tables,()=>1+Math.floor(random()*c.dieSides),1,{persistentConsequences:true});
  l.damage=victim.hits;
  if(victim.dead||victim.deathRound!==undefined||victim.incapacitated){l.damage=l.hits;l.disorder=critical.description;}
  for(const e of victim.effects)if(['stun','stunNoParry'].includes(e.kind))timed('stun',e.roundsLeft||0);
 }
 if(effects.delay)advanceLudusTime(state,effects.delay);
 return {success:!!effects.delay,pp,roll,diagnosis:effects.diagnosis,critical,description:effects.delay?'Casting delayed, then completed.':effects.diagnosis||'The spell failed; its casting consequences were applied.'};
}
export function resolveLudusCast(state,s,random,tables){
 const c=C.casting,l=state.ludus,difference=l.level-s.level;
 const prep=(s.instant?c.instantaneous:c.preparation).find(p=>difference>=p.difference);
 if(!prep)throw new Error('The Ludus cannot cast above its level.');
 const depletion=c.depletion.find(p=>(l.ppMax-l.pp)/l.ppMax>p.above)?.modifier||0;
 const injuryMod=-l.conditions.filter(c=>c.kind==='penalty').reduce((sum,c)=>sum+c.amount,0)||0;
 const modifiers=[prep.bonus,depletion,injuryMod,C.casting.listBonuses[s.building]||0];
 const mod=modifiers.reduce((a,b)=>a+b,0),needCheck=modifiers.some(n=>n<0);
 advanceLudusTime(state,(prep.rounds||0)+c.actionRounds);
 const die=()=>1+Math.floor(random()*c.dieSides),result={preparation:prep.rounds||0,modifiers,success:true};
 if(needCheck){
  const roll=openRoll(die),bonus=l.buildings[s.building].rank*c.rankBonusPerRank+C.starting.statBonus+C.starting.categoryBonus+l.buildings[s.building].residentBonus+(l.nextBonus?.amount||0);
  delete l.nextBonus;result.maneuver={...roll,bonus,total:roll.total+bonus+mod};
  const total=result.maneuver.total;
  if(roll.first===c.unusualRoll){
   const others=C.spells.filter(x=>x.id!==s.id&&!spellRequirement(state,x)&&x.level<=l.level);
   result.wrongSpell=others.length?others[Math.floor(random()*others.length)].id:null;
  }else if(roll.first===c.unusualSuccessRoll){l.nextBonus={amount:c.unusualSuccessBonus,until:l.clock+c.successBonusMinutes*roundsPerMinute()};}
  else if(total<=c.failureMaximum){
   const factor=total<=c.spectacularMaximum?c.spectacularFactor:total<=c.absoluteFailureMaximum?c.absoluteFailureFactor:c.failureFactor;
   return {...result,...failSpell(state,s,random,mod,factor,tables)};
  }else if(total<=c.partialMaximum)advanceLudusTime(state,c.actionRounds);
  else if(total>=c.absoluteSuccessMinimum)l.nextBonus={amount:c.absoluteSuccessBonus,until:l.clock+c.successBonusMinutes*roundsPerMinute()};
 }
 result.failureCheck=die();
 if(result.failureCheck<=c.ordinaryFailureMax)return {...result,...failSpell(state,s,random,0,0,tables)};
 result.pp=spellPp(s);l.pp-=result.pp;return result;
}
function applySpell(state,s,m,options,random){
 const l=state.ludus,injuries=chosenInjuries(m,options);
 if(s.kind==='diagnose'){
  for(const i of m.injuries.filter(i=>['nerve','paralysis'].includes(i.kind)))i.diagnosed=true;
  return m.injuries.filter(i=>i.diagnosed).map(i=>`${i.label||'Nerve injury'}: ${i.destroyed?'nerves destroyed; repair unavailable':i.disabling||Math.abs(i.nervePenalty??i.penalty)>spellById('nerve:4').maxPenalty?'Major Nerve Repair required':'Minor Nerve Repair eligible'}`).join('; ');
 }
 if(s.kind==='nerveRepair'){injuries[0].recoveryUntil=l.clock+Math.ceil(s.recoveryDays*roundsPerDay());return `Repair performed; recovery takes ${s.recoveryDays} day(s).`;}
 if(s.kind==='unparalysis'){injuries[0].suppressed=true;injuries[0].suppressedUntil=l.clock+Math.ceil(s.durationMinutesPerLevel*l.level*roundsPerMinute());return 'Paralysis temporarily suppressed; the underlying injury remains.';}
 if(s.kind==='heal'){const hits=Math.min(m.damage,sumDice(s.dice,random));m.damage-=hits;return `${hits} concussion hits healed.`;}
 if(['burn','irritation'].includes(s.kind)){m.injuries=m.injuries.filter(i=>!injuries.includes(i));return `${injuries.length} affected area(s) healed.`;}
 if(s.kind==='stun'){
  const stun=m.conditions.find(c=>c.kind==='stun'&&c.until>l.clock);if(stun)stun.until=Math.max(l.clock,stun.until-s.rounds);
  return `${s.rounds} accumulated stun round removed.`;
 }
 if(s.kind==='awaken'){m.conditions=m.conditions.filter(c=>c.kind!=='sleep');return 'Target awakens.';}
 if(s.kind==='regenerate'){
  l.concentration={spellId:s.id,targetId:m.id,minutes:options.minutes};
  advanceLudusTime(state,Math.ceil(options.minutes*roundsPerMinute()));
  const hits=Math.min(m.damage,options.minutes*s.hitsPerMinute);m.damage-=hits;delete l.concentration;
  return `${hits} hits recovered during ${options.minutes} minute(s) of concentration.`;
 }
 if(s.kind==='blessing'){
  const selected=s.choices?spellById(options.choice):s;
  const effect={...clone(selected),spellId:s.id,name:s.name,until:l.clock+Math.ceil(s.durationMinutesPerLevel*l.level*roundsPerMinute()),range:s.tetherRange??s.range};
  if(s.radius)l.auras.push({...effect,radius:s.radius,targetId:m.id});
  else {m.supportEffects=m.supportEffects.filter(e=>e.group!==effect.group);m.supportEffects.push(effect);}
  return `${s.name}${s.choices?' · '+selected.name:''} prepared for ${s.durationMinutesPerLevel*l.level} minutes.`;
 }
 return 'No effect.';
}
export function castLudusSpell(state,spellId,targetId,options={},tables){
 const next=migrateLudus(clone(state)),s=spellById(spellId),m=next.members.find(m=>m.id===targetId);
 const reason=spellRequirement(next,s)||targetRequirement(next,s,m,options);if(reason)throw new Error(reason);
 const l=next.ludus,random=seededRandom(`${next.management.seed}:ludus:${l.sequence++}`),cost=servicePrice(s);
 next.gold-=cost;
 const result=resolveLudusCast(next,s,random,tables),actual=result.wrongSpell===undefined?s:spellById(result.wrongSpell);
 let description=result.description||'';
 if(result.success){
  const mismatch=actual?targetRequirement(next,actual,m,options):'No other known spell.';
  description=actual&&!mismatch?applySpell(next,actual,m,options,random):`Wrong spell: ${actual?.name||'none'}; ${mismatch}`;
 }
 const record={id:l.sequence,at:l.clock,spellId:s.id,name:s.name,targetId:m.id,target:m.name,gold:cost,...result,description};
 l.history.unshift(record);l.history=l.history.slice(0,C.arena.historyLimit);
 return next;
}
export function selectBlessing(state,memberId,spellId,choice){
 const next=migrateLudus(clone(state)),m=next.members.find(m=>m.id===memberId),s=spellById(spellId);
 if(!m||m.dead)throw new Error('Choose a living fighter.');
 if(!spellId){delete next.ludus.selections[memberId];return next;}
 if(s?.kind!=='blessing'||next.ludus.buildings[s.building].rank<s.level||s.choices&&!s.choices.includes(choice))throw new Error('Choose an unlocked blessing and effect.');
 next.ludus.selections[memberId]=[...(next.ludus.selections[memberId]||[]).filter(o=>o.spellId!==spellId),{spellId,...(choice?{choice}:{})}].slice(-C.arena.blessingsPerFighter);return next;
}
export function blessingQuote(state,partyIds){
 const selections=state.members.filter(m=>partyIds.includes(m.id)).flatMap(m=>(state.ludus.selections[m.id]||[]).slice(0,C.arena.blessingsPerFighter).map(o=>({...o,targetId:m.id})));
 return {selections,gold:selections.reduce((n,o)=>n+servicePrice(spellById(o.spellId)),0),pp:selections.reduce((n,o)=>n+spellPp(spellById(o.spellId)),0)};
}
export function prepareBlessings(state,partyIds,tables){
 let next=migrateLudus(clone(state));const quote=blessingQuote(next,partyIds),records=[];
 if(next.gold<quote.gold||next.ludus.pp<quote.pp)throw new Error('Not enough gold or PP for the selected blessings.');
 for(const o of quote.selections){
  if(casterUnavailable(next.ludus)){records.push({name:spellById(o.spellId).name,targetId:o.targetId,success:false,description:'Skipped: caster incapacitated by an earlier casting.'});continue;}
  next=castLudusSpell(next,o.spellId,o.targetId,o,tables);records.push(next.ludus.history[0]);
 }
 for(const id of partyIds)delete next.ludus.selections[id];
 return {state:next,records};
}
// Pure helper shared by combat and tests: exact membership, range, expiry,
// elemental restrictions and non-cumulative protection families.
export function supportBonus(unit,units,auras,clock,stat,element){
 const x=unit.x??C.arena.partyX;
 const effects=[...(unit.creature?.supportEffects||unit.supportEffects||[]),...auras.filter(a=>{
  const center=units.find(u=>u.id===a.targetId);return center&&!center.dead&&Math.abs(x-center.x)<=a.radius&&Math.abs(center.x-C.arena.attendantX)<=a.range;
 })];
 const groups=new Map();
 for(const e of effects){
  if(e.until<=clock||Math.abs(x-C.arena.attendantX)>e.range||e.element&&e.element!==element)continue;
  groups.set(e.group,Math.max(groups.get(e.group)||0,e[stat]||0));
 }
 return [...groups.values()].reduce((a,b)=>a+b,0);
}

export function attackElement(attack){
 if(attack.element)return attack.element;
 for(const [element,pattern] of Object.entries(C.arena.elementNames))if(new RegExp(pattern,'i').test(attack.name||''))return element;
 return C.arena.elementTables[attack.criticalTable];
}
