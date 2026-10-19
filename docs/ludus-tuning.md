# Tuning the Ludus

Edit **`src/ludus-config.js`**, save, and reload the browser. No build step is needed. This file is the single entrypoint for Ludus gameplay numbers. Comments identify the printed sources; changing those values creates house rules.

## Common adjustments

| Goal | Setting |
|---|---|
| Cheaper building ranks | `economy.rankPrices` — index 0 buys rank 1 |
| Cheaper promotions | `progression.levels[].gold` |
| Faster leveling | `progression.levels[].xp` or `victoryXpMultiplier` |
| More shared magic capacity | `progression.levels[].pp` |
| Different starting resources | `starting` and the starting level profile |
| A specific service price | `economy.servicePrices`, keyed by spell ID |
| General service prices | `economy.goldPerSpellLevel` |
| More blessings per fighter | `arena.blessingsPerFighter` |
| Different rest recovery | `time.restDays`, `restPpFraction`, `restHpFraction` |
| More/fewer offers | `arena.offerCount` and matching entries in `targetRatios` |
| Turn automatic rerolls off | `arena.autoRefresh` |
| Different healing/duration | The spell's `dice`, `recoveryDays`, or `durationMinutesPerLevel` |
| Different casting risks | `casting` tables and failure results |

For example, changing the override object to `servicePrices: {'nerve:4': 2}` makes Minor Nerve Repair cost two gold. Its PP cost remains the spell's level times `casting.ppPerSpellLevel`.

Prices and ranks must be nonnegative integers. Durations are expressed in the units named by their properties. Dice use `[numberOfDice, sides]`. Offer count cannot exceed the five available themes; add a positive target ratio for each requested offer. XP and level milestones must increase. Startup validation names malformed settings instead of silently accepting them.

The existing gladiator recruitment prices, attack tables, and creature combat statistics are independent systems, not Ludus settings.

## Saves and tuning changes

New settings affect future purchases and casts. Already purchased ranks, recorded rolls, rewards, and historical bills do not change. Active effects and treatments save their absolute expiration time and their resolved bonuses; editing a spell does not rewrite an effect already cast.

Changing PP capacity preserves PP already spent: increasing maximum PP from 16 to 20 with five points spent gives 15 available PP. Reducing the maximum clamps available PP at zero. Promotions use the same rule; upgrading a building never refills PP. Lowering a rank cap does not remove purchased knowledge, but prevents further purchases above the new cap.

Existing companies receive a level-one Ludus without retrospective XP. Save reloads never cast spells, charge gold, advance time, or generate new opponents. The game clock advances only during services, battles, and rest.

## Spell rules and arena conventions

The three complete spell lists are Nerve Law, Concussion's Ways, and Protections, up to the level-ten spells printed in Core Rules. Limb Preservation is listed but unavailable until its matching Blood Law, Bone Law, and Muscle Law spells exist. No spell here restores a dead gladiator.

Nerve damage is separate from HP loss. Minor Nerve Repair handles a nerve penalty up to −20; Major Nerve Repair can treat more serious damage, but neither restores totally destroyed nerves. Both require one day of recovery. Unparalysis suppresses one paralysis problem for ten minutes per Ludus level, rather than removing its underlying injury. Effects and recovery continue while other spells are prepared or while the Ludus concentrates on Regeneration.

Preparation, depleted-power penalties, casting maneuvers, ordinary failure checks, and non-attack failure consequences use Core pp.46–47 and p.241. The Ludus is an unarmored Channeling caster with free hands and speech; it does not overcast above its level. Initial stats/category bonuses and resident bonuses are zero. The building supplies its limited-progression spell skill ranks. The notebook table extracts are deliberately not used: they are incomplete and contain different modifiers.

The printed failure table occasionally calls for GM interpretation. Those narrative disorders are retained in the caster's record alongside the specified numerical consequences; no extra invented penalty is applied. Impact criticals use the configurable Core crush critical table. The arena calendar uses a configurable 30-day month for month-based failures. These conventions are explicit adaptations, not additional printed spell rules.

The arena uses abstract positions in feet, independent of animation. The attendant is nearby, each team starts in a compact formation, and melee attackers close to their selected target. Spheres follow their target and affect every combatant within the radius, including an enemy. Protection-family bonuses do not stack; heat/cold bonuses only apply against the corresponding elemental attack. Natural temperature protection is stored on the effect; the current arena has no environmental temperature hazard. Prayer's maneuver bonus is also retained, although the current automatic combat has no maneuver actions.

Gold is paid per attempt, including a failed attempt. PP follows the failure table, so some failures consume no PP or only part of the usual cost. A delayed cast completes without another fee; a failed cast is never automatically retried. The service history and battle report preserve the rolls and outcome.

## Verification after editing

Run `npm test`. If subprocess test isolation is unavailable, run `node --test --test-isolation=none tests/*.test.mjs`.

Browser coverage: `tests/ludus-browser-smoke.js` checks upgrades, promotions, treatment, recovery, blessings, enemy refresh, persistence, and narrow layouts. The arena, consequences, and playback smoke suites cover regressions.
