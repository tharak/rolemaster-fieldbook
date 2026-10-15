import {initializeRankBonusEngine} from './rules.js';

const status = document.querySelector('#rules-engine-status');
const engine = await initializeRankBonusEngine();
document.documentElement.dataset.rulesEngine = engine.backend;
status.textContent = engine.backend === 'wasm'
  ? 'Skill rank bonuses: Rust / WebAssembly'
  : 'Skill rank bonuses: JavaScript fallback (Rust unavailable)';
status.title = engine.reason || 'Rust engine initialized successfully';
try {
  await import('./encounter.js');
  // The unpublished local Coliseum feature is optional on the published baseline.
  if (document.querySelector('#coliseum-view')) await import('./coliseum.js');
  document.documentElement.dataset.appReady = 'true';
} catch (error) {
  status.textContent += ' — Application startup failed; reload to retry.';
  console.error('Fieldbook startup failed', error);
}
