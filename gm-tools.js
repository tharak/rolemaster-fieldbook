// GM workbench: each topic registers independently and owns its pure rule module.
import {esc} from './dom.js';
const root=document.querySelector('#gm-tools-content');
export const gmNumber=(name,label,value=0,min=0,max=100000)=>`<label>${esc(label)}<input name="${name}" type="number" value="${value}" min="${min}" max="${max}" step="any" required></label>`;
export const gmSelect=(name,label,values)=>`<label>${esc(label)}<select name="${name}">${values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('')}</select></label>`;
export const gmCheck=(name,label)=>`<label class="gm-check"><input name="${name}" type="checkbox"> ${esc(label)}</label>`;
export const gmText=(name,label,value='')=>`<label>${esc(label)}<input name="${name}" maxlength="300" value="${esc(value)}"></label>`;
export function gmValues(form){return Object.fromEntries([...form.elements].filter(el=>el.name).map(el=>[el.name,el.type==='checkbox'?el.checked:el.type==='number'?Number(el.value):el.value]));}
export function gmSection(id,title,body){const section=document.createElement('details');section.id=id;section.className='gm-topic';section.innerHTML=`<summary>${esc(title)}</summary>${body}`;root.append(section);return section;}
export function readGm(key,fallback){try{const value=JSON.parse(localStorage.getItem('rolemaster-gm-'+key));return value&&typeof value==='object'&&!Array.isArray(value)?value:fallback;}catch{return fallback;}}
export function saveGm(key,value){localStorage.setItem('rolemaster-gm-'+key,JSON.stringify(value));}
export function showGmResult(element,value){element.textContent=typeof value==='string'?value:JSON.stringify(value,null,2);}
export function gmForm(id,fields,label='Calculate'){return `<form id="${id}" class="gm-form">${fields}<button type="submit" class="button button-dark">${label}</button></form><pre data-result="${id}" role="status"></pre>`;}
export function bindGmForm(section,id,callback){section.querySelector('#'+id).addEventListener('submit',event=>{event.preventDefault();const output=section.querySelector(`[data-result="${id}"]`);try{showGmResult(output,callback(gmValues(event.target),event.target));}catch(error){showGmResult(output,error.message);}});}
// Reusable campaign notebook. Archive retains history; editing keeps stable IDs.
export function gmNotebook(section,key,fields){
 let state=readGm(key,{entries:[]});if(!Array.isArray(state.entries))state={entries:[]};let editing=null;
 const host=document.createElement('div');host.innerHTML=gmForm('gm-note-'+key,fields,'Save record')+`<button type="button" class="button button-quiet" data-new-note>New record</button><div data-notes></div>`;section.append(host);
 const form=host.querySelector('form');
 function render(){host.querySelector('[data-notes]').innerHTML=state.entries.map(entry=>`<article class="gm-record-list"><h3>${esc(entry.name||'Record')}${entry.archived?' · archived':''}</h3><dl>${Object.entries(entry).filter(([k])=>!['id','archived','name'].includes(k)).map(([k,v])=>`<dt>${esc(form.elements[k]?.closest('label')?.childNodes[0]?.textContent||k)}</dt><dd>${esc(String(v))}</dd>`).join('')}</dl><button class="button button-quiet" data-edit-note="${entry.id}">Edit</button> <button class="button button-quiet" data-archive-note="${entry.id}">${entry.archived?'Restore':'Archive'}</button></article>`).join('');}
 bindGmForm(host,'gm-note-'+key,v=>{if(!v.name?.trim())throw new Error('Give this record a name.');const existing=state.entries.find(e=>e.id===editing),entry={...existing,...v,id:editing||crypto.randomUUID()};const next={entries:editing?state.entries.map(e=>e.id===editing?entry:e):[...state.entries,entry]};saveGm(key,next);state=next;editing=null;form.reset();render();return 'Record saved.';});
 host.addEventListener('click',event=>{const target=event.target.closest('button');if(!target)return;const id=target.dataset.editNote||target.dataset.archiveNote,entry=state.entries.find(e=>e.id===id);
 if(target.hasAttribute('data-new-note')){editing=null;form.reset();}
 if(target.dataset.editNote&&entry){editing=id;for(const [k,v] of Object.entries(entry)){const field=form.elements[k];if(field){if(field.type==='checkbox')field.checked=v;else field.value=v;}}form.scrollIntoView({block:'center'});}
 if(target.dataset.archiveNote&&entry)try{const next={entries:state.entries.map(e=>e.id===id?{...e,archived:!e.archived}:e)};saveGm(key,next);state=next;render();}catch(error){showGmResult(host.querySelector('[data-result]'),error.message);}
 });render();return host;
}
