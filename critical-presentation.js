import {esc} from './dom.js';
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
  root.querySelectorAll('[data-critical-raw]').forEach(el => { el.innerHTML = formatCriticalEffect(el.dataset.criticalRaw); });
}
export const criticalLegend = [
  ['+nH','Extra hits','💥'], ['n∑','Stunned','🌀'], ['n∏','Unable to parry','🚫'],
  ['n∑∏','Stunned and unable to parry','🌀🚫'], ['nπ','Must parry','🛡️'],
  ['n(π−p)','Must parry at −p','🛡️'], ['n∫','Bleeding: n hits per round','🩸'],
  ['n(−p)','Penalty −p','➖'], ['n(+b)','Attacker bonus +b','➕'],
];
// Longest compounds first. Only recognized shorthand tokens are transformed;
// conditional prose, punctuation, bare numbers and uncertain OCR stay literal.
export function criticalTokens(raw) {
  const input = String(raw || '');
  const patterns = [
    [/^\+(\d+)H\b/,m => ['Extra hits: '+m[1],'💥']],
    [/^(\d*)\(\s*(\d*)π\s*[-−–]\s*(\d+)\s*\)/,m => ['Must parry: '+(Number(m[1]||m[2])||1)+' rounds at −'+m[3],'🛡️']],
    [/^(\d*)∑∏/,m => ['Stunned and unable to parry: '+(Number(m[1])||1)+' rounds','🌀🚫']],
    [/^(\d*)∑/,m => ['Stunned: '+(Number(m[1])||1)+' rounds','🌀']],
    [/^(\d*)∏/,m => ['Unable to parry: '+(Number(m[1])||1)+' rounds','🚫']],
    [/^(\d*)π/,m => ['Must parry: '+(Number(m[1])||1)+' rounds','🛡️']],
    [/^(\d*\s*)∫/,m => ['Bleeding: '+(Number(m[1])||1)+' hits per round','🩸']],
    [/^(\d*)\(\s*([-−–+])\s*(\d+)\s*\)/,m => [m[2]==='+' ? 'Attacker bonus: +'+m[3]+' for '+(Number(m[1])||1)+' rounds' : 'Penalty: −'+m[3]+(m[1]?' for '+m[1]+' rounds':' (duration not specified)'),m[2]==='+'?'➕':'➖']],
  ];
  const result = [];
  let plain = '';
  for (let i=0;i<input.length;) {
    let found;
    for (const [pattern,label] of patterns) {
      const match = pattern.exec(input.slice(i));
      if (match) { const [meaning,emoji]=label(match); found={raw:match[0],label:meaning.replace(/\b1 rounds\b/,'1 round'),emoji}; break; }
    }
    if (found) {
      if (plain) { result.push({text:plain}); plain=''; }
      result.push(found); i+=found.raw.length;
    } else { plain+=input[i++]; }
  }
  if (plain) result.push({text:plain});
  return result;
}
export function formatCriticalEffect(raw, emojiMode = emojis) {
  return criticalTokens(raw).map(token => token.text !== undefined ? esc(token.text) : emojiMode
    ? '<span class="critical-token" role="img" aria-label="'+esc(token.label)+'" title="'+esc(token.label)+'">'+token.emoji+' <strong>'+esc(token.label.slice(token.label.indexOf(':')+1).trim())+'</strong></span> '
    : '<strong class="critical-token">'+esc(token.label)+'</strong> ').join('');
}
export function criticalEffectMarkup(raw) {
  return '<span data-critical-raw="'+esc(raw)+'">'+formatCriticalEffect(raw)+'</span>';
}
