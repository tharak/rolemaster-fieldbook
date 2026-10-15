# Rust rank bonuses — browser integration

The actual static browser application now uses Rust/Wasm for rankBonus. Other rules,
UI, localStorage and reference data remain JavaScript. No backend or CDN is required.

## Startup and contract

index.html loads browser-startup.js. It awaits initializeRankBonusEngine in rules.js,
then imports encounter.js and coliseum.js; their shared app.js runs after engine selection.
Consumers retain the synchronous rankBonus API. The wrapper preserves Number coercion
and strict progression string matching. rankBonusJavaScript remains the original oracle.
Rust implements all five progressions, negative/NaN normalization, zero penalties,
fractional rounding, infinities and the unknown-name standard fallback.

Generated glue resolves its binary relative to import.meta.url, supporting both / and
GitHub Pages project paths such as /rolemaster/. Serve .wasm as application/wasm over HTTP(S).
If import, download, instantiation or self-check fails, or initialization exceeds eight
seconds, startup continues with JavaScript. The visible page status explicitly says
JavaScript fallback; the console records the cause. Reload retries. Late completion
cannot silently switch engines after timeout. Saved records are untouched.
For diagnostics, rankBonusEngineStatus() exported from rules.js returns backend, reason
and calls; calls counts actual rankBonus dispatches through the Rust binding.

## Reproduce the build

Verified toolchain: rustc 1.99.0 (b940084d7 2026-09-28), cargo 1.99.0
(5f94df478 2026-08-27). Installed from official https://sh.rustup.rs with minimal profile
and --no-modify-path after user approval. Shell rc checksums remained unchanged.
The Wasm dependency and CLI are pinned together to 0.2.129; Cargo.lock pins transitive
library dependencies. Native builds do not use wasm-bindgen.

From the repository root:

    "$HOME/.cargo/bin/rustup" target add wasm32-unknown-unknown
    "$HOME/.cargo/bin/rustup" component add rustfmt clippy
    "$HOME/.cargo/bin/cargo" install wasm-bindgen-cli --version 0.2.129 --locked
    CARGO="$HOME/.cargo/bin/cargo" WASM_BINDGEN="$HOME/.cargo/bin/wasm-bindgen" npm run build:wasm

The script checks CLI version, builds with --locked --release and generates web ES-module
glue. First build needs registry access; subsequent native checks can be offline.
CLI installation succeeded with upstream locked-dependency warnings: yanked yoke-derive
0.8.3 and future-compatibility warnings for buf_redux/multipart. These are build-tool
dependencies, not the application's runtime/library dependency set.

## Generated assets / deployment

Keep all four generated files in wasm/ together in version control and publish with the
site: rolemaster_core.js, rolemaster_core_bg.wasm, rolemaster_core.d.ts and
rolemaster_core_bg.wasm.d.ts. Rebuild when Rust source or pinned dependencies change;
never hand-edit glue. The binary is approximately 20 KB. rust/target/ is ignored.
No CI/deployment configuration was present or changed. Existing branch-based Pages
instructions still apply: serving included assets requires no Rust build on the host.
Publication uses the existing main-branch GitHub Pages deployment.

## Checks

    npm test
    "$HOME/.cargo/bin/cargo" fmt --manifest-path rust/Cargo.toml -- --check
    "$HOME/.cargo/bin/cargo" check --offline --locked --manifest-path rust/Cargo.toml --all-targets
    "$HOME/.cargo/bin/cargo" test --offline --locked --manifest-path rust/Cargo.toml
    "$HOME/.cargo/bin/cargo" clippy --offline --locked --manifest-path rust/Cargo.toml --all-targets -- -D warnings
    CARGO="$HOME/.cargo/bin/cargo" node rust/check-parity.mjs

Native parity compares 3,010 results with the current JS oracle; missing Cargo is a hard
failure, not a skip. Engine unit tests inject fake bindings to test lifecycle/coercion;
the browser tests separately prove actual Wasm execution.

### Browser acceptance

Optional tooling: npm install --no-save --package-lock=false playwright, then
npx playwright install chromium. Run node tests/wasm-browser.mjs. Alternatively set
PLAYWRIGHT_MODULE to an existing playwright/playwright-core module and CHROMIUM_PATH
to installed Chromium. Production never loads Playwright. The test starts a temporary
loopback static server and isolated browser contexts, then closes both. It does not touch
the user's normal browser storage.

Verified command on this machine:

    PLAYWRIGHT_MODULE=/home/tharak/.npm-global/lib/node_modules/openclaw/node_modules/playwright-core/index.mjs CHROMIUM_PATH=/home/tharak/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome node tests/wasm-browser.mjs

Results (2026-10-14 America/Sao_Paulo):

- npm test: 29/29 (26 original + three initialization/fallback tests).
- Rust tests: 2/2; fmt, check and Clippy passed; native parity 3,010/3,010.
- Release build and wasm-bindgen asset generation passed.
- Real headless Chromium at / and /rolemaster/: Wasm HTTP 200, backend wasm,
  342 Rust calls from actual application startup before test calls, followed by 2,863
  browser parity comparisons per URL; no page errors.
- Existing browser-smoke.js passed table races, character stats/role/appearance, XP undo,
  advancement, save/reload and encounter roster at /rolemaster/.
- Existing coliseum-browser-smoke.js passed recovery, search, rounds, pause/resume,
  full duel, persistence, duplicate creatures and mobile layout; no page errors.
- Wasm 404: app starts, result 82 retained, roster available, backend javascript and
  visible fallback label. Delayed Wasm: app waits, then starts with backend wasm.
- Unit timeout test proves late resolution cannot activate Wasm after fallback.

## Scope and next slices

The initial Rust integration was published separately from an isolated worktree.
This revision also includes the character modules, Coliseum, and their regression
checks. Only rank bonuses have migrated to Rust; other application rules remain
JavaScript. No deployment configuration was changed.
Potential next slices: rankCost and deterministic dice/character formulas, each gated by
parity and browser checks. No speed improvement is claimed. Verified locally in Chromium;
other browsers and the live Pages deployment require separate validation. A custom CSP
must permit Wasm.
