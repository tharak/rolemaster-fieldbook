import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {rankCostJavaScript} from '../src/rules.js';
const arrays = [[], [2,4,6], [0], [-0], [NaN], [Infinity,-Infinity], [1e16,1,-1e16], [.1,.2,.3], [-5,2,7]];
for (let length = 1; length <= 32; length++) arrays.push(Array.from({length}, (_, i) => (i * 17 % 23) / 4));
const ranks = [-Infinity, Infinity, NaN, -1, -0, .9, 1, 1.9, 2, 2.9, 3, 10, 32, 100, ...['', '2', 'bad', null, undefined, true].map(Number)];
const cases = arrays.flatMap(costs => ranks.map(ranks => ({costs, ranks})));
const wire = n => Number.isNaN(n) ? 'NaN' : n === Infinity ? 'inf' : n === -Infinity ? '-inf' : String(n);
const result = spawnSync(process.env.CARGO || 'cargo', ['run','--quiet','--offline','--locked','--manifest-path',fileURLToPath(new URL('Cargo.toml', import.meta.url)),'--example','rank_cost'], {
  input: cases.map(c => wire(c.ranks) + '	' + c.costs.map(wire).join(',')).join(String.fromCharCode(10)) + String.fromCharCode(10), encoding:'utf8',
});
if (result.error) throw result.error;
assert.equal(result.status, 0, result.stderr);
const lines = result.stdout.trim().split(String.fromCharCode(10));
assert.equal(lines.length, cases.length);
for (const [i, c] of cases.entries()) {
  const value = lines[i] === 'inf' ? Infinity : lines[i] === '-inf' ? -Infinity : Number(lines[i]);
  assert.equal(value, rankCostJavaScript(c.costs, c.ranks), 'cost case ' + i);
}
console.log('Rust/JavaScript rankCost parity: ' + cases.length + ' cases passed.');
