import {$,esc} from './dom.js';
import {criticalReferences,reviewTable,reviewReasons} from './critical-review-rules.js';
import {criticalEffectMarkup,useEmojis,setUseEmojis} from './critical-presentation.js';
let reviews=[];
const tableSelect=$('#review-table'), status=$('#review-status');
$('#review-emojis').checked=useEmojis();
$('#review-emojis').addEventListener('change',event=>setUseEmojis(event.target.checked));
$('#review-reason').innerHTML='<option value="all">Any reason</option>'+Object.entries(reviewReasons).map(([key,label])=>'<option value="'+key+'">'+esc(label)+'</option>').join('');
function render() {
  const code=location.hash.slice(1)||'all';
  tableSelect.value=reviews.some(r=>r.reference.code===code)?code:'all';
  const selected=reviews.filter(r=>tableSelect.value==='all'||r.reference.code===tableSelect.value);
  const wanted=$('#review-filter').value, reason=$('#review-reason').value, search=$('#review-search').value.trim().toLowerCase();
  let matched=0;
  const matches=(cell,row,table)=> (wanted==='all'||wanted===cell.status) && (reason==='all'||cell.reasons.includes(reason)) && (table.reference.code+' '+table.reference.title+' '+row.roll+' '+cell.column+' '+cell.description+' '+cell.effect+' '+cell.originalDescription+' '+cell.originalEffect+' '+cell.reasons.map(r=>reviewReasons[r]).join(' ')).toLowerCase().includes(search);
  $('#review-results').innerHTML=selected.map(table=>{
    const ref=table.reference;
    const heading='<h2>'+esc(ref.code)+' · '+esc(ref.title)+'</h2>';
    if(table.error) return '<section data-review-code="'+esc(ref.code)+'">'+heading+'<p class="review-error" role="alert"><strong>Yellow: unavailable — not checked.</strong> '+esc(table.error)+' Counts are incomplete. Reload to retry.</p></section>';
    const rows=table.rows.map(row=>{
      if(!row.cells.some(cell=>matches(cell,row,table)))return '';
      return '<tr><th scope="row">'+esc(row.roll)+'</th>'+row.cells.map(cell=>{
        if(!matches(cell,row,table))return '<td class="review-filtered">Filtered out</td>';
        matched++;
        const coordinate=ref.code+' · Roll '+row.roll+' · '+cell.group+' / '+cell.column;
        return '<td class="review-result review-'+cell.status+'" data-status="'+cell.status+'" data-reasons="'+cell.reasons.join(' ')+'"><small>'+esc(coordinate)+'</small><p><strong>'+(cell.status==='green'?'Green: no automated issues detected':'Yellow: needs review')+'</strong></p>'+(cell.reasons.length?'<ul>'+cell.reasons.map(r=>'<li>'+esc(reviewReasons[r])+'</li>').join('')+'</ul>':'')+(cell.notes?.length?'<ul class="review-notes">'+cell.notes.map(note=>'<li>'+esc(note)+'</li>').join('')+'</ul>':'')+'<p class="original"><strong>Original description:</strong> '+esc(cell.originalDescription||'[missing]')+'<br><strong>Original effect:</strong> '+esc(cell.originalEffect||'[none]')+'</p><p><strong>Readable:</strong> '+criticalEffectMarkup(cell.description)+' '+criticalEffectMarkup(cell.effect,cell.description)+'</p></td>';
      }).join('')+'</tr>';
    }).join('');
    return '<section data-review-code="'+esc(ref.code)+'">'+heading+'<p>'+table.total+' results · '+table.green+' green · '+table.yellow+' yellow</p>'+(rows?'<div class="review-scroll" tabindex="0" role="region" aria-label="'+esc(ref.code)+' review table, scroll horizontally"><table class="review-grid"><caption>'+esc(ref.title)+' — original and readable results</caption><thead><tr><th scope="col">Roll</th>'+table.columns.map(c=>'<th scope="col">'+esc(c.group)+' / '+esc(c.label)+'</th>').join('')+'</tr></thead><tbody>'+rows+'</tbody></table></div>':'<p>No results match these filters in this table.</p>')+'</section>';
  }).join('');
  $('#review-match-count').textContent=matched+' matching result cells'+(reviews.some(r=>r.error)?' · Some tables are unavailable; totals are incomplete.':'');
}
async function load() {
  $('#review-retry').disabled=true;
  status.className='';
  $('#review-match-count').textContent='Loading; no results checked yet.';
  document.documentElement.dataset.reviewReady='loading';
  for(const key of ['tables','total','green','yellow','unavailable','corrected'])delete status.dataset[key];
  status.textContent='Loading critical table manifest…'; reviews=[]; $('#review-results').replaceChildren(); $('#review-overview').replaceChildren();
  try {
    const response=await fetch('tables/index.json'); if(!response.ok)throw new Error('Manifest HTTP '+response.status);
    const refs=criticalReferences(await response.json());
    if(!refs.length)throw new Error('No critical-strike tables found in the manifest. Nothing has been checked.');
    reviews=await Promise.all(refs.map(async ref=>{
      try {const response=await fetch('tables/'+encodeURIComponent(ref.file));if(!response.ok)throw new Error('Table HTTP '+response.status);return reviewTable(ref,await response.json());}
      catch(error){return reviewTable(ref,null,error);}
    }));
    const total=reviews.reduce((n,r)=>n+r.total,0),green=reviews.reduce((n,r)=>n+r.green,0),yellow=reviews.reduce((n,r)=>n+r.yellow,0),failures=reviews.filter(r=>r.error).length;
    const corrected=reviews.flatMap(table=>table.rows.flatMap(row=>row.cells)).filter(cell=>cell.sourceCorrection).length;
    status.dataset.corrected=String(corrected);
    status.textContent=refs.length+' critical tables · '+total+' available result cells · '+green+' green · '+yellow+' yellow · '+failures+' unavailable tables · '+corrected+' source corrections'+(failures?' — incomplete review':'');
    status.dataset.tables=String(refs.length);status.dataset.total=String(total);status.dataset.green=String(green);status.dataset.yellow=String(yellow);status.dataset.unavailable=String(failures);
    tableSelect.innerHTML='<option value="all">All tables</option>'+reviews.map(r=>'<option value="'+esc(r.reference.code)+'">'+esc(r.reference.code+' · '+r.reference.title)+' ('+(r.error?'unavailable':r.yellow+' yellow / '+r.total)+')</option>').join('');
    $('#review-overview').innerHTML=reviews.map(r=>'<a href="#'+esc(r.reference.code)+'">'+esc(r.reference.code)+'<br>'+esc(r.reference.title)+'<br>'+(r.error?'Yellow: unavailable':r.green+' green · '+r.yellow+' yellow')+'</a>').join('');
    render(); document.documentElement.dataset.reviewReady='true';
  }catch(error){status.textContent='Review unavailable: '+error.message;status.className='review-error';tableSelect.innerHTML='<option value="all">No tables loaded</option>';$('#review-match-count').textContent='No results checked.';document.documentElement.dataset.reviewReady='error';}
  finally{$('#review-retry').disabled=false;}
}
tableSelect.addEventListener('change',()=>{location.hash=tableSelect.value;});
window.addEventListener('hashchange',render);
for(const id of ['review-filter','review-reason','review-search']) $('#'+id).addEventListener(id==='review-search'?'input':'change',render);
$('#review-retry').addEventListener('click',load);
load();
