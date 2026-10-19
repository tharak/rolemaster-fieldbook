import {generateEncounter,densities,terrains,travelModes} from './encounter-generation-rules.js';
import {creatureCatalog} from './coliseum-rules.js';
import {masterCharacterCatalog,characterContenders} from './coliseum-contenders.js';
import {esc} from './dom.js';
const panel=document.createElement('details');panel.className='play-card encounter-generator';panel.id='encounter-generator';
document.querySelector('#encounter-list-view').prepend(panel);
const select=(name,label,values,selected)=>`<label>${label}<select name="${name}">${values.map(value=>`<option ${value===selected?'selected':''}>${esc(value)}</option>`).join('')}</select></label>`;
const number=(name,label,value,min=0)=>`<label>${label}<input name="${name}" type="number" step="1" min="${min}" value="${value}" required></label>`;
panel.innerHTML=`<summary>Random encounter · T-5.1</summary><p>Roll activity and avoidance for a journey or camp. Both are open-ended d100 rolls.</p><form class="generator-form">${select('density','Population density',densities,'Moderate')}${select('terrain','Terrain',Object.keys(terrains),'Open')}${select('travel','Travel mode',Object.keys(travelModes),'Normal walk')}${number('full','Full-count members',1)}${number('half','Half-count members',0)}${select('campHours','Camp after travel (hours)',['0','8','12','16'],'0')}${number('activityExtra','Other activity modifier',0,-10000)}${number('avoidanceExtra','Other avoidance modifier',0,-10000)}<div>${[['hostile','Hostile inhabitants'],['patrolled','Patrolled area'],['hueCry','Hue and cry'],['night','At night (−50 only while traveling)'],['nightAdapted','Night-adapted inhabitants'],['searching','Actively searching']].map(([name,label])=>`<label><input type="checkbox" name="${name}"> ${label}</label>`).join('')}</div><p>Rangers, Animists, Elves and Halflings each count half, once per member. Enter each person in one count only. Fractional totals round up to the next printed group-size band. Use “other” modifiers for spells, lighting or flying/boat/ship travel. Camp 0 means traveling.</p><button class="button button-dark" type="submit">Generate encounter</button></form><div data-generated-result role="status"></div><div data-generated-opponent hidden><h3>Optional Coliseum opponent</h3><p>T-5.1 leaves species, number and strength to the GM. This suggestion picks one opponent from the selected level range; Coliseum supports one-on-one duels.</p><div class="generator-form">${number('minLevel','Minimum foe level',1)}${number('maxLevel','Maximum foe level',5)}<label>Opponent<select name="foe"></select></label><label>Your contender<select name="hero"></select></label><button type="button" class="button button-quiet" data-suggest>Suggest another</button><button type="button" class="button button-dark" data-fight>Fight in Coliseum</button></div></div><p data-generator-message role="status"></p>`;
let generated=null,catalog=null;
const input=name=>panel.querySelector(`[name="${name}"]`);
const message=text=>{panel.querySelector('[data-generator-message]').textContent=text;};
async function loadCatalog(){
  if(catalog)return catalog;
  const data=await Promise.all(['creatures','T-5.8'].map(async code=>{const response=await fetch(`tables/${code}.json`);if(!response.ok)throw new Error('Could not load opponents. Generate again to retry.');return response.json();}));
  catalog=[...creatureCatalog(data[0]),...masterCharacterCatalog(data[1])];return catalog;
}
function refreshHeroes(){
  const previous=input('hero').value;
  const heroes=characterContenders(window.RolemasterEncounter?.roster()||[]).filter(hero=>!hero.unavailable);
  input('hero').innerHTML='<option value="">Current Coliseum contender</option>'+heroes.map(hero=>`<option value="${esc(hero.id)}">${esc(hero.name)}</option>`).join('');
  if(heroes.some(hero=>hero.id===previous))input('hero').value=previous;
}
function suggest(){
  if(!catalog||!generated)return;
  const min=Number(input('minLevel').value),max=Number(input('maxLevel').value);
  if(!Number.isInteger(min)||!Number.isInteger(max)||min<0||max<min){input('foe').replaceChildren();panel.querySelector('[data-fight]').disabled=true;message('Choose a valid minimum and maximum level.');return;}
  const choices=catalog.filter(foe=>foe.level>=min&&foe.level<=max&&(generated.type==='social'?foe.sourceKind==='master':foe.group==='Animal'));
  input('foe').innerHTML=choices.map(foe=>`<option value="${esc(foe.id)}">${esc(foe.name)} · Level ${foe.level}</option>`).join('');
  if(choices.length)input('foe').selectedIndex=Math.floor(Math.random()*choices.length);
  message(choices.length?'Choose any listed opponent or use the random suggestion.':'No opponents in this level range. Change the range to continue.');
  panel.querySelector('[data-fight]').disabled=!choices.length;refreshHeroes();
}
panel.querySelector('form').addEventListener('submit',async event=>{
  event.preventDefault();message('');
  try{
    const options=Object.fromEntries([...event.target.elements].filter(el=>el.name).map(el=>[el.name,el.type==='checkbox'?el.checked:el.type==='number'||el.name==='campHours'?Number(el.value):el.value]));
    generated=generateEncounter(options);
    const r=generated;
    panel.querySelector('[data-generated-result]').innerHTML=`<h3>${esc(r.label)}${r.type==='none'?'':` · ${r.type==='wild'?'Wild beasts':'Social beings'}`}</h3><p>Activity ${r.activity.dice.join(', ')} → ${r.activity.total} + (${Object.values(r.activityModifiers).reduce((a,b)=>a+b,0)}) = ${r.activityTotal}. Avoidance ${r.avoidance.dice.join(', ')} → ${r.avoidance.total} + (${Object.values(r.avoidanceModifiers).reduce((a,b)=>a+b,0)}) = ${r.avoidanceTotal}.</p><p>Result ${r.result} · ${esc(options.density)} · ${r.cell}${r.tieRoll===null?'':` · Type roll ${r.tieRoll} (01–50 wild; 51–100 social)`}. Group weight ${r.group.weighted}, band ${r.group.count}. ${r.frequency}.</p><details><summary>Modifier breakdown</summary><p>Activity: ${Object.entries(r.activityModifiers).map(([k,v])=>`${k} ${v}`).join(' · ')}</p><p>Avoidance: ${Object.entries(r.avoidanceModifiers).map(([k,v])=>`${k} ${v}`).join(' · ')}</p></details>`;
    panel.querySelector('[data-generated-opponent]').hidden=r.type==='none';
    if(r.type!=='none'){await loadCatalog();suggest();}
  }catch(error){message(error.message);}
});
panel.querySelector('[data-suggest]').addEventListener('click',suggest);
for(const name of ['minLevel','maxLevel'])input(name).addEventListener('change',suggest);
panel.querySelector('[data-fight]').addEventListener('click',()=>{
  if(!input('foe').value)return;
  window.dispatchEvent(new CustomEvent('rolemaster-coliseum-encounter',{detail:{foeId:input('foe').value,heroId:input('hero').value}}));
});
window.addEventListener('rolemaster-roster-updated',refreshHeroes);
refreshHeroes();
