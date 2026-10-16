import {initializeRankBonusEngine} from './rules.js';

const status = document.querySelector('#rules-engine-status');
const engine = await initializeRankBonusEngine();
document.documentElement.dataset.rulesEngine = engine.backend;
status.textContent = engine.backend === 'wasm'
  ? 'Character rules: Rust / WebAssembly'
  : 'Character rules: JavaScript fallback (Rust unavailable)';
status.title = engine.reason || 'Rust engine initialized successfully';
try {
  await import('./encounter.js');
  // Keep the shared shell usable when a host omits the arena view.
  if (document.querySelector('#coliseum-view')) {await import('./coliseum.js');await import('./encounter-generator.js');await import('./adventures.js');}
  await import('./healing-tools.js');
  await import('./magic-item-tools.js');
  await import('./religion-tools.js');
  await import('./economics-tools.js');
  await import('./miscellaneous-tools.js');
  if(location.hash==='#gm')document.querySelector('[data-view="gm"]').click();
  document.documentElement.dataset.appReady = 'true';
} catch (error) {
  status.textContent += ' — Application startup failed; reload to retry.';
  console.error('Fieldbook startup failed', error);
}
