import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
function run(command, args) {
  const result = spawnSync(command, args, {cwd:root, stdio:'inherit'});
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(command + ' failed: ' + result.status);
}
const cargo = process.env.CARGO || 'cargo';
const bindgen = process.env.WASM_BINDGEN || 'wasm-bindgen';
const version = spawnSync(bindgen, ['--version'], {encoding:'utf8'});
if (version.error || version.status !== 0 || version.stdout.trim() !== 'wasm-bindgen 0.2.129') {
  throw new Error('Install matching CLI: cargo install wasm-bindgen-cli --version 0.2.129 --locked');
}
run(cargo, ['build', '--locked', '--release', '--manifest-path', 'rust/Cargo.toml', '--target', 'wasm32-unknown-unknown', '--lib']);
run(bindgen, ['rust/target/wasm32-unknown-unknown/release/rolemaster_core.wasm', '--target', 'web', '--out-dir', 'wasm', '--out-name', 'rolemaster_core']);
