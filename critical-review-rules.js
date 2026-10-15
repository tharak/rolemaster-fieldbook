import {criticalTokens} from './critical-presentation.js';
export const reviewReasons = {
  missing:'Missing or unavailable result',
  condition:'Possible conditional result: GM should review the applicable branch',
  review:'Explicit uncertainty or GM interpretation',
  duration:'Penalty/status duration is not specified',
  notation:'Unrecognized or ambiguous effect notation',
  prose:'Prose in the effect field: check source/OCR boundaries',
  ocr:'Suspicious OCR or parser/presentation mismatch',
};
// The published manifest identifies the critical-strike family. No table numbers
// are enumerated here; each entry is loaded and its critical schema is validated.
export function criticalReferences(manifest) {
  if (!Array.isArray(manifest)) throw new Error('Table manifest must be an array.');
  return manifest.filter(entry => typeof entry?.code==='string' && entry.code.startsWith('A-10.10.'));
}
export function reviewCell(cell) {
  const reasons = new Set();
  const description = typeof cell?.description==='string' ? cell.description : '';
  const effect = typeof cell?.effect==='string' ? cell.effect : '';
  const combined = description+' '+effect;
  if (!cell || !description.trim() || (cell.effect!==undefined&&typeof cell.effect!=='string')) reasons.add('missing');
  // Ordinary prose such as 'with too much effort' is not an equipment branch.
  const branch=/\b(?:if|unless|w\/o)\b/i.test(combined) || /\b(?:with|without|w\/)\b/i.test(effect) || /\b(?:with|without)\s+(?:(?:a|an|the|his|her|your|any|no)\s+)?(?:armor|armour|helmet|helm|shield|greaves?|leg|arm|chest|abdominal|waist|nose|backpack|shoulder|thigh|neck)\b/i.test(description);
  if (branch) reasons.add('condition');
  if (/\b(?:GM|gamemaster|review|uncertain|unclear|interpret|variable|random|choose)\b|\?{2,}|\[.*?\]/i.test(combined)) reasons.add('review');
  const tokens = criticalTokens(effect);
  const descriptionRemainder=criticalTokens(description).filter(token=>token.text!==undefined).map(token=>token.text).join('');
  if (/[\u0370-\u03ff\u2200-\u22ff]/.test(descriptionRemainder)) reasons.add('notation');
  const explicitDuration = /\b(?:permanent(?:ly)?|until|healed|healing)\b|\bfor\s+(?:\d+|one|two|three)\s+(?:round|rnd|hour|day|week|month|year)/i.test(description);
  // Bare status symbols and bonuses have a documented one-round convention.
  // Bleeding is a rate until treated, not a status with a missing round count.
  if (!explicitDuration && tokens.some(token => token.raw && /^\(\s*[-−–]/.test(token.raw))) reasons.add('duration');
  if (!explicitDuration && /\b(?:stunned|must parry|unable to parry|cannot parry)\b/i.test(description) && !/\d+\s*(?:round|rnd|hour|day|week|month|year)/i.test(description) && !tokens.some(t=>t.raw&&/[∑∏π]/.test(t.raw))) reasons.add('duration');
  const remaining = tokens.filter(t=>t.text!==undefined).map(t=>t.text).join('').replace(/[\s–—−,;:.!\-]/g,'');
  if (remaining) {
    if (/[\d+()∑∏π∫H]|[^\x20-\x7e]/.test(remaining)) reasons.add('notation');
    if (/[a-z]/i.test(remaining)) reasons.add('prose');
    // Any unknown remainder, including novel punctuation, must never be green.
    if (!/[a-z]/i.test(remaining)) reasons.add('notation');
  }
  if (criticalTokens(description).some(token=>token.raw) || /\d+\s+∫|∑π|π\s*\(/.test(effect) || /::|\b(\w+)\s+\1\b/i.test(combined) || /[�]|\b\d+\s*(?:∑|∏|π|∫)/.test(description)) reasons.add('ocr');
  const keys=[...reasons];
  return {status:keys.length?'yellow':'green',reasons:keys,description,effect};
}
export function reviewTable(reference, table, error) {
  const valid = table?.kind==='critical' && Array.isArray(table.columns) && table.columns.length>0 && table.columns.every(c=>typeof c?.label==='string') && Array.isArray(table.rows) && table.rows.length>0 && table.rows.every(r=>r && (!Array.isArray(r.cells)||r.cells.length<=table.columns.length));
  if (error || !valid) return {reference,error:String(error?.message||error||'Missing/invalid critical table rows or columns.'),rows:[],green:0,yellow:0,total:0};
  const rows=table.rows.map(row=>({roll:String(row.roll??'?'),cells:table.columns.map((column,index)=>({...reviewCell(row.roll?row.cells?.[index]:null),column:column.label,group:column.group}))}));
  const cells=rows.flatMap(r=>r.cells),yellow=cells.filter(c=>c.status==='yellow').length;
  return {reference,columns:table.columns,rows,error:null,green:cells.length-yellow,yellow,total:cells.length};
}
