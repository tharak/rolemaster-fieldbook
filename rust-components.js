// Browser boundary only. Pure Rust crates have no knowledge of DOM or storage.
let binding=null, ruleCalls=0, uiCalls=0, battleCalls=0;
export function rustComponentStatus() {
  return {backend:binding?'wasm':'javascript',ruleCalls,uiCalls,battleCalls};
}
export function installRustComponents(candidate) {
  // Older numeric-only adapters can still initialize during incremental migration.
  if(!candidate.critical_effect_rounds_wasm&&!candidate.critical_token_wasm)return;
  const result=candidate.critical_effect_rounds_wasm(new Float64Array([2,1]),new Float64Array([1,1]),new Uint8Array([1,2]),1);
  if(result.length!==2||result[0]!==2||result[1]!==0)throw new Error('Rust effect component self-check failed');
  if(candidate.critical_token_wasm('<test>','',0)!=='<strong class="critical-token">&lt;test&gt;</strong> ')throw new Error('Rust UI component self-check failed');
  binding=candidate;
}
export function rustEffectRounds(effects,completedRound,startField,severity) {
  if(!binding||!Number.isFinite(completedRound)||!effects.every(effect=>(effect.roundsLeft===null||typeof effect.roundsLeft==='number'&&!Number.isNaN(effect.roundsLeft))&&(effect[startField]==null||typeof effect[startField]==='number'&&!Number.isNaN(effect[startField]))))return null;
  const result=binding.critical_effect_rounds_wasm(
    Float64Array.from(effects,effect=>effect.roundsLeft===null?NaN:effect.roundsLeft),
    Float64Array.from(effects,effect=>effect[startField]??completedRound),
    Uint8Array.from(effects,effect=>severity[effect.kind]||0),completedRound);
  ruleCalls++;
  return result;
}
export function rustCriticalToken(label,emoji,mode) {
  if(!binding)return null;
  uiCalls++;
  return binding.critical_token_wasm(label,emoji,mode);
}
export function rustBattleContender(view) {
  if(!binding?.battle_contender_wasm)return null;
  uiCalls++;battleCalls++;
  return binding.battle_contender_wasm(view.name,view.profile,view.side,view.hits,view.maximum,view.attack,view.ob);
}
