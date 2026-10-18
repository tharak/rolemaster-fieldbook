# Rolemaster Fieldbook

A static Rolemaster FRP companion for character creation and table lookup. It runs directly in a browser and can be hosted from the root of a GitHub Pages repository.

## Run locally

Serve this folder with any static web server and open its root URL. Browser storage and reference-data loading do not work reliably from a `file://` URL. No build step or package install is needed to serve the included assets. Skill rank bonuses use the bundled Rust/WebAssembly core, with a visibly labeled JavaScript fallback if it cannot load. See [Rust build and browser checks](rust/README.md) when changing the core.

## Check rules

Run `npm test` to check dice, stats, skill classifications, spell development costs, XP progression, character record decoding, the encounter actor projection, and Coliseum duels. No package install is needed. The package metadata configures ES modules, the built-in Node test runner, and the optional Wasm rebuild command.

For browser checks, serve the site locally, open it with Playwright CLI, and run `playwright-cli run-code --filename tests/browser-smoke.js`. The script creates its own browser context and checks table loading races, character creation, role rolls, saving, XP awards and undo, and level advancement.

Run `playwright-cli run-code --filename tests/coliseum-browser-smoke.js` for creature search, failed-loading recovery, stepping, pause/resume, full fights, choice persistence, and mobile layout checks.

## Specific skill choices

The character sheet, development, training packages, and background bonuses share
`skill-catalog.js`. New skills use fixed choices from Core Rules A-1, A-4, and the
A-7 Weapon Chart. Unspecified “other” specializations are omitted. All 96 core
spell lists reuse `data/guild/spell-lists.json`, filtered to own-realm open/closed
lists and own-profession base lists. Category costs and rank progressions remain
in the existing rules engine.

Saved custom skills remain available. Saved names outside the current catalog
have a **Choose skill** button for explicit replacement, retaining their ranks
and bonuses. Realm/profession changes refresh catalog choices without deleting
previously developed skills.

Run `playwright-cli run-code --filename tests/skill-catalog-browser-smoke.js` to
check catalog selection, spell visibility, search, favorites, and legacy saves
in an isolated browser context.

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

Open **Coliseum** to choose saved characters, all 45 opponents from T-5.8, or any of the 130 monsters and animals from A-8. Saved characters need positive hits and an equipped weapon. Search each contender by name, play one round at a time, or simulate until one falls. Pause and continue a fight, inspect previous rounds, or reset for a rematch. Creature choices persist in local storage independently of characters and encounters. Combat state is temporary and resets on page reload.

`tables/creatures.json` is the structured companion to the existing `chart-animal-monster.json`. It preserves the monster and animal charts as arrays with `name`, `size`, `hits`, `armor_type`, `defensive_bonus`, `speed_ms_aq`, `level`, three attack notation fields, and `special` notes. Stable creature IDs use the chart group and row index; preserve row order when editing this file.

The arena uses attack percentages (including Both), critical-triggered follow-ups, natural attack size caps, armor and DB, unmodified fumbles, open-ended d100, and normal physical criticals against large and super-large creatures. It applies numeric critical hits, bleeding, stun, forced parry, penalties, and bonuses. Bare penalties last until healed; other omitted temporary durations default to one round; explicit durations and relevant permanent/until-healed conditions remain intact. Bleeding stays ongoing. Initiative uses a documented arena adjustment from Attack Quickness; “you gain the initiative” instead wins the next round without initiative dice, then normal rolls resume. Weapon attacks assume a normal one-handed edged weapon. Hits determine victory, with a 200-round draw limit.

Each contender has equipment checkboxes that default to explicit saved gear or the shield printed in T-5.8 (unchecked for creatures), persist per side and contender, and lock during a fight. Supported conditions select the foe's equipment branch, including clauses that span the extracted description and effect fields. Armor type does not imply regional equipment. Explicit instant death ends the target's actions immediately; recognized death countdowns expire after the stated round transitions. Reducing recorded damage in Encounters cancels pending critical death without removing bleeding. The arena has no healing control. Unsupported compounds, inactive-round death requirements, other narrative injuries, optional/group attacks, special abilities, movement, and parrying require GM review. Original conditional results remain available in the arena log. These limits are also shown under **Arena rules**.

## Current scope

Character creation uses a single editable page modeled on Character Record Sheet T-6.1 in the Core Rules. It groups identity, defense, resistance rolls, role traits, and background on the left, with stats, skills, attacks, equipment, hits, and power points on the right. Existing characters remain in browser storage. The sheet can roll a 10d10 stat pool, check stat assignment costs and prime stats, calculate stat and resistance bonuses, and track apprenticeship development point costs. The remaining sheet entries are recorded manually for now.

## Rust migration and reusable rules

The Rust workspace now separates reusable game mechanics, Rolemaster rules, UI components and the browser adapter. The website uses Rust for numeric character rules, critical-effect timing and critical-effect rendering. The remaining UI and combat logic are being migrated incrementally; see [current scope and library reuse](RUST-MIGRATION.md).

The browser initializes the bundled Rust/Wasm engine before loading the application. Failure or timeout uses a visibly labeled JavaScript fallback. Static hosting and project subpaths remain supported. See [build instructions](rust/README.md). Publish wasm/ assets with the site; no Rust installation is required on the host.

Critical source review and remaining notation decisions are documented in [CRITICAL-AUDIT.md](CRITICAL-AUDIT.md). Encounters apply explicit recoil distances immediately: away from the attacker for direct attacks, or away from the chosen center for area spells. Bolt/ball actions can select their critical type to resolve those effects; leaving the choice blank retains manual critical resolution.

The Coliseum now has an animated pixel arena, Rust-rendered fighter HUDs, live hit
bars and roll/critical readouts. Open `/#coliseum` to play it directly. See
[MVP controls, architecture and checks](COLISEUM-MVP.md).


### Encounters, experience and equipment artwork

**Encounters → Random encounter · T-5.1** rolls open-ended activity and avoidance, applies terrain, density, travel, group-size and circumstance modifiers, and shows the rolls and table result. Rangers, Animists, Elves and Halflings count half once per person; fractional totals round up to a printed group-size band. Checks occur every four travel hours, once per sleep period, or hourly during hue and cry. The optional opponent suggestion is a separate, level-filtered convenience: the book leaves species, number and strength to the GM. Send one suggested or selected opponent to Coliseum for a duel.

**Coliseum → Experience awards** implements Core Rules §23 (pp. 71–74): hits delivered/received, criticals delivered/received, capped critical EP, kill/knockout EP less critical EP, and mortal wounds. Practice fights have no kill EP; explicitly select true conflict when appropriate. Learning value, intelligence, same race, Large/Super-large critical status, and revival require review. Fractional totals round down once. Recorded awards update a saved character’s XP and earned level, retain a unique award ID, prevent duplicate application, and use the existing sheet journal and undo. Fighting never changes a saved sheet’s wounds or equipment. The additional calculator handles spells, maneuvers, travel, idea shares, miscellaneous awards and negative XP. Unresolved critical clauses remain subject to the arena’s existing GM-review limitations.

`experience-rules.js` and `encounter-generation-rules.js` contain pure rules with no UI or storage dependencies; `coliseum-contenders.js` adapts the existing character projection and printed T-5.8 rows. T-5.8 directed spells require a specified spell, so the arena uses those opponents’ printed melee OB and explains this limitation.

The human sprites cover warrior, ranger, rogue, mage, cleric and bard archetypes. Twenty-six original equipment icon families appear in inventory, the shop, arena equipment choices and weapon HUDs; unfamiliar items use a generic item icon. These are visual families, not paper-doll equipment layers. Rebuild with `python3 scripts/build-coliseum-art.py` and `python3 scripts/build-equipment-art.py`. Browser checks cover all 200 catalog entries and actual rendering of every SVG symbol.

## GuildMaster · member management

**GuildMaster** is the landing page (`/#guildmaster`) and first navigation item.
Its main view is a grid of **members** with independent progress and inventory.
Each living member has an **Adventure / Rest / Work** segmented control.
Assignments save immediately and execute together when **Advance time · 4 hours**
is clicked. Adventure difficulty always equals the member's level.

Adventure starts or continues a single-member expedition. Encounters use the
existing random encounter and automatic combat rules. Results appear on the
member's card: HP/PP changes, XP, loot, and expandable round conclusions.
Selecting Rest or Work while away queues a return and locks the control until
arrival. The next turn returns the member and banks loot; subsequent turns perform
the selected base action. Rest follows the infirmary rules. Work earns one gold
per four-hour turn without healing or recovering power points (a campaign default).
Dead members do not act.

GuildMaster uses fixed T-5.8 member profiles and opponents from T-5.8, the
Monster Statistics Chart, and the Animal Statistics Chart (A-8). Cards show
printed hits, AT, DB, both OB slots, PP and spell ranks. Each recruit receives
persistent weapon/bolt assignments, with armor named from the core armor
descriptions for its AT. The highest printed OB is active (ties use slot 1).
Assignments add no equipment bonuses or armor penalties. Creature Wp attacks
receive melee weapons; natural attacks, sizes, probabilities, and follow-ups
remain intact. Special abilities and group/swarm attacks remain unsupported.

Directed spells randomly receive Fire, Ice, Lightning, Shock, or Water Bolt.
These are simple attacks every round, without preparation, PP cost, or spell-list
requirements. A-10.9.9 supplies their OB adjustments (0, −10, +10, −40, −20),
modified-result caps (150, 150, 150, 90, 120), and critical types/caps. Natural
100 retains its unmodified result. Cards show printed OB; reports separately
identify bolt adjustments. PP and spell ranks remain reference values.

There are no equipment/spell pickers, shop, or new equipment drops in this mode.
Versioned assignment IDs are saved per member; older members receive assignments
once without losing progress. Opponents receive deterministic assignments per
encounter, retained in reports, so retries cannot reroll equipment. Wounds, gold,
XP, orders, and history persist; XP does not advance a fixed profile. Existing
inventory stays in the save but does not affect combat. Loading an old save
restores canonical printed stats without resetting member progress. These
changes apply only to GuildMaster.

GuildMaster has no map or link to Adventures. The older party-based Adventures
mode retains its own save. On upgrade, the previously shared roster and progress
are copied once into GuildMaster's independent save before the old management
state is detached. Subsequent recruitment, inventory changes, and turns do not
cross between modes.

`guildmaster-rules.js` implements immutable orders and turn resolution;
`guildmaster-store.js` owns persistence, `guild-save-migration.js` preserves legacy
progress, and `guildmaster-member-view.js` renders compact member cards.
A turn is saved atomically after all results resolve. Failed loading or simulation
does not consume time or pay rewards. The journal retains 30 turns and up to 400
combat rounds. Tests cover save isolation and migration, simultaneous orders,
recovery, work, return locking, printed profiles, all 130 creature entries, failed simulation,
reloads, actual combat/loot, and mobile layout.

## Guild adventures

**Adventures** remains available from navigation (`/#adventure`). Recruit any of the 45 T-5.8
characters; four level-one members are supplied to start. Select 1–6 ready members,
choose adventure level 1–20, and send the party onto the seeded Middle-earth-inspired
map. Each **Continue adventure** advances a four-hour stage and rolls T-5.1.
Sightings/basic meetings are peaceful; hostile results automatically simulate
party combat. Only round reports, surviving HP/PP, XP, gold and item drops appear;
the guild never opens Coliseum. **Return to base** banks carried loot and unlocks
equipment changes. Wounds, power points and XP persist between stages and reloads.

The guild uses separate browser storage (`rolemaster-guild-v1`). Existing character
sheets and legacy journey saves remain untouched. Transitions are immutable and
saved atomically before reports appear; replaying a report does not grant rewards.
Failed table loading leaves the stage unchanged. Defeat or an 80-round stalemate
returns survivors to base. Dead members stay dead. Base rest affects only members
at base; equipment is uniquely owned and locked while away.

T-5.8 only supplies total spell ranks. `guild-spells.js` allocates those exact ranks
to explicitly identified profession presets. The 96 core spell lists and 836 spell
names (through level 10) are extracted from printed pp. 156–203 by
`scripts/extract-guild-spells.py`. Known spells appear on each guild card. Supported
automation includes healing, defensive wards, Shock Bolt, Jolts, Minor Pain,
Sleep III, and concentrating songs, with PP spending and preparation rounds.
Other spells remain reference-only. High-level definitions beyond the core book
are not invented. Guild casting assumes success after two preparation rounds;
hostile spells still use the basic attack/RR tables and bolts use attack/critical
tables. Unknown stat RR bonuses are zero. This is a documented MVP abstraction,
not a complete spell-casting implementation.

Loot is now implemented: victories grant gold and have a 35% equipment-drop chance;
weapon drops can receive +5. Drop rates, opponent composition/nearest printed level,
free recruitment, safe return, infirmary wound treatment and extra armor penalties
are explicit campaign choices, shown under **Guild campaign rules**. XP uses the
shared §23 calculator for attacks and supported spells, with normal uniqueness,
intelligent opponents and no same-race multiplier. It accumulates without automatic
level advancement. The store holds individual weapon, armor, shield and helmet
instances; two-handed weapons suppress shield DB without double-counting the
printed shield. Equipment changes affect subsequent combat.

`guild-rules.js`, `guild-battle.js`, and `guild-spells.js` are independent of DOM and
storage; `adventures.js` owns presentation/persistence. The battle module reuses
attack lookup and critical resolution, while legacy adventure rules/map generation
remain independently tested. Tests cover rank totals, party combat, spell spending,
loot transfer, equipment ownership, base-only recovery, determinism, defeat,
reloads, network failures, and desktop/mobile reports.

## Miscellaneous Topics · GM tools

Open **GM tools** or `/#gm` for Core Rules §§24.1–24.6. The workbench includes
wound/nerve recovery and death clocks, natural healing, magic-item appraisal and
use tracking, religion and market records, barter, Trading, coin weight, weather,
poison/disease records, and campaign customization. Records persist in this browser;
archive/restore keeps notebook history. Calculations live in separate rule modules.

Campaign settings affect available races, skills and weapons and the Body
Development fixed bonus (+10, +15 or +20). Saved ranks remain intact. Older sheets
adopt the explicit fixed bonus on opening/saving; remove any manual fixed-bonus
workaround. Healing can apply reviewed hit recovery to a patient in the active
encounter. Other GM records do not silently change sheet stats or inventory.
Rules referred to Gamemaster Law, negotiated prices and narrative consequences
remain explicit GM decisions. See [the topic tracker](MISCELLANEOUS-TOPICS.md)
for source pages, coverage and interpretation notes.
