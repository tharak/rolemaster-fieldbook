import {esc} from './dom.js';
import {criticalDuration} from './critical-duration.js';
import {criticalDeath,criticalDeathLabel} from './critical-death.js';
const preferenceKey = 'rolemaster-coliseum-emojis-v1';
let emojis = false;
try { emojis = localStorage.getItem(preferenceKey) === 'true'; } catch { /* Symbols/text by default. */ }
export const useEmojis = () => emojis;
export function setUseEmojis(value) {
  emojis = Boolean(value);
  try { localStorage.setItem(preferenceKey,String(emojis)); } catch { /* Optional persistence. */ }
  refreshCriticalEffects();
}
export function refreshCriticalEffects(root = document) {
  root.querySelectorAll('[data-critical-raw]').forEach(el => { el.innerHTML = formatCriticalEffect(el.dataset.criticalRaw,emojis,el.dataset.criticalContext||''); });
}
export const criticalLegend = [
  ['+nH','Extra hits','💥'], ['n∑','Stunned','🌀'], ['n∏','Unable to parry','🚫'],
  ['n∑∏','Stunned and unable to parry','🌀🚫'], ['nπ','Must parry','🛡️'],
  ['n(π−p)','Must parry at −p','🛡️'], ['n∫','Bleeding: n hits per round','🩸'],
  ['n(−p)','Penalty −p','➖'], ['n(+b)','Attacker bonus +b','➕'],
  ['foe dies in n rounds / instantly','Dies (unless healed before countdown expires)','☠️'],
];
// Longest compounds first. Only recognized shorthand tokens are transformed;
// conditional prose, punctuation, bare numbers and uncertain OCR stay literal.
export function criticalTokens(raw, context = '') {
  const input = String(raw || '');
  const patterns = [
    [/^all allies get\s+\(?\+(\d+)\)?(?:\s+for\s+(\d+)\s+rounds?)?/i,m => ['All allies bonus: +'+m[1]+' for '+(m[2]||1)+' round'+((m[2]||'1')==='1'?'':'s')+' (GM-managed)','➕']],
    [/^\+(\d*)H\b/,m => ['Extra hits: '+(m[1]===''?'1':m[1]),'💥']],
    [/^(\d*)\(\s*(\d*)π\s*(?:[-−–]\s*(\d+))?\s*\)/,m => ['Must parry: '+(Number(m[1]||m[2])||1)+' rounds'+(Number(m[3])?' at −'+m[3]:''),'🛡️']],
    [/^(\d*)π\s*\(\s*[-−–]\s*(\d+)\s*\)/,m => ['Must parry: '+(Number(m[1])||1)+' rounds at −'+m[2],'🛡️']],
    [/^(\d*)∑∏/,m => ['Stunned and unable to parry: '+(Number(m[1])||1)+' rounds','🌀🚫']],
    [/^(\d*)∑/,m => ['Stunned: '+(Number(m[1])||1)+' rounds','🌀']],
    [/^(\d*)∏/,m => ['Unable to parry: '+(Number(m[1])||1)+' rounds','🚫']],
    [/^(\d*)π/,m => ['Must parry: '+(Number(m[1])||1)+' rounds','🛡️']],
    [/^(\d*\s*)∫/,m => ['Bleeding: '+(Number(m[1])||1)+' hits per round','🩸']],
    [/^(\d*)\(\s*([-−–+])\s*(\d+)\s*\)/,m => [m[2]==='+' ? 'Attacker bonus: +'+m[3]+' for '+(Number(m[1])||1)+' rounds' : 'Penalty: −'+m[3]+(m[1]?' for '+m[1]+' rounds':' for 1 round'),m[2]==='+'?'➕':'➖']],
  ];
  const result = [];
  let plain = '';
  for (let i=0;i<input.length;) {
    let found;
    const initiative=/^you gain the initiative\b/i.exec(input.slice(i));
    const death=criticalDeath(input.slice(i));
    if(death?.index===0)found={raw:death.raw,label:criticalDeathLabel(death),emoji:'☠️',death:true};
    if(initiative)found={raw:initiative[0],label:'Attacker wins initiative next round (no roll)',initiative:true};
    for (const [pattern,label] of patterns) {
      if(found)break;
      const match = pattern.exec(input.slice(i));
      if (match) { const [meaning,emoji]=label(match); found={raw:match[0],label:meaning.replace(/\b1 rounds\b/,'1 round'),emoji}; break; }
    }
    if (found) {
      if(!found.initiative&&!found.death){
        const kind=found.label.startsWith('Stunned and')?'stunNoParry':found.label.startsWith('Stunned:')?'stun':found.label.startsWith('Unable')?'noParry':found.label.startsWith('Must')?'mustParry':found.label.startsWith('Penalty')?'penalty':found.label.startsWith('Attacker')?'bonus':null;
        if(kind){
          const compound=/^(\d*)\(\s*(\d*)π/.exec(found.raw);
          const count=compound?(compound[1]||compound[2]):/^\d*/.exec(found.raw)[0];
          const duration=criticalDuration(count,kind,context+'. '+input);
          const prefix=found.label.split(':')[0]+': ';
          const amount=/[−+]\d+/.exec(found.label)?.[0];
          const timing=duration.roundsLeft===null?(/^(?:until|for) /.test(duration.label)?duration.label:duration.label):'for '+duration.label;
          found.label=prefix+(kind==='penalty'||kind==='bonus'?amount+' '+timing:duration.label+(kind==='mustParry'&&amount?' at '+amount:''));
          found.duration=duration;
        }
      }
      if (plain) { result.push({text:plain}); plain=''; }
      result.push(found); i+=found.raw.length;
    } else { plain+=input[i++]; }
  }
  if (plain) result.push({text:plain});
  return result;
}
export function formatCriticalEffect(raw, emojiMode = emojis, context = '') {
  return criticalTokens(raw,context).map(token => token.text !== undefined ? esc(token.text) : token.initiative ? '<strong class="critical-initiative">'+esc(token.label)+'</strong>' : emojiMode
    ? '<span class="critical-token" role="img" aria-label="'+esc(token.label)+'" title="'+esc(token.label)+'">'+token.emoji+' <strong>'+esc(token.label.slice(token.label.indexOf(':')+1).trim())+'</strong></span> '
    : '<strong class="critical-token">'+esc(token.label)+'</strong> ').join('');
}
export function criticalEffectMarkup(raw, context = '') {
  return '<span data-critical-raw="'+esc(raw)+'" data-critical-context="'+esc(context)+'">'+formatCriticalEffect(raw,emojis,context)+'</span>';
}
