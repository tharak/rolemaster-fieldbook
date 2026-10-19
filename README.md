# Wayfarers’ Coliseum · arena beta

Start in the illustrated Ludus courtyard. Tap **Coliseum**, then **Fight** on one of three matchups to immediately resolve combat with your saved lineup. All three actions fit a 360 × 640 screen without scrolling. Generate new opponents for free whenever you want. Themes include goblin raiders, undead, giant insects, wild beasts, and rival mercenaries. Enemy lineups and victory prizes are fixed when generated; changing your team only changes the estimated difficulty.

Your first level-one fighter is free. Start with 20 gold; additional recruits cost 12 gold, with six roster slots. Victory awards the displayed gold once to the company and the displayed XP to every surviving participating fighter. Benched fighters earn nothing, and defeats or draws pay nothing. Automatic progression uses the printed level 5/10/15/20 profiles at total XP 100/300/600/1000. Every completed fight replaces all enemy offers with fresh groups. Replaying a report never refreshes opponents or repeats rewards.

Manage recruitment, fighter details, and your saved lineup in **Barracks**. The first recruit joins automatically; later recruits need selection. Older saves select all living roster members. Unavailable selected fighters sit out without losing their selection; dead members leave it. **Infirmary**, **Nerve Law**, and **Protections** provide rest, treatments, upgrades, and blessings. **Ludus Hall** holds promotions, service and battle history, and the memorial. Help and company reset are in Settings. Building dialogs have Back and Close controls; closing playback returns to the courtyard.

Battles play automatically on a side-view stage, one action at a time. Opposing teams show their starting health, damage, bleeding, healing, status effects, and fallen fighters. Criticals get a longer spotlight with their actual table description. Pause, advance one action, choose 1×/2×/4× speed, or skip to the result. Motion respects reduced-motion preferences; switching away from the page pauses playback.

Outcomes are saved before playback begins. Reloading, closing, skipping, or watching again never rerolls the battle or awards rewards twice. New battle reports include replay snapshots; older saved reports retain their recap without a replay button.

The result dialog features every resolved critical in order: attacker, defender, round, critical type, severity, recorded roll, description, and readable effects. Full round logs remain expandable. The ten most recent matches can be reopened without awarding rewards again.

## Critical consequences

Critical descriptions now have consequences beyond a damage penalty. Explicit paralysis, severed limbs, and recognized permanent disabilities incapacitate the victim immediately. They persist through matches, rest, reloads, and leveling. Ordinary infirmary rest never repairs them.

The **Ludus** is your school's shared caster character. Nerve Law, Concussion’s Ways, and Protections buildings provide spell-list ranks. Victories award the Ludus XP once; milestone promotions require gold. Building ranks, promotions, and services have gold costs, and all buildings share one PP pool. Resident specialists currently provide +0; gladiator assignment is a future feature.

Nerve Law provides diagnosis, Minor/Major Nerve Repair with recovery time, and temporary **Unparalysis**. Unparalysis suppresses paralysis for its printed duration; it does not delete the injury. Destroyed nerves cannot be repaired by these spells. Limb Preservation requires other, not-yet-available lists. Concussion’s Ways heals HP, burns, and other supported conditions. Protections offers chosen pre-battle blessings. Casting preparation, depleted-power checks, failures, costs, durations, and treatment are recorded and persist through reloads.

Tune the system in **[src/ludus-config.js](src/ludus-config.js)**. See **[the tuning guide](docs/ludus-tuning.md)** for editable prices, XP, PP, spell parameters, recovery, enemy refresh, and the explicit arena conventions.

Instant-death criticals kill immediately. Mortal-wound countdowns continue after fighting stops: a leg-severing critical that says death in six rounds still kills six rounds later. Generic HP healing cannot cancel a structural mortal wound. Actual deaths remove fighters from the active roster, free their roster places, and preserve their identity and fatal critical in **The fallen**. Dead fighters receive no victory XP and cannot be recruited back under the same identity. Leveling and rest never resurrect anyone.

A nonfatal HP knockout is different: that fighter is recovered with 1 HP. Ordinary C/D/E critical wounds retain −10/−15/−20 penalties and 2/3/4 treatment days; a nonfatal knockout without another injury gets −15 for 3 days. Free one-day infirmary treatment heals 25% maximum HP, restores PP, and advances only ordinary wounds. The recovery and cleric-repertoire rules are arena abstractions, not a complete implementation of all printed healing rules.

Still-present paralysis or severed-limb injuries from older arena saves are upgraded to permanent disabilities when loaded. Historical battles do not retroactively kill previously rescued living fighters. If the whole company is lost and replacement recruitment is unaffordable, start a new company using the confirmed reset action.

## Saves

The arena starts fresh under `rolemaster-coliseum-v1`, independently of the old adventure save. Existing browser records are left intact; no old roster or gold is imported. Progress is local to this browser and device. Starting a new arena company requires confirmation and resets only the arena save. Save failures and stale changes from another tab are rejected before the displayed state changes.

## Run and verify

```sh
python3 -m http.server 8011
npm test
```

Open http://localhost:8011. Serve the repository root with any static HTTP host; project subpaths work without a build step. The active browser smoke test is `tests/arena-browser-smoke.js`, run using Playwright CLI's `run-code --filename` against the local site. It uses a fresh browser context. `tests/arena-consequences-browser-smoke.js` covers persistent paralysis, temporary suppression, permanent deaths, and memorials. `tests/ludus-browser-smoke.js` covers paid progression, treatment, shared PP, blessings, and post-battle refresh. `tests/arena-playback-browser-smoke.js` additionally checks six-fighter playback, exact HP, pause/step/speed controls, criticals, completion, replay, skip, and older reports. Existing adventure and older interface browser scripts are historical coverage, not smoke tests for the current entrypoint.

For environments where Node subprocess test isolation is unavailable:

```sh
npm run test:in-process
```

## Shared rules engine

Reusable rules now live in the private [rolemasterCore repository](https://github.com/tharak/rolemasterCore), consumed here as a pinned Git subtree under `vendor/rolemaster-core`. The game and fieldbook share that implementation through compatibility imports. UI, saves, and Ludus progression stay here. See [engine ownership, updates, and verification](docs/rolemaster-core.md).

## Repository layout

- `vendor/rolemaster-core/` — shared rules engine, pure Rust crates, and standalone tests.
- `src/` — application modules and compatibility imports for the shared engine. `arena-game.js` renders the current interface; `arena-rules.js` owns generation, progression, battle commits, injury recovery, and persistence.
- `styles/` — current arena styling and reusable older styles.
- `docs/` — historical design notes, audits, and migration plans.
- `references/` — source rulebook used by extraction scripts.
- `assets/`, `data/`, and `tables/` — artwork and printed game data.
- `scripts/` and `tests/` — maintenance tools and verification.
- `rust/` and `wasm/` — optional Rust engine and browser bindings.

The root contains the static site entrypoint, manifest, favicon, and configuration. Older character, adventure, Coliseum duel, and GM interfaces remain available as source for rules reuse and regression tests. They are not loaded as game screens. See `docs/CRITICAL-AUDIT.md` for the combat source review. The current party battle engine uses JavaScript.
