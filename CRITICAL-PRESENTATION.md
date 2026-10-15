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
- n(−p): penalty −p / ➖ for n rounds; no n defaults to one round.
- n(+b): attacker bonus +b / ➕ for n rounds.

Omitted temporary counts mean one round unless the relevant description gives an
explicit duration, permanent effect, or until-condition. Bleeding remains a rate.
“You gain the initiative” displays attacker first next round without a roll.
Recognized target death displays Dies / ☠️, instantly or after the stated round
transitions unless healed; ambiguous fatal prose remains literal for review.
Duration context is stored with rendered tokens so emoji toggles preserve it.
n∑π is displayed as the separate
stun and must-parry tokens; it is NOT conflated with ∑∏. π(−10) is likewise a
must-parry token followed by a separate penalty, matching current parsing rather
than silently fixing mechanics. A spaced 10 ∫ is rendered with its visible amount
10; automated parsing behavior is deliberately unchanged. Standalone separators
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
