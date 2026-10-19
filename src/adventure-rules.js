// Original adventure pacing and geography. T-5.1 and §23 remain separate rules.
import {generateEncounter} from './encounter-generation-rules.js';
import {seededRandom} from '../vendor/rolemaster-core/src/random.js';
export {seededRandom};
export const regions=[
 {name:'The Green Marches',terrain:'Road',density:'Moderate',danger:1,color:'#b6bb83'},
 {name:'The Elderwood',terrain:'Forest',density:'Light',danger:1,color:'#829b78'},
 {name:'The Old Kingdom',terrain:'Open',density:'Moderate',danger:2,color:'#b6ae7b'},
 {name:'The High Spine',terrain:'Mountainous',density:'Sparse',danger:2,color:'#a3a395'},
 {name:'The Riverlands',terrain:'Forest and Rough',density:'Light',danger:2,color:'#97a68a'},
 {name:'The Ashen East',terrain:'Rough',density:'Waste',danger:3,color:'#998c77'}];
const names=[['Hearth','Clover','Willow','Briar'],['Silver','Alder','Elder','Moss'],['King','Crown','Amber','Grey'],['Storm','Eagle','Iron','Frost'],['Reed','White','River','Moon'],['Ash','Cinder','Black','Ember']];
const kinds=[['haven','village','inn'],['grove','sanctuary','watch'],['ruins','citadel','crossing'],['pass','hold','gate'],['ford','haven','tower'],['watch','ruins','spire']];
export function generateWorld(seed){
 const random=seededRandom(seed),nodes=[];
 for(let row=0;row<3;row++)for(let col=0;col<6;col++){
  const kind=kinds[col][row],prefix=names[col][Math.floor(random()*4)];
  nodes.push({id:`${col}-${row}`,col,row,x:155+col*142+Math.round(random()*32-16),y:155+row*175+Math.round(random()*36-18),name:`${prefix}${['haven','ford','hold','watch'].includes(kind)?'':' '}${kind}`,kind,region:col});
 }
 const edges=[];
 const add=(a,b)=>{const region=Math.max(nodes.find(n=>n.id===a).col,nodes.find(n=>n.id===b).col),steps=region===3?3:[1,4,5].includes(region)?2:1;edges.push({id:[a,b].sort().join(':'),a,b,miles:12,steps,region});};
 for(let row=0;row<3;row++)for(let col=0;col<5;col++)add(`${col}-${row}`,`${col+1}-${row}`);
 for(let col=0;col<6;col++){add(`${col}-0`,`${col}-1`);if(random()>0.3||col===0)add(`${col}-1`,`${col}-2`);}
 return {seed:String(seed),nodes,edges,start:'0-1',goal:`5-${Math.floor(random()*3)}`};
}
export const connectingEdge=(world,a,b)=>world.edges.find(e=>(e.a===a&&e.b===b)||(e.b===a&&e.a===b));
export function findRoute(world,from,to){
 if(!world.nodes.some(n=>n.id===from)||!world.nodes.some(n=>n.id===to))throw new Error('Choose a location on this map.');
 const costs=new Map([[from,0]]),previous=new Map(),open=new Set(world.nodes.map(n=>n.id));
 while(open.size){const here=[...open].sort((a,b)=>(costs.get(a)??Infinity)-(costs.get(b)??Infinity))[0];if(!costs.has(here))break;open.delete(here);if(here===to)break;
  for(const edge of world.edges.filter(e=>e.a===here||e.b===here)){const next=edge.a===here?edge.b:edge.a,cost=costs.get(here)+edge.steps;if(cost<(costs.get(next)??Infinity)){costs.set(next,cost);previous.set(next,here);}}
 }
 if(!costs.has(to))throw new Error('No route reaches that destination.');
 const route=[];for(let cursor=to;cursor!==from;cursor=previous.get(cursor))route.unshift(cursor);return route;
}
export function createAdventure({id,seed,title,party,goal}){
 const world=generateWorld(seed);
 if(!id||!String(seed).trim()||!party?.length||party.length>6||new Set(party.map(p=>p.id)).size!==party.length)throw new Error('Choose one to six different saved characters.');
 if(!world.nodes.some(n=>n.id===goal)||goal===world.start)throw new Error('Choose a destination beyond the starting village.');
 return {version:1,id,seed:String(seed),title:String(title||'There and beyond').slice(0,70),party:party.map(({id,name,race,profession,level})=>({id,name,race,profession,level})),goal,current:world.start,route:findRoute(world,world.start,goal),leg:null,hours:0,travelSinceRest:0,miles:0,travelXp:0,explored:[world.start],visitedEdges:[],journal:[],pending:null,completed:false,awarded:[]};
}
export function setCourse(adventure,destination){
 if(adventure.completed||adventure.pending||adventure.leg)throw new Error('Finish the current stage and resolve encounters before changing course.');
 return {...adventure,route:findRoute(generateWorld(adventure.seed),adventure.current,destination)};
}
export function advanceAdventure(adventure,{camp=false}={},d100){
 if(adventure.completed)throw new Error('This adventure is complete.');
 if(adventure.pending)throw new Error('Resolve the encounter before continuing.');
 if(!camp&&adventure.travelSinceRest>=16)throw new Error('Make camp before traveling further.');
 const next=structuredClone(adventure),world=generateWorld(next.seed);let region,entry;
 if(camp){
  const regionIndex=next.leg?connectingEdge(world,next.leg.from,next.leg.to).region:world.nodes.find(n=>n.id===next.current).region;region=regions[regionIndex];
  entry={kind:'camp',text:'Made camp for eight hours.'};next.hours+=8;
 }else{
  if(!next.leg){const to=next.route.shift();if(!to)throw new Error('Choose a destination on the map.');const edge=connectingEdge(world,next.current,to);if(!edge)throw new Error('The route is invalid.');next.leg={from:next.current,to,edgeId:edge.id,progress:0,unfamiliar:!next.visitedEdges.includes(edge.id)};if(next.leg.unfamiliar)next.visitedEdges.push(edge.id);}
  const edge=connectingEdge(world,next.leg.from,next.leg.to);region=regions[edge.region];
  const miles=Math.floor(edge.miles*(next.leg.progress+1)/edge.steps)-Math.floor(edge.miles*next.leg.progress/edge.steps);
  next.leg.progress++;next.miles+=miles;next.hours+=4;next.travelSinceRest+=4;
  if(next.leg.unfamiliar)next.travelXp+=miles*region.danger;
  const name=world.nodes.find(n=>n.id===next.leg.to).name;
  entry={kind:'travel',text:`Traveled ${miles} miles toward ${name}.`,miles};
  if(next.leg.progress===edge.steps){next.current=next.leg.to;next.leg=null;next.explored=[...new Set([...next.explored,next.current])];entry.text+=` Arrived at ${name}.`;}
 }
 const half=next.party.filter(p=>/^(Ranger|Animist)$/i.test(p.profession)||/elf|elves|halfling/i.test(p.race)).length;
 const midpointHour=(6+adventure.hours+(camp?4:2))%24;
 const encounter=generateEncounter({density:region.density,terrain:region.terrain,full:next.party.length-half,half,hostile:region.danger===3,night:midpointHour>=18||midpointHour<6,nightAdapted:region.danger===3,campHours:camp?Math.max(1,next.travelSinceRest):0},d100);
 if(camp)next.travelSinceRest=0;
 entry.hour=next.hours;entry.encounter=encounter;next.journal.unshift(entry);
 if(encounter.type!=='none')next.pending={id:`${next.id}:${next.hours}`,encounter,region:region.name,result:null};
 return next;
}
export function resolveAdventureEncounter(adventure,note){
 if(!adventure.pending||!String(note).trim())throw new Error('Record how the encounter was resolved.');
 const next=structuredClone(adventure);next.journal.unshift({kind:'resolution',hour:next.hours,text:String(note).trim().slice(0,300)});next.pending=null;return next;
}
export function completeAdventure(adventure){
 if(adventure.completed)throw new Error('This adventure is already complete.');
 if(adventure.pending||adventure.leg||adventure.current!==adventure.goal)throw new Error('Reach the quest destination and resolve outstanding encounters first.');
 return {...adventure,completed:true,route:[],journal:[{kind:'quest',hour:adventure.hours,text:'The fellowship completed its mission at the destination.'},...adventure.journal]};
}
export function validAdventure(value){
 if(value?.version!==1||typeof value.id!=='string'||typeof value.seed!=='string'||!value.seed||!Array.isArray(value.party)||!value.party.length||value.party.length>6||!value.party.every(p=>p&&typeof p.id==='string')||!['route','explored','visitedEdges','journal','awarded'].every(k=>Array.isArray(value[k]))||!['hours','travelSinceRest','miles','travelXp'].every(k=>Number.isSafeInteger(value[k])&&value[k]>=0))return false;
 if(!value.journal.every(e=>e&&typeof e.text==='string'&&Number.isFinite(e.hour))||!value.awarded.every(id=>typeof id==='string'))return false;
 const world=generateWorld(value.seed),exists=id=>world.nodes.some(n=>n.id===id);
 return exists(value.current)&&exists(value.goal)&&value.route.every(exists)&&(!value.leg||(connectingEdge(world,value.leg.from,value.leg.to)&&Number.isInteger(value.leg.progress)&&value.leg.progress>=0&&value.leg.progress<connectingEdge(world,value.leg.from,value.leg.to).steps))&&(!value.pending||typeof value.pending.id==='string'&&value.pending.encounter&&['wild','social'].includes(value.pending.encounter.type));
}
