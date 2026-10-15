# Numeric basic stat bonus — local incremental slice

## Starting state (2026-10-15)

HEAD was c359528edfa9534256a3a2ee5ab639def6763e3a on main, matching the
local origin/main tracking ref. No remote fetch was performed. No repository or
ancestor AGENTS.md, rebase state, staged changes or conflicts were present.
09a2ccf was an ancestor. The tree was NOT clean: the existing rankCost slice had
nine modified tracked files and three untracked files (RANK-COST.md,
check-cost-parity.mjs, examples/rank_cost.rs). Those changes were retained.
Baseline: 30 Node tests, 3 Rust tests, 3,010 bonus and 820 cost parity cases,
and real Chromium acceptance including both full smoke scripts passed.

## Scope and existing solution check

Reuse the existing wasm-bindgen 0.2.129 scalar f64 bridge and Rust standard
floating-point floor; no new library, serializer, build system or backend is
needed for this table formula. This is not a broader character rewrite.

basic_stat_bonus in src/lib.rs reproduces the numeric basicStatBonus formula,
including the exact-100 exception, fractional boundaries, NaN and infinities.
rules.js retains the original formula as basicStatBonusJavaScript; only primitive
numbers dispatch to Rust. Non-numbers keep legacy JS coercion and strict equality
semantics without executing user conversion hooks twice.
character-rules.js re-exports the synchronous wrapper, so existing stat-sheet.js
calls now execute Rust following startup. No saved record schema changes.

Startup self-checks all three migrated exports before enabling any. Missing,
stale, failed or timed-out Wasm keeps an explicit JavaScript fallback. The public
initializer keeps its historical initializeRankBonusEngine name for compatibility.
The visible status now says Character rules rather than only Skill rank bonuses;
it describes availability, not a claim that all character rules migrated.
basicStatBonusEngineStatus() counts actual Rust dispatches. Relative Wasm URLs
remain unchanged. Generated assets must be deployed together when authorized.

## Verification

Run from the repository root (CARGO may point to ~/.cargo/bin/cargo):

    npm test
    "$HOME/.cargo/bin/cargo" fmt --manifest-path rust/Cargo.toml -- --check
    "$HOME/.cargo/bin/cargo" check --offline --locked --manifest-path rust/Cargo.toml --all-targets
    "$HOME/.cargo/bin/cargo" test --offline --locked --manifest-path rust/Cargo.toml
    "$HOME/.cargo/bin/cargo" clippy --offline --locked --manifest-path rust/Cargo.toml --all-targets -- -D warnings
    CARGO="$HOME/.cargo/bin/cargo" node rust/check-stat-parity.mjs
    CARGO="$HOME/.cargo/bin/cargo" node rust/check-parity.mjs
    CARGO="$HOME/.cargo/bin/cargo" node rust/check-cost-parity.mjs
    CARGO="$HOME/.cargo/bin/cargo" WASM_BINDGEN="$HOME/.cargo/bin/wasm-bindgen" npm run build:wasm

Results: 32/32 Node tests; 4/4 Rust tests; fmt/check/Clippy passed. Wasm-target
check and Clippy --lib also passed. Release build regenerated all four assets.
Native parity: 1,219 stat cases, 3,010 rank bonus cases, 820 rank cost cases.

    PLAYWRIGHT_MODULE=/home/tharak/.npm-global/lib/node_modules/openclaw/node_modules/playwright-core/index.mjs CHROMIUM_PATH=/home/tharak/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome node tests/wasm-browser.mjs

Real Chromium at / and /rolemaster/: changing the actual temporary-stat field
to 99 produced basic bonus 9 and incremented Rust dispatches before parity calls.
Each URL passed 1,207 numeric stat comparisons and five non-number compatibility
cases, plus 2,863 bonus and 108 cost comparisons. Wasm returned HTTP 200; zero
page errors. Character/table smoke (XP, advancement, save/reload, encounter roster)
and Coliseum smoke (recovery, duel, persistence, mobile) both passed.
Wasm-404 and delayed-load scenarios also exercised real stat field changes to
100, producing 10. Unit tests cover stale exports and timeout/late completion.

The first local validation deliberately left HEAD and index unchanged. The user
subsequently authorized publication as part of migration deliverables. Publication
includes the already-integrated, independently validated rankCost dependency;
there are no unrelated local character/Coliseum edits to stage (those features are
already in origin/main c359528). The publication commit selects explicit migration
paths only and uses the existing main/root GitHub Pages deployment without force.
No performance claim; browser coverage is Chromium, not every browser.
