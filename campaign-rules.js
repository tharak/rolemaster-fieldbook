// Core Rules §24.6. Categories remain intact; restrictions never delete records.
export const campaignDefaults={name:'Core Rules',races:['Common Man','High Man','Wood Elf','Dwarf','Halfling'],excludedSkills:[],excludedWeapons:[],bodyFixed:10};
export function validateCampaign(value){
 if(!value||![10,15,20].includes(Number(value.bodyFixed)))throw new Error('Choose a fixed Body Development bonus of 10, 15 or 20.');
 if(!Array.isArray(value.races)||!value.races.length||value.races.some(r=>!campaignDefaults.races.includes(r)))throw new Error('Keep at least one supported character race.');
 for(const key of ['excludedSkills','excludedWeapons'])if(!Array.isArray(value[key])||value[key].some(v=>typeof v!=='string'))throw new Error('Use a list of names.');
 if(value.excludedSkills.some(v=>!v.includes(':')||v==='Body Development:Body Development'))throw new Error('Skills use Category:Skill; retain Body Development.');
 return {name:String(value.name||'Campaign').slice(0,100),races:[...new Set(value.races)],excludedSkills:[...new Set(value.excludedSkills)],excludedWeapons:[...new Set(value.excludedWeapons)],bodyFixed:Number(value.bodyFixed)};
}
export function readCampaign(){try{const saved=JSON.parse(globalThis.localStorage?.getItem('rolemaster-campaign-rules-v1')||'null');return saved?validateCampaign(saved):structuredClone(campaignDefaults);}catch{return structuredClone(campaignDefaults);}}
const normalized=s=>String(s).trim().toLowerCase().replace(/[^a-z0-9]/g,'');
export function weaponAllowed(name,rules=readCampaign()){return ![...rules.excludedWeapons,...rules.excludedSkills.filter(s=>s.startsWith('Weapon •')).map(s=>s.slice(s.indexOf(':')+1))].some(n=>normalized(n)===normalized(name));}
export function skillAllowed(category,name,rules=readCampaign()){return !rules.excludedSkills.includes(category+':'+name)&&(!category.startsWith('Weapon •')||weaponAllowed(name,rules));}
export function fixedSkillBonus(category,rules=readCampaign()){return category==='Body Development'?rules.bodyFixed:0;}
export function campaignHits(record,rules=readCampaign()){const hits=Number(record.hits)||0;return record.bodyDevelopmentFixed==null?hits:Math.max(0,hits+rules.bodyFixed-Number(record.bodyDevelopmentFixed));}
