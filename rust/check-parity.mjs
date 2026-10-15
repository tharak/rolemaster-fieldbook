// Run explicitly: node rust/check-parity.mjs. Missing Rust is a failure, not a skip.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {rankBonus} from '../rules.js';

const progressions = ['standard', 'category', 'limited', 'special', 'combined', 'unknown', ''];
const inputs = [-Infinity, NaN, Infinity, -100, -0, 1e-10, 9.999, 10.001, 19.999, 20.001, 29.999, 30.001, 1000, 1e20];
for (let quarter = -8; quarter <= 400; quarter++) inputs.push(quarter / 4);
// Number conversion remains the JS boundary's responsibility, including strings/null.
inputs.push(...['', '12', 'invalid', null, undefined, false, true].map(Number));
const cases = progressions.flatMap(progression => inputs.map(ranks => ({progression, ranks})));
const wireNumber = n => Number.isNaN(n) ? 'NaN' : n === Infinity ? 'inf' : n === -Infinity ? '-inf' : String(n);
const result = spawnSync(process.env.CARGO || 'cargo', [
  'run', '--quiet', '--offline', '--manifest-path',
  fileURLToPath(new URL('./Cargo.toml', import.meta.url)), '--example', 'rank_bonus',
], {
  input: cases.map(({progression, ranks}) => progression + '\t' + wireNumber(ranks)).join('\n') + '\n',
  encoding: 'utf8', maxBuffer: 4 * 1024 * 1024,
});
if (result.error) throw new Error('Rust parity requires cargo/rustc on PATH; no cases were verified.', {cause: result.error});
assert.equal(result.status, 0, result.stderr);
const lines = result.stdout.trim().split(/\r?\n/);
assert.equal(lines.length, cases.length, 'one Rust result per input');
for (const [index, {progression, ranks}] of cases.entries()) {
  const value = lines[index] === 'inf' ? Infinity : lines[index] === '-inf' ? -Infinity : Number(lines[index]);
  assert.equal(value, rankBonus(ranks, progression), JSON.stringify({progression, ranks: String(ranks)}));
}
console.log('Rust/JavaScript rankBonus parity: ' + cases.length + ' cases passed.');
