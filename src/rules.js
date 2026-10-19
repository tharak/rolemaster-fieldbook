// Compatibility import and optional browser Wasm integration.
export * from '../vendor/rolemaster-core/src/rules.js';
import {initializeRankBonusEngine as initializeCoreEngine} from '../vendor/rolemaster-core/src/rules.js';
import {installRustComponents} from './rust-components.js';
let initialization;
export function initializeRankBonusEngine(options={}){
 if(initialization)return initialization;
 let binding;
 const load=options.load??(()=>import('../wasm/rolemaster_core.js'));
 initialization=initializeCoreEngine({...options,load:async()=>{binding=await load();return binding;}}).then(status=>{
  if(status.backend==='wasm'&&binding)installRustComponents(binding);
  return status;
 });
 return initialization;
}
