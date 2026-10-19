import {normalizedCriticalCell} from './critical-source.js';
import {resolveCriticalEquipment} from './critical-equipment.js';
import {criticalDeath,criticalDeathLabel} from './critical-death.js';
import {criticalTokens} from './critical-presentation.js';
export const reviewReasons = {
  missing:'Missing or unavailable result',
  condition:'Unsupported conditional mechanics: GM should review the applicable branch',
  review:'Explicit uncertainty or GM interpretation',
  notation:'Unrecognized or ambiguous effect notation',
  prose:'Prose in the effect field: check source/OCR boundaries',
  ocr:'Suspicious OCR or parser/presentation mismatch',
  fatal:'Unrecognized target-fatal narrative: GM review required',
};
// The published manifest identifies the critical-strike family. No table numbers
// are enumerated here; each entry is loaded and its critical schema is validated.
export function criticalReferences(manifest) {
  if (!Array.isArray(manifest)) throw new Error('Table manifest must be an array.');
  return manifest.filter(entry => typeof entry?.code==='string' && entry.code.startsWith('A-10.10.'));
}
export function reviewCell(source) {
  const cell=normalizedCriticalCell(source),reasons=new Set(),notes=[];
  const description=typeof cell?.description==='string'?cell.description:'';
  const effect=typeof cell?.effect==='string'?cell.effect:'';
  const combined=description+' '+effect;
  if(!cell||!description.trim()||(cell.effect!==undefined&&typeof cell.effect!=='string'))reasons.add('missing');
  if(/\b(?:GM|gamemaster|review|unclear|interpret|variable)\b|\?{2,}|\[.*?\]/i.test(combined))reasons.add('review');
  const absent=resolveCriticalEquipment(description,effect,[]);
  const keys=absent.conditions;
  const branches=[];
  for(let mask=0;mask<2**keys.length;mask++)branches.push(resolveCriticalEquipment(description,effect,keys.filter((_,index)=>mask&(1<<index))));
  if(branches.some(branch=>branch.unresolvedMechanics))reasons.add('condition');
  if(keys.length)notes.push('Equipment conditions parsed: '+keys.join(', ')+'. Alternatives checked separately; use the foe’s actual equipment.');
  if(absent.unresolved&&!absent.unresolvedMechanics)notes.push('Narrative condition retained for GM management; it does not change the parsed numeric effects.');
  for(const branch of branches){
    const tokens=criticalTokens(branch.effect,branch.description);
    if(tokens.some(token=>/^(?:Unable to parry|Stunned and unable to parry):/.test(token.label||''))&&tokens.some(token=>token.label?.startsWith('Must parry:')))reasons.add('notation');
    const remaining=tokens.filter(token=>token.text!==undefined).map(token=>token.text).join('').replace(/[\s–—−,;:.!\-]/g,'');
    if(remaining){
      if(/[\d+()∑∏π∫H]|[^\x20-\x7e]/.test(remaining)||!/[a-z]/i.test(remaining))reasons.add('notation');
      if(/[a-z]/i.test(remaining))reasons.add('prose');
    }
  }
  const descriptionTokens=criticalTokens(description);
  const remainder=descriptionTokens.filter(token=>token.text!==undefined).map(token=>token.text).join('');
  if(/[\u0370-\u03ff\u2200-\u22ff]/.test(remainder))reasons.add('notation');
  if(descriptionTokens.some(token=>token.raw&&!token.initiative&&!token.death)||/∑π/.test(effect)||/::|\b(\w+)\s+\1\b/i.test(combined)||/[�]/.test(combined))reasons.add('ocr');
  // Actual target death claims need recognition; figurative "mortal blow", dying
  // flames, and uncertainty about a foe's footing are ordinary narrative.
  if(remainder.split(/[.!?;]/).some(sentence=>/\b(?:foe|he|enemy|opponent)\b[^.!?;]{0,80}\b(?:dies?|dead|expires?)\b/i.test(sentence)&&!/\b(?:not|may|might|could|would)\b/i.test(sentence)))reasons.add('fatal');
  const death=criticalDeath(combined);
  if(death?.inactive||death?.manual)notes.push(criticalDeathLabel(death)+'. This narrative condition is GM-managed, not an automatic round countdown.');
  if(cell?.sourceCorrection)notes.push((cell.sourceCorrection.interpretation?cell.sourceCorrection.reason+' Source: Core Rules printed page ':'Source correction checked against Core Rules printed page ')+cell.sourceCorrection.printedPage+' (PDF page '+cell.sourceCorrection.pdfPage+'). Original extracted fields are preserved below.');
  const tokens=criticalTokens(effect,description),reasonKeys=[...reasons];
  return {status:reasonKeys.length?'yellow':'green',reasons:reasonKeys,notes,description,effect,originalDescription:typeof source?.description==='string'?source.description:'',originalEffect:typeof source?.effect==='string'?source.effect:'',sourceCorrection:cell?.sourceCorrection?.coordinate||null,defaultDurationRounds:1,defaultPenaltyDuration:'until healed',durationDefaults:tokens.filter(token=>token.duration?.defaulted).map(token=>token.raw),initiative:criticalTokens(combined).some(token=>token.initiative)?'attacker-next-round-no-roll':null,death:death?'recognized-target-death':null};
}
export function reviewTable(reference, table, error) {
  const valid = table?.kind==='critical' && Array.isArray(table.columns) && table.columns.length>0 && table.columns.every(c=>typeof c?.label==='string') && Array.isArray(table.rows) && table.rows.length>0 && table.rows.every(r=>r && (!Array.isArray(r.cells)||r.cells.length<=table.columns.length));
  if (error || !valid) return {reference,error:String(error?.message||error||'Missing/invalid critical table rows or columns.'),rows:[],green:0,yellow:0,total:0};
  const rows=table.rows.map(row=>({roll:String(row.roll??'?'),cells:table.columns.map((column,index)=>({...reviewCell(row.roll?row.cells?.[index]:null),column:column.label,group:column.group}))}));
  const cells=rows.flatMap(r=>r.cells),yellow=cells.filter(c=>c.status==='yellow').length;
  return {reference,columns:table.columns,rows,error:null,green:cells.length-yellow,yellow,total:cells.length};
}
