# Wayfarers’ Guild · mobile beta

A turn-based guild companion game. Guild and Adventures are views of the same game, with one roster, clock and treasury. The player navigation contains Guild and Adventures. Existing artwork is reused.

Recruit a free first companion from the level-one T-5.8 profiles, then care for up to six members. Meals cost 1 gold and restore food and morale immediately. Rest includes free food, healing, energy, and morale. All orders resolve together when you tap **Next turn · 4h**; nothing changes while you are away.

Adventures continue without a stage limit until the player chooses Recall. Low food, energy, morale, or wounds do not automatically recall a living companion. Recall returns them on the following turn. Each stage grants 5 XP and 1 gold, in addition to combat rewards. Defeated members are rescued with 1 HP. Rest brings them back into action. Companions automatically advance through the printed level 5/10/15/20 profiles at total XP of 100/300/600/1000, with no gold cost. These care, reward, rescue, and progression rules are game-specific beta choices.

Recruiting additional members costs 12 gold. Manage guild lets you rename the guild or dismiss companions after confirmation; keep at least one member and recall away members first. Compact member cards show equipment icon buttons, bars with their labels and values inside, and Rest/Recall, Adventure, and Meal actions. Only equipped items appear; icons have accessibility labels without visible descriptions. Rename members in Manage guild. Latest adventure rewards appear above each member card, briefly flashing after a turn. Combat results have a ⚔️ button that opens their battle log. Item rewards appear only when an item was actually awarded. Returned gold is labeled banked.

## Fresh beta saves

The first load of this beta clears all previous `rolemaster-*` browser records, including characters, members, items, encounters, and old mode saves. No legacy progress is migrated. Unrelated browser storage is untouched. The new save is `rolemaster-guild-beta-v2`; a reset marker prevents repeating the wipe. **Manage guild → About this beta → Start a new guild** resets the current game after confirmation.

Progress is local to this browser and device. There is no account, cloud sync, or offline cache. The web manifest supports a standalone mobile presentation. Serve the repository over HTTP or HTTPS; do not open index.html as a file.

## Run and verify

```sh
python3 -m http.server 8011
npm test
```

Open http://localhost:8011. Static hosting and project subpaths work without a build step. Publish the repository root with GitHub Pages. Browser smoke coverage is in `tests/guild-game-browser-smoke.js`, run through Playwright CLI's `run-code --filename` against the local server.

## Implementation

- `browser-startup.js` performs the one-time beta reset and starts `guild-game.js`.
- `guild-ui.js` supplies reusable stat bars and equipment icons. `guild-game.js` and `guild-game.css` provide the mobile shell, member cards, adventures, and combat popups.
- `guild-game-rules.js` implements immutable care, recruitment, progression, and turn resolution.
- `guild-beta-store.js` validates and saves completed changes atomically; failed simulation does not advance the clock.
- `guildmaster-rules.js`, `guild-rules.js`, and `guild-battle.js` supply the underlying adventure and combat rules.
- `guild-member-results.js` renders member rewards and combat popups. `guild-data.js` loads printed profiles and lazy-loads combat tables.

Recruits use T-5.8; opponents use T-5.8, the Monster Statistics Chart, and the Animal Statistics Chart. Each adventuring member has an independent 50% combat chance per turn, day or night (d100: 1–50 combat, 51–100 quiet travel). This beta pacing replaces T-5.1 for the guild game; the original tabletop encounter rules remain available in `encounter-generation-rules.js`. Assigned melee/ranged weapons, bolts, and armor retain the printed statistics. Directed spells use Fire, Ice, Lightning, Shock, or Water Bolt with A-10.9.9 adjustments, without PP spending or preparation. Creature special abilities and group/swarm attacks remain unsupported. The beta is not a complete tabletop rules implementation.

Older character, encounter, Coliseum, and GM source modules remain available for rule reuse and their regression tests, but their interfaces are not loaded by the game. See `CRITICAL-AUDIT.md` for combat source review and `rust/README.md` for the optional Rust libraries. The current guild entrypoint uses the JavaScript rules.
