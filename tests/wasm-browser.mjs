// Optional test dependency: npm install --no-save --package-lock=false playwright
// Or PLAYWRIGHT_MODULE=/absolute/path/to/playwright-core/index.mjs with CHROMIUM_PATH.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve, extname, sep} from 'node:path';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const mime = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.wasm':'application/wasm', '.svg':'image/svg+xml'};
const server = createServer(async (req, res) => {
  try {
    let name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (name.startsWith('/rolemaster/')) name = name.slice('/rolemaster'.length);
    if (name.endsWith('/')) name += 'index.html';
    const path = resolve(root, '.' + name);
    if (!path.startsWith(root.endsWith(sep) ? root : root + sep)) throw new Error('outside root');
    const data = await readFile(path);
    res.writeHead(200, {'Content-Type':mime[extname(path)] || 'application/octet-stream'}).end(data);
  } catch { res.writeHead(404).end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = 'http://127.0.0.1:' + server.address().port;
let browser;
try {
  browser = await chromium.launch({headless:true, ...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {})});
  for (const prefix of ['/', '/rolemaster/']) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [], wasmResponses = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.url().endsWith('.wasm')) wasmResponses.push({url:response.url(), status:response.status()}); });
    await page.goto(base + prefix);
    await page.waitForFunction(() => document.documentElement.dataset.appReady === 'true');
    await page.waitForFunction(async () => (await import('./rules.js')).rankBonusEngineStatus().calls > 0);
    const proof = await page.evaluate(async () => {
      const rules = await import('./rules.js');
      const before = rules.rankBonusEngineStatus();
      let checked = 0;
      for (const kind of ['standard','category','limited','special','combined','unknown','']) {
        for (let quarter = -8; quarter <= 400; quarter++) {
          const n = quarter / 4;
          if (rules.rankBonus(n, kind) !== rules.rankBonusJavaScript(n, kind)) throw new Error('browser parity mismatch');
          checked++;
        }
      }
      return {before, after:rules.rankBonusEngineStatus(), checked, roster:typeof window.RolemasterEncounter?.roster};
    });
    assert.equal(proof.before.backend, 'wasm');
    assert.ok(proof.before.calls > 0, 'actual app startup must use Rust before test calls');
    assert.equal(proof.after.calls - proof.before.calls, proof.checked);
    assert.equal(proof.roster, 'function');
    assert.deepEqual(errors, []);
    assert.ok(wasmResponses.some(r => r.url === base + prefix + 'wasm/rolemaster_core_bg.wasm' && r.status === 200));
    assert.match(await page.locator('#rules-engine-status').textContent(), /Rust.*WebAssembly/);
    console.log(JSON.stringify({prefix, proof, wasmResponses, pageErrors:errors.length}));
    if (prefix === '/rolemaster/') {
      for (const filename of ['browser-smoke.js', 'coliseum-browser-smoke.js']) {
        const sourceUrl = new URL(filename, import.meta.url);
        try { await access(sourceUrl); } catch (error) {
          if (error.code !== 'ENOENT') throw error;
          console.log(filename, 'not present in published baseline; optional local regression');
          continue;
        }
        const source = await readFile(sourceUrl, 'utf8');
        const smoke = (0, eval)('(' + source + ')');
        console.log(filename, JSON.stringify(await smoke(page)));
      }
    }
    await context.close();
  }
  for (const mode of ['missing', 'delayed']) {
    const context = await browser.newContext();
    const page = await context.newPage();
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    await page.route('**/*.wasm', async route => {
      if (mode === 'missing') return route.fulfill({status:404, body:'missing'});
      await gate;
      await route.continue();
    });
    const requested = page.waitForRequest('**/*.wasm');
    await page.goto(base + '/rolemaster/');
    await requested;
    if (mode === 'delayed') {
      assert.equal(await page.evaluate(() => document.documentElement.dataset.appReady), undefined);
      release();
    }
    await page.waitForFunction(() => document.documentElement.dataset.appReady === 'true');
    const result = await page.evaluate(async () => {
      const rules = await import('./rules.js');
      return {status:rules.rankBonusEngineStatus(), value:rules.rankBonus(21, 'combined'), roster:typeof window.RolemasterEncounter?.roster};
    });
    assert.equal(result.status.backend, mode === 'missing' ? 'javascript' : 'wasm');
    assert.equal(result.value, 82);
    assert.equal(result.roster, 'function');
    if (mode === 'missing') assert.match(await page.locator('#rules-engine-status').textContent(), /JavaScript fallback/);
    console.log(mode, JSON.stringify(result));
    await context.close();
  }
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
