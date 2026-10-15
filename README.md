# Rolemaster Fieldbook

A static Rolemaster FRP companion for character creation and table lookup. It runs directly in a browser and can be hosted from the root of a GitHub Pages repository.

## Run locally

Serve this folder with any static web server and open its root URL. Browser storage and reference-data loading do not work reliably from a `file://` URL. No build step or package install is needed to serve the included assets. Skill rank bonuses use the bundled Rust/WebAssembly core, with a visibly labeled JavaScript fallback if it cannot load. See [Rust build and browser checks](rust/README.md) when changing the core.

## Check rules

Run `npm test` to check dice, stats, skill classifications, spell development costs, XP progression, character record decoding, the encounter actor projection, and Coliseum duels. No package install is needed. The package metadata configures ES modules, the built-in Node test runner, and the optional Wasm rebuild command.

For browser checks, serve the site locally, open it with Playwright CLI, and run `playwright-cli run-code --filename tests/browser-smoke.js`. The script creates its own browser context and checks table loading races, character creation, role rolls, saving, XP awards and undo, and level advancement.

Run `playwright-cli run-code --filename tests/coliseum-browser-smoke.js` for creature search, failed-loading recovery, stepping, pause/resume, full fights, choice persistence, and mobile layout checks.

## JavaScript layout

The browser loads `browser-startup.js`, awaits the Rust/WebAssembly rank engine (or an explicitly labeled JavaScript fallback), then loads `encounter.js` and `coliseum.js`. They import `app.js` first, so the character roster is available when encounters start. All imports use relative paths and work on a static server without a build step.

| Module | Responsibility |
| --- | --- |
| `rules.js` | Dice, rank progressions, and critical symbols |
| `critical-duration.js` | Shared temporary-effect durations and one-round defaults |
| `critical-initiative.js` | Next-round automatic initiative and conflict review |
| `critical-death.js` | Explicit fatal clauses, countdowns, and cancellation by healing |
| `critical-source.js` | Audited source corrections with original text and PDF provenance |
| `critical-stun.js` | Cumulative stun expiry and strict character consciousness thresholds |
| `critical-recoil.js` | Explicit recoil distances and safe radial movement on the hex map |
| `critical-equipment.js` | Foe equipment and conditional clause selection across source fields |
| `character-rules.js` | Stat, skill, spell development, and XP formulas |
| `character-record.js` | Decode and validate structured saved fields |
| `stat-sheet.js` | Stat inputs, potential assignment, and resistance outputs |
| `character-role.js` | Role traits, appearance, and physical details |
| `character-advancement.js` | XP awards, undo, level advancement, and history |
| `character-form.js` | Convert between the sheet and saved records |
| `encounter-roster.js` | Project saved characters into encounter actors |
| `table-browser.js` | Table search, lazy loading, and lookup UI |
| `app-data.js` | Core Rules catalogs and character creation constants |
| `dom.js` | Shared DOM selection and escaping |
| `coliseum-rules.js` | Creature attack parsing, table lookup, and pure duel simulation |
| `coliseum.js` | Creature selection, arena controls, health, and combat log |

`app.js` connects these features to character creation, skill development, equipment, and the play view.

## Publish with GitHub Pages

1. Push the files in this folder to a GitHub repository.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select the branch containing these files and the `/ (root)` folder, then save.

The character roster is stored in browser local storage. It is available in the same browser and on the same device where each character was created. The Tables page lists 65 tables and charts; each has a separate JSON source file in `tables/`. Attack tables support roll and armor lookup, and critical tables support roll and critical type lookup. Other tables preserve their source page text. The page never opens the PDF viewer.

The Encounters page opens by default and lists saved encounters. Each encounter has its own hex map, round, and action log in browser local storage; the list can create, continue, and delete encounters. Existing single-encounter data is carried into the list. Select characters in the encounter header to roll initiative automatically and plan each character’s Snap, Normal, and Deliberate actions in initiative order. Choices and status buttons are saved as they are made; Resolve round uses the selected actions. Place a character from their action card, then choose a highlighted hex. Choose creature and hex targets in a popup; the last target for each character is kept for later actions. The action log groups results by round, records each initiative roll, and opens linked tables in a popup. At the start of a round, hits are checked for unconsciousness and massive shock; damage beyond maximum hits remains recorded for the dying countdown. Weapon criticals, weapon fumbles, and spell failures are rolled and their table descriptions appear in the action log with effect symbols expanded. Weapon criticals automatically apply extra hits, bleeding, stun, parry restrictions, penalties, and attacker bonuses. Equipment and armor determine the matching conditional table effect when it can be identified. Effects appear on character cards and expire by round or can be cleared when healed. Timed effects begin next round when the target has already used at least 50% of its activity; DB and resistance rolls are unaffected by general critical penalties. Effects whose table condition cannot be read reliably are flagged in the log for review.

## Table source files

Each file in `tables/` is one table or chart. `tables/index.json` provides the searchable page index. Reference JSON contains cropped text from the printed table, with its spacing preserved so columns remain aligned. To regenerate the extracted data from the included PDF, install Poppler's `pdftotext` and run `node scripts/extract-development-costs.mjs`, `node scripts/extract-attack-tables.mjs`, `python3 scripts/extract-critical-tables.py`, and `node scripts/extract-book-tables.mjs` in that order. The last command refreshes only the other reference files and the index; it leaves attack and critical JSON untouched.

## Coliseum

Open **Coliseum** to choose any two of the 130 monsters and animals from A-8. Search each contender by name, play one round at a time, or simulate until one falls. Pause and continue a fight, inspect previous rounds, or reset for a rematch. Creature choices persist in local storage independently of characters and encounters. Combat state is temporary and resets on page reload.

`tables/creatures.json` is the structured companion to the existing `chart-animal-monster.json`. It preserves the monster and animal charts as arrays with `name`, `size`, `hits`, `armor_type`, `defensive_bonus`, `speed_ms_aq`, `level`, three attack notation fields, and `special` notes. Stable creature IDs use the chart group and row index; preserve row order when editing this file.

The arena uses attack percentages (including Both), critical-triggered follow-ups, natural attack size caps, armor and DB, unmodified fumbles, open-ended d100, and normal physical criticals against large and super-large creatures. It applies numeric critical hits, bleeding, stun, forced parry, penalties, and bonuses. Bare penalties last until healed; other omitted temporary durations default to one round; explicit durations and relevant permanent/until-healed conditions remain intact. Bleeding stays ongoing. Initiative uses a documented arena adjustment from Attack Quickness; “you gain the initiative” instead wins the next round without initiative dice, then normal rolls resume. Weapon attacks assume a normal one-handed edged weapon. Hits determine victory, with a 200-round draw limit.

Each contender has equipment checkboxes that default unchecked, persist per side and creature, and lock during a fight. Supported conditions select the foe's equipment branch, including clauses that span the extracted description and effect fields. Armor type does not imply regional equipment. Explicit instant death ends the target's actions immediately; recognized death countdowns expire after the stated round transitions. Reducing recorded damage in Encounters cancels pending critical death without removing bleeding. The arena has no healing control. Unsupported compounds, inactive-round death requirements, other narrative injuries, optional/group attacks, special abilities, movement, and parrying require GM review. Original conditional results remain available in the arena log. These limits are also shown under **Arena rules**.

## Current scope

Character creation uses a single editable page modeled on Character Record Sheet T-6.1 in the Core Rules. It groups identity, defense, resistance rolls, role traits, and background on the left, with stats, skills, attacks, equipment, hits, and power points on the right. Existing characters remain in browser storage. The sheet can roll a 10d10 stat pool, check stat assignment costs and prime stats, calculate stat and resistance bonuses, and track apprenticeship development point costs. The remaining sheet entries are recorded manually for now.

## Rust/WebAssembly rank bonuses

The browser initializes the bundled Rust/Wasm rank engine before loading the application. Failure or timeout uses a visibly labeled JavaScript fallback. Static hosting and project subpaths remain supported. See [build and validation instructions](rust/README.md). Publish wasm/ assets with the site; no Rust installation is required on the host.

Critical source review and remaining notation decisions are documented in [CRITICAL-AUDIT.md](CRITICAL-AUDIT.md). Encounters apply explicit recoil distances immediately: away from the attacker for direct attacks, or away from the chosen center for area spells. Bolt/ball actions can select their critical type to resolve those effects; leaving the choice blank retains manual critical resolution.
