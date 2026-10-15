# Rust website migration

The migration has started in the existing website. This first step keeps the
current layout, saved characters, encounter records, URLs and static hosting.
Rust now renders recognized critical-effect components and advances critical
effect timers in encounters and the Coliseum. Existing numeric stat bonuses,
rank bonuses and rank costs also run in Rust.

The rest of the UI, critical notation parser, dice, character formulas and combat
resolution are still JavaScript. This is the first integrated slice, not a claim
that the whole application has been rewritten.

## Component boundaries

| Crate | Responsibility | Dependencies |
| --- | --- | --- |
| `game-rules` | Reusable effect clocks; independent timers, cumulative pools and configurable priority | Rust standard library |
| `rolemaster-rules` | Rolemaster numerical formulas and the one-pool/severity policy for critical stun | `game-rules` |
| `fieldbook-ui` | HTML components, escaping and accessible critical-effect presentation | Rust standard library |
| `rolemaster-core` | WebAssembly exports; translates typed browser inputs to library calls | `rolemaster-rules`, `fieldbook-ui`, Wasm binding on browser target |

Rules crates never import the UI, DOM, browser storage or Wasm. The UI crate never
evaluates rules. Native tools and future games can use the same libraries without
running a browser or loading Rolemaster reference tables.

`rust-components.js` is the browser boundary. The existing notation parser
supplies recognized labels to the Rust UI component. Original prose stays
lossless. Typed arrays carry timing data to the Rust rule component; existing
JavaScript records retain their identity, custom fields and storage format.
`rustComponentStatus()` reports backend and actual rule/UI calls for diagnostics.

## Reuse in another game

Add a local dependency on `rust/crates/game-rules`. Supply your game's pool IDs
and priorities; there are no hard-coded Rolemaster names in the shared engine.
Effects with `pool: None` each spend a round independently. Each numbered pool
spends one round total, selecting its highest priority and using stable input
order for ties. Future effects wait; `remaining: None` requires explicit removal.

```rust
use game_rules::{tick_effects, TimedEffect};

let mut effects = vec![
    TimedEffect { remaining: Some(2.0), starts_on: 1.0, pool: Some(7), priority: 1 },
    TimedEffect { remaining: Some(1.0), starts_on: 1.0, pool: Some(7), priority: 2 },
    TimedEffect { remaining: Some(3.0), starts_on: 1.0, pool: None, priority: 0 },
];
tick_effects(&mut effects, 1.0);
// Remaining: 2, 0, 2. The caller removes elapsed effects.
```

## Build and verification

Use the installed Cargo and wasm-bindgen 0.2.129, as described in
[rust/README.md](rust/README.md). Generated assets stay bundled for static hosting.

```sh
cargo fmt --manifest-path rust/Cargo.toml --all -- --check
cargo test --offline --locked --manifest-path rust/Cargo.toml --workspace
cargo clippy --offline --locked --manifest-path rust/Cargo.toml --workspace --all-targets -- -D warnings
npm run build:wasm
npm test
node tests/wasm-browser.mjs
```

The new browser regression verifies actual Rust rendering of the 836-cell review,
600 effect-clock comparisons with the existing JavaScript behavior, 36 rendering
comparisons including hostile HTML, and Rust calls from an actual Coliseum round.
The combined suite also checks the existing character and combat flows, root and
project hosting paths, delayed Wasm and complete JavaScript fallback when Wasm is
unavailable. The review remains 836 green and zero yellow.

Verified on 2026-10-15: 70 JavaScript unit tests, nine native Rust tests,
workspace formatting/check/Clippy, all three native numerical parity scripts
(3,010 rank bonuses, 820 rank costs and 1,219 stat bonuses), and all ten browser
regressions passed. Browser checks confirmed actual Wasm calls, zero page errors,
both hosting paths, and missing/delayed-Wasm behavior.

Next slices can move notation parsing and combat calculation into
`rolemaster-rules`, then replace complete page views with Rust UI components.
Each slice should preserve source provenance and saved-record compatibility and
pass the existing behavioral regressions before removing its JavaScript fallback.
