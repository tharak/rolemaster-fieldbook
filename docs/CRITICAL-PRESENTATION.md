# Critical shorthand presentation

Source tables remain unchanged. Presentation and combat parsing share temporary
duration, initiative, and recognized death conventions. Source inventory across
A-10.10 and A-10.11 contains
H with +count, ∑, ∏, π, ∫, compound ∑∏, parentheses, signed modifiers and dashes.
The meanings follow parseCriticalSymbols and encounter.js's existing expansion:

- +nH: extra hits / 💥 n.
- n∑: stunned / 🌀 n rounds.
- n∏: unable to parry / 🚫 n rounds.
- n∑∏: stunned AND unable to parry / 🌀🚫 n rounds.
- nπ: must parry / 🛡️ n rounds.
- n(π−p), (nπ−p): must parry at −p / 🛡️ n rounds at −p.
- n∫: bleeding / 🩸 n hits per round (amount, NOT duration).
- n(−p): penalty −p / ➖ for n rounds; no n means until the wound is healed.
- n(+b): attacker bonus +b / ➕ for n rounds.

Core Rules, Key to the Criticals, printed page 209 (PDF page 210): omitted β
means one unless otherwise specified. The detailed penalty rule is the exception:
a bare (−α) lasts until the wound is healed. Other omitted temporary counts mean
one round, and an omitted must-parry α means zero. Explicit durations and
permanent/until-conditions remain intact. Bleeding remains a rate.
“You gain the initiative” displays attacker first next round without a roll.
Recognized target death displays Dies / ☠️, instantly or after the stated round
transitions unless healed; ambiguous fatal prose remains literal for review.
Duration context is stored with rendered tokens so emoji toggles preserve it.
n∑π is displayed as the separate
stun and must-parry tokens; it is NOT conflated with ∑∏. π(−10) is a must-parry token at −10, equivalent to (π−10).
A spaced 10 ∫ retains the amount 10 in both presentation and mechanics. Standalone separators
– / — are punctuation, not a status. Bare +10, 20 and conditional/OCR prose remain
literal: presentation does not guess missing H or choose equipment branches.

Default tokens are bold descriptive text. Emoji mode shows distinct emoji plus
amount/duration; title and aria-label retain the full descriptive meaning. All
unrecognized prose and raw-source attributes are escaped. A lossless tokenizer
retains source token order and conditional branches, not global prose replacement.

Shared preference reuses rolemaster-coliseum-emojis-v1, default false. The existing
Use emojis checkbox immediately updates marked critical output in table grid,
lookup, encounter table dialog/new encounter action logs, and Coliseum round logs.
New output uses the same mode, even when Tables loads before Coliseum is opened.
Stored encounter log markup is refreshed from its raw-source attribute on render;
old historic logs already expanded to prose remain readable unchanged.

Legend: Arena rules, critical symbol → bold meaning → emoji, with duration notation
and Dies / ☠️. The creature icon toggle remains; its separate arena marker legend
has been removed. Horizontal round scrolling remains.

Checks: npm test includes full critical/fumble effect inventory reconstruction,
no shorthand remaining, source immutability, compounds, modifiers, and HTML escaping.
Browser acceptance runs actual table selection/lookup, both viewport sizes, shared
immediate toggling, reload persistence, real combat critical log state invariance,
and the existing full character, Coliseum, and 14-round horizontal timeline suites.
The critical-semantics browser suite also checks actual one-round expiry, ongoing
bleeding, automatic initiative without RNG, independent equipment choices,
instant/countdown deaths, and healing through the saved encounter damage input.

The shared source audit supplies traceable derived corrections while preserving
all original JSON. Recognized inactive-round/hour/day death and ally bonuses
display their conditions as GM-managed. See CRITICAL-AUDIT.md for the four
recorded user rulings and recoil behavior.
