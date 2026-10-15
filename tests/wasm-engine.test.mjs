import test from 'node:test';
import assert from 'node:assert/strict';
const fresh = name => import('../rules.js?' + name);
test('initialization is shared; synchronous API uses installed engine', async () => {
  const rules = await fresh('success');
  let loads = 0;
  const load = async () => { loads++; return {default:async () => {}, rank_bonus_wasm:rules.rankBonusJavaScript}; };
  const first = rules.initializeRankBonusEngine({load});
  assert.equal(first, rules.initializeRankBonusEngine({load}));
  assert.equal((await first).backend, 'wasm');
  assert.equal(loads, 1);
  for (const input of [null, undefined, '', '21', 'bad', NaN, Infinity, -Infinity, -1, .5]) {
    for (const progression of ['combined', 'special', undefined, null, {}, 1]) {
      assert.equal(rules.rankBonus(input, progression), rules.rankBonusJavaScript(input, progression));
    }
  }
  assert.equal(rules.rankBonusEngineStatus().calls, 60);
});
test('failed loading explicitly falls back without marking Wasm active', async () => {
  const rules = await fresh('failure');
  const status = await rules.initializeRankBonusEngine({load:async () => { throw new Error('missing artifact'); }});
  assert.equal(status.backend, 'javascript');
  assert.equal(status.reason, 'missing artifact');
  assert.equal(rules.rankBonus(21, 'combined'), 82);
});
test('timeout prevents late initialization from silently switching backend', async () => {
  const rules = await fresh('timeout');
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const pending = rules.initializeRankBonusEngine({timeoutMs:5, load:async () => {
    await gate; return {default:async () => {}, rank_bonus_wasm:rules.rankBonusJavaScript};
  }});
  assert.equal((await pending).backend, 'javascript');
  release();
  await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(rules.rankBonusEngineStatus().backend, 'javascript');
});
