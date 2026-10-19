import {newGame,hireMember,levelMembers,validGame} from './guild-game-rules.js';
import {guildContender,printedContender} from './guild-rules.js';
import {simulateGuildBattle} from './guild-battle.js?v=20261019-playback-1';
import {seededRandom} from './adventure-rules.js';

export const arenaSaveKey='rolemaster-coliseum-v1';
export const themes=[
 {id:'raiders',name:'Goblin raiders',description:'A warband from the borderlands.',matches:c=>/^(Goblin|Hobgoblin|Orc \(fighter\)|Orc \(leader\)|Orc \(commander\))$/.test(c.name)},
 {id:'crypt',name:'The restless crypt',description:'The dead march into the arena.',matches:c=>/^Undead/.test(c.name)},
 {id:'hive',name:'The giant hive',description:'Armored mandibles and relentless claws.',matches:c=>/^(Ant|Beetle|Crab) \(Giant/.test(c.name)},
 {id:'beasts',name:'Wild hunt',description:'Predators brought down from the hills.',matches:c=>/^(Weasel|Wolverine|Wolf|Boar|Wildcat|Cat \(|Lion|Tiger|Bear \(Charging)/.test(c.name)},
 {id:'rivals',name:'Rival company',description:'Mercenaries seeking their own arena glory.',matches:c=>c.sourceKind==='master'}
];
const copy=value=>structuredClone(value);
export const injuryPenalty=member=>(member.injuries||[]).reduce((sum,wound)=>sum+wound.penalty,0);
export const canFight=member=>!member.dead&&member.damage<member.hits;
export function strength(unit){return Math.max(1,unit.level*2+unit.hits/10+Math.max(0,...unit.attacks.filter(Boolean).map(a=>a.ob||0))/10+(unit.db||0)/20);}
export function difficulty(offer,members){
 const power=members.reduce((sum,m)=>sum+strength(m)*Math.max(.25,(m.hits-m.damage)/m.hits)/(1+injuryPenalty(m)/30),0);
 if(!power)return 'Select fighters';
 const ratio=offer.enemies.reduce((sum,e)=>sum+strength(e),0)/power;
 return ratio<.7?'Favorable':ratio<1.15?'Even match':ratio<1.6?'Dangerous':'Very dangerous';
}
export function generateOffers(state,opponents){
 const next=copy(state),revision=next.arena.revision+1,random=seededRandom(`${next.management.seed}:offers:${revision}`);
 const strongest=[...next.members].sort((a,b)=>strength(b)-strength(a)).slice(0,3);
 const budget=Math.max(10,strongest.reduce((sum,m)=>sum+strength(m),0));
 const level=Math.max(1,...strongest.map(m=>m.level));
 const pools=themes.map(theme=>({theme,pool:opponents.filter(c=>theme.matches(c)&&c.level<=level+3&&c.attacks.some(a=>a&&!a.both))})).filter(p=>p.pool.length);
 if(pools.length<3)throw new Error('Not enough enemy themes are available.');
 for(let i=pools.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pools[i],pools[j]]=[pools[j],pools[i]];}
 next.arena.revision=revision;
 next.arena.offers=pools.slice(0,3).map(({theme,pool},slot)=>{
  const target=budget*[.65,1,1.35][slot],enemies=[];let total=0;
  while(enemies.length<4&&total<target*.85){
   const affordable=pool.filter(c=>strength(c)<=Math.max(target-total,target*.6));
   const choices=affordable.length?affordable:[...pool].sort((a,b)=>strength(a)-strength(b)).slice(0,1);
   const template=choices[Math.floor(random()*choices.length)],index=enemies.length;
   const enemy=printedContender(template,`${next.management.seed}:${revision}:${slot}:${index}`);
   enemy.id=`arena-enemy-${revision}-${slot}-${index}`;enemy.name=`${template.name} ${index+1}`;
   enemies.push(enemy);total+=strength(enemy);
  }
  return {id:`offer-${revision}-${slot}`,theme:theme.id,name:theme.name,description:theme.description,enemies,gold:Math.max(3,Math.ceil(total/2)),xp:Math.max(10,Math.ceil(total*2)),seed:`${next.management.seed}:battle:${revision}:${slot}`};
 });
 return next;
}
export function newArena(seed,opponents){
 const state=newGame(seed);state.name='Wayfarers’ Coliseum';
 state.arena={version:1,revision:0,day:1,offers:[],reports:[]};
 return generateOffers(state,opponents);
}
export function recruitArena(state,template,name){
 const next=hireMember(state,template,name);next.members.at(-1).injuries=[];return next;
}
export function validArena(state){
 return validGame(state)&&state.arena?.version===1&&Number.isSafeInteger(state.arena.revision)&&state.arena.revision>0&&Number.isSafeInteger(state.arena.day)&&state.arena.day>0&&Array.isArray(state.arena.offers)&&state.arena.offers.length<=3&&new Set(state.arena.offers.map(o=>o.id)).size===state.arena.offers.length&&state.arena.offers.every(o=>typeof o.id==='string'&&typeof o.seed==='string'&&typeof o.name==='string'&&typeof o.description==='string'&&Number.isSafeInteger(o.gold)&&o.gold>0&&Number.isSafeInteger(o.xp)&&o.xp>0&&Array.isArray(o.enemies)&&o.enemies.length>0&&o.enemies.length<=4&&o.enemies.every(e=>typeof e.id==='string'&&typeof e.name==='string'&&Number.isFinite(e.hits)&&e.hits>0&&Array.isArray(e.attacks)))&&Array.isArray(state.arena.reports)&&state.arena.reports.length<=10&&state.arena.reports.every(r=>typeof r.id==='string'&&Array.isArray(r.rounds)&&Array.isArray(r.criticals)&&Array.isArray(r.rewards))&&state.members.every(m=>Array.isArray(m.injuries)&&m.injuries.every(i=>typeof i.description==='string'&&Number.isInteger(i.days)&&i.days>0&&Number.isInteger(i.penalty)&&i.penalty>0));
}
// Arena recovery is a game rule, not a claim to model every printed lasting injury.
export function woundsFromBattle(member,battle,matchId){
 const events=battle.log.flatMap(r=>r.events).filter(e=>e.target===member.id&&e.critical&&!e.critical.ignored);
 return events.filter(e=>e.mortal||e.critical.severity>='C').map((e,index)=>{
  const severity='ABCDE'.indexOf(e.critical.severity)+1;
  return {id:`${matchId}:${member.id}:${index}`,description:e.critical.description,penalty:e.mortal?20:(severity-1)*5,days:e.mortal?4:severity-1};
 });
}
export function fightArena(state,offerId,partyIds,catalog,tables){
 const offer=state.arena.offers.find(o=>o.id===offerId);
 if(!offer)throw new Error('This matchup is no longer available. Choose another.');
 if(!Array.isArray(partyIds)||!partyIds.length||partyIds.length>6||new Set(partyIds).size!==partyIds.length)throw new Error('Choose one to six different fighters.');
 const members=partyIds.map(id=>state.members.find(m=>m.id===id));
 if(members.some(m=>!m||!canFight(m)))throw new Error('Every selected fighter must be able to fight.');
 const party=members.map(member=>({...guildContender(state,member),effects:injuryPenalty(member)?[{kind:'penalty',amount:injuryPenalty(member),roundsLeft:null,starts:1}]:[]}));
 const battle=simulateGuildBattle(party,copy(offer.enemies),tables,seededRandom(offer.seed),{recordPlayback:true});
 const next=copy(state),victory=battle.winner===0,report={id:offer.id,name:offer.name,day:next.arena.day,winner:battle.winner,gold:victory?offer.gold:0,rounds:copy(battle.log),criticals:[],rewards:[],enemies:offer.enemies.map(e=>({id:e.id,name:e.name})),party:members.map(m=>({id:m.id,name:m.name})),injuries:[]};
 report.playback={...battle.playback,fighters:[...party.map(c=>({...c,team:0})),...offer.enemies.map(c=>({...c,team:1}))].map(c=>({id:c.id,name:c.name,team:c.team,maximum:c.hits,profession:c.profession||'',sourceKind:c.sourceKind||'',attacks:c.attacks.map(a=>a?{chance:a.chance,category:a.category||''}:null)}))};
 const names=new Map([...party,...offer.enemies].map(u=>[u.id,u.name]));
 for(const round of battle.log)for(const event of round.events)if(event.critical&&!event.critical.ignored)report.criticals.push({round:round.round,attacker:names.get(event.actor),defender:names.get(event.target),suffered:event.team===1,...copy(event.critical)});
 next.gold+=report.gold;
 for(const unit of battle.units.filter(u=>u.team===0)){
  const member=next.members.find(m=>m.id===unit.id),previousLevel=member.level;
  const rescued=unit.dead||unit.hits>=member.hits||unit.deathRound!==undefined;
  member.damage=rescued?member.hits-1:Math.min(member.hits-1,unit.hits);member.dead=false;member.effects=[];member.pp=Math.max(0,unit.pp);
  const wounds=woundsFromBattle(member,battle,offer.id);
  if(rescued&&!wounds.length)wounds.push({id:`${offer.id}:${member.id}:rescue`,description:'Serious arena wounds; rescued by the infirmary.',penalty:15,days:3});
  member.injuries.push(...wounds);report.injuries.push(...wounds.map(w=>({...w,name:member.name})));
  const xp=victory?offer.xp:0;member.xp+=xp;
  report.rewards.push({id:member.id,name:member.name,xp,rescued,hp:member.hits-member.damage,previousLevel});
 }
 next.arena.offers=next.arena.offers.filter(o=>o.id!==offerId);
 next.arena.reports.unshift(report);next.arena.reports=next.arena.reports.slice(0,10);
 const leveled=levelMembers(next,catalog);
 for(const reward of leveled.arena.reports[0].rewards)reward.level=leveled.members.find(m=>m.id===reward.id).level;
 return leveled;
}
export function restArena(state){
 const next=copy(state);next.arena.day++;next.hours+=24;
 for(const m of next.members){m.damage=Math.max(0,m.damage-Math.ceil(m.hits*.25));m.pp=m.ppMax;m.effects=[];m.injuries=m.injuries.flatMap(i=>i.days>1?[{...i,days:i.days-1}]:[]);}
 return next;
}
export function readArena(storage){const raw=storage.getItem(arenaSaveKey);if(!raw)return null;const state=JSON.parse(raw);if(!validArena(state))throw new Error('The Coliseum save could not be read. Reset it to start fresh.');return state;}
export function saveArena(storage,state,previous){
 if(previous&&JSON.stringify(readArena(storage))!==JSON.stringify(previous))throw new Error('The roster changed in another tab. Reload before continuing.');
 if(!validArena(state))throw new Error('The Coliseum could not be saved.');
 storage.setItem(arenaSaveKey,JSON.stringify(state));
}
