# Second slice: numeric skill development costs

Starting point: c359528edfa9534256a3a2ee5ab639def6763e3a on main, matching origin/main.
Working tree and index were clean; no rebase/merge state or repository AGENTS.md existed.
The published 09a2ccf integration was an ancestor and remained intact. Baseline passed
29 Node tests, two Rust tests, 3,010 bonus parity cases and both browser smoke scripts.
No concurrent file edits or HEAD movement were observed during this work.

rankCost is used by app.js to total purchased development slots. It now dispatches dense
ordinary numeric arrays to rank_cost_wasm; rankCostJavaScript is the retained oracle.
Negative/NaN ranks buy zero slots; fractions truncate; positive infinity buys all slots.
The Rust fold explicitly sums left to right, preserving floating-point order and NaN.
Existing wasm-bindgen 0.2.129 slice support bridges Float64Array to &[f64]; standard Rust
slice/iterator APIs implement the calculation. No new dependency or bespoke serializer.

Sparse arrays, mixed types, accessors, null and unusual array-like inputs keep the original
JavaScript path rather than changing JS addition/coercion behavior. Supported Rust inputs
are ordinary dense numeric arrays and numeric ranks after JS Number conversion, not
arbitrary Proxy objects or custom Array behavior. Such exotic objects are outside the
application's data contract. rankCostEngineStatus reports backend availability and actual
Rust dispatch count; a mixed-array call can still use JS when the engine is available.

The existing startup initializer now self-checks both exports before enabling either.
An old/cached module missing the new export falls back explicitly instead of half-enabling
Rust. Missing Wasm/timeout still uses JavaScript for both functions. Static relative URLs
and synchronous consumer APIs are unchanged. Deploy regenerated JS/Wasm/declarations as
one set. Initially local-only; subsequent user authorization includes this cohesive
rankCost dependency in the basicStatBonus publication (see BASIC-STAT-BONUS.md).

New native parity command:

    CARGO="$HOME/.cargo/bin/cargo" node rust/check-cost-parity.mjs

This covers 820 cases: empty, fractional, negative, NaN/infinite costs/ranks, 1..32 slot
arrays, rank coercions, saturation and order-sensitive floating sums. Existing commands
in README.md still apply. New Rust example: examples/rank_cost.rs.

Verification: 30/30 Node tests (including stale-module fallback); 3/3 Rust tests; 820/820 cost parity and 3,010/3,010 bonus
parity; fmt, check and Clippy (native and Wasm) passed; release assets rebuilt. Chromium
at / and /rolemaster/ recorded 70 cost dispatches from real app startup before test calls,
then 108 cost comparisons per URL (72 Rust, 36 compatibility fallback), in addition to
2,863 bonus comparisons per URL. Missing-Wasm and delayed initialization checks cover
both functions. Both full character/table and Coliseum browser smoke scripts passed,
including saving, XP/advancement, persistence, and mobile layout, with zero page errors.
No performance improvement is claimed for this small slice.
