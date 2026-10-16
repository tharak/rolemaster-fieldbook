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
