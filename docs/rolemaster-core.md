# Shared Rolemaster engine

The reusable engine is maintained in the private repository
[tharak/rolemasterCore](https://github.com/tharak/rolemasterCore).
The persistent local checkout is `../rolemasterCore` beside this repository.

This application consumes a pinned Git subtree at `vendor/rolemaster-core`.
The subtree is checked in as ordinary files: clones and static deployments work
without package installation, private-repository credentials, submodule setup,
or a JavaScript build step. No network dependency is introduced at runtime.

## Ownership

- **Core:** dice and numeric rules, character calculations/catalogs, attack and critical resolution, party combat, support-effect calculations, healing, experience, encounters, economics, item rules, and pure Rust numeric/effect crates.
- **Application:** UI/HTML, save storage and migrations, Ludus buildings/spell services/economy/progression, recruitment, guild/adventure pacing, table loading, and browser/Wasm presentation adapters.
- **Data:** application rule tables remain here. Core functions receive tables as arguments; standalone core tests own their reference fixtures. Source PDFs are not copied to core.

The small modules in `src` preserve existing import paths and share the core
implementation. `src/guild-battle.js` passes Ludus configuration into the generic
combat API and translates the existing `ludusSupport` option. `src/rules.js`
loads the optional application Wasm binding; `src/rust-components.js` owns its
HTML presentation adapter. The current arena still defaults to JavaScript.
Saves, combat output, progression, prices, and rewards are unchanged.

## Update the engine

Make and test changes in `rolemasterCore`, commit them, and push its `main` branch.
Then, from a clean fieldbook checkout:

```sh
git subtree pull --prefix=vendor/rolemaster-core https://github.com/tharak/rolemasterCore.git main --squash
npm test
# Restricted environments:
npm run test:in-process
cargo test --manifest-path vendor/rolemaster-core/rust/Cargo.toml --locked
cargo test --manifest-path rust/Cargo.toml --workspace --locked
```

Commit any application adapter changes and push this repository. To identify the
pinned core revision, inspect the latest subtree commit:

```sh
git log --grep='git-subtree-dir: vendor/rolemaster-core' -1 --format=%B
```

Do not edit a compatibility module to reintroduce a separate rules implementation.
Do not edit vendored files independently of core; update through the subtree.
The private package also provides namespace and subpath exports for other consumers.

## Verification

Core has its own JavaScript and Rust suites and GitHub Actions workflow. Six
combat fixtures compare complete result fingerprints captured before extraction.
The fieldbook runs both its integration suite and the vendored core suite.
`tests/core-browser-smoke.js` checks browser module identity, optional Wasm loading,
shared numeric effect timing, and the retained presentation adapter. The four
arena/Ludus browser suites cover the current playable interface.
