# Wayfarers’ Coliseum · arena beta

Choose one of three randomly generated enemy groups, select one to six fighters, and resolve a party battle. Generate new opponents for free whenever you want. Themes include goblin raiders, undead, giant insects, wild beasts, and rival mercenaries. Enemy lineups and victory prizes are fixed when generated; changing your team only changes the estimated difficulty.

Your first level-one fighter is free. Start with 20 gold; additional recruits cost 12 gold, with six roster slots. Victory awards the displayed gold once to the company and the displayed XP to every participating fighter. Benched fighters earn nothing, and defeats or draws pay nothing. Automatic progression uses the printed level 5/10/15/20 profiles at total XP 100/300/600/1000. A completed matchup is consumed; remaining matchups stay available until rerolled.

Battles play automatically on a side-view stage, one action at a time. Opposing teams show their starting health, damage, bleeding, healing, status effects, and fallen fighters. Criticals get a longer spotlight with their actual table description. Pause, advance one action, choose 1×/2×/4× speed, or skip to the result. Motion respects reduced-motion preferences; switching away from the page pauses playback.

Outcomes are saved before playback begins. Reloading, closing, skipping, or watching again never rerolls the battle or awards rewards twice. New battle reports include replay snapshots; older saved reports retain their recap without a replay button.

The result dialog features every resolved critical in order: attacker, defender, round, critical type, severity, recorded roll, description, and readable effects. Full round logs remain expandable. The ten most recent matches can be reopened without awarding rewards again.

## Lasting injuries

Damage persists between matches. C, D, and E criticals suffered cause arena injuries with combat penalties of −10, −15, and −20, requiring 2, 3, and 4 treatment days respectively. Mortal wounds cause −20 for 4 days regardless of severity. Penalties stack. Defeated fighters are rescued with 1 HP; a rescue without another critical injury adds −15 for 3 days.

The Fighters & infirmary view provides free one-day treatment: heal 25% maximum HP, restore power points, and advance every injury one day toward recovery. Injury penalties remain until treatment is complete. Fighters can enter while injured. These lasting injury and reward rules are game-specific abstractions, not a full simulation of the printed recovery rules. Combat still uses the existing attack and critical resolution engine. Creature special abilities and swarms are unsupported.

Food, morale, energy, travel, and idle turn orders are no longer part of the active game.

## Saves

The arena starts fresh under `rolemaster-coliseum-v1`, independently of the old adventure save. Existing browser records are left intact; no old roster or gold is imported. Progress is local to this browser and device. Starting a new arena company requires confirmation and resets only the arena save. Save failures and stale changes from another tab are rejected before the displayed state changes.

## Run and verify

```sh
python3 -m http.server 8011
npm test
```

Open http://localhost:8011. Serve the repository root with any static HTTP host; project subpaths work without a build step. The active browser smoke test is `tests/arena-browser-smoke.js`, run using Playwright CLI's `run-code --filename` against the local site. It uses a fresh browser context. `tests/arena-playback-browser-smoke.js` additionally checks six-fighter playback, exact HP, pause/step/speed controls, criticals, completion, replay, skip, and older reports. Existing adventure and older interface browser scripts are historical coverage, not smoke tests for the current entrypoint.

For environments where Node subprocess test isolation is unavailable:

```sh
node --test --test-isolation=none tests/*.test.mjs
```

## Repository layout

- `src/` — application and reusable rules modules. `arena-game.js` renders the current interface; `arena-rules.js` owns generation, progression, battle commits, injury recovery, and persistence.
- `styles/` — current arena styling and reusable older styles.
- `docs/` — historical design notes, audits, and migration plans.
- `references/` — source rulebook used by extraction scripts.
- `assets/`, `data/`, and `tables/` — artwork and printed game data.
- `scripts/` and `tests/` — maintenance tools and verification.
- `rust/` and `wasm/` — optional Rust engine and browser bindings.

The root contains the static site entrypoint, manifest, favicon, and configuration. Older character, adventure, Coliseum duel, and GM interfaces remain available as source for rules reuse and regression tests. They are not loaded as game screens. See `docs/CRITICAL-AUDIT.md` for the combat source review. The current party battle engine uses JavaScript.
