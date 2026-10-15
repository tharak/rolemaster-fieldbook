import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {basicStatBonusJavaScript} from '../rules.js';
const inputs = [-Infinity, Infinity, NaN, -0, 1e20, -1e20, Number.MAX_VALUE, -Number.MAX_VALUE];
for (let quarter = -400; quarter <= 800; quarter++) inputs.push(quarter / 4);
for (const boundary of [11,31,70,90,100]) inputs.push(boundary - 1e-10, boundary + 1e-10);
const wire = n => Number.isNaN(n) ? 'NaN' : n === Infinity ? 'inf' : n === -Infinity ? '-inf' : String(n);
const result = spawnSync(process.env.CARGO || 'cargo', ['run','--quiet','--offline','--locked','--manifest-path',fileURLToPath(new URL('Cargo.toml', import.meta.url)),'--example','basic_stat_bonus'], {
  input:inputs.map(wire).join('\n') + '\n', encoding:'utf8',
});
if (result.error) throw result.error;
assert.equal(result.status, 0, result.stderr);
const lines = result.stdout.trim().split('\n');
assert.equal(lines.length, inputs.length);
for (const [i, input] of inputs.entries()) {
  const actual = lines[i] === 'inf' ? Infinity : lines[i] === '-inf' ? -Infinity : Number(lines[i]);
  assert.equal(actual, basicStatBonusJavaScript(input), 'stat case ' + i + ': ' + input);
}
console.log('Rust/JavaScript basicStatBonus parity: ' + inputs.length + ' cases passed.');
