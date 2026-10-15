# Critical shorthand presentation

Presentation only; tables/*.json, rules.js, critical branch selection, and combat
calculations are unchanged. Source inventory across A-10.10 and A-10.11 contains
H with +count, ∑, ∏, π, ∫, compound ∑∏, parentheses, signed modifiers and dashes.
The meanings follow parseCriticalSymbols and encounter.js's existing expansion:

- +nH: extra hits / 💥 n.
- n∑: stunned / 🌀 n rounds.
- n∏: unable to parry / 🚫 n rounds.
- n∑∏: stunned AND unable to parry / 🌀🚫 n rounds.
- nπ: must parry / 🛡️ n rounds.
- n(π−p), (nπ−p): must parry at −p / 🛡️ n rounds at −p.
- n∫: bleeding / 🩸 n hits per round (amount, NOT duration).
- n(−p): penalty −p / ➖ for n rounds; no n means duration unspecified.
- n(+b): attacker bonus +b / ➕ for n rounds.

Omitted counts mean 1 as in the current parser. n∑π is displayed as the separate
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

Legend: Arena rules, critical symbol → bold meaning → emoji, with duration notation.
The prior creature icon toggle/legend remains, as does horizontal round scrolling.

Checks: npm test includes full critical/fumble effect inventory reconstruction,
no shorthand remaining, parser immutability, compounds, modifiers, and HTML escaping.
Browser acceptance runs actual table selection/lookup, both viewport sizes, shared
immediate toggling, reload persistence, real combat critical log state invariance,
and the existing full character, Coliseum, and 14-round horizontal timeline suites.
