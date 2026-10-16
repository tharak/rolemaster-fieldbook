# Critical table validation

The public critical-review page has been removed. Automated validation remains in
`critical-review-rules.js` and `tests/critical-review.test.mjs`; run it with
`node --test tests/critical-review.test.mjs`. It checks 836 coordinates across nine
critical tables. See [the source audit](CRITICAL-AUDIT.md) for corrections and
explicit user rulings.

Green means no unresolved automated source/parser issue. It does not certify
human approval or automation of every narrative injury. Validation covers source
immutability, correction coordinates, duration conventions, equipment branches,
unknown notation, missing schemas and narrative scope.

The combat engines and in-game table references retain the shared source
corrections and readable critical effects. Original extracted data is preserved.
The Tables and Encounters navigation links are hidden. Contextual table access
and the encounter page remain available; the brand opens encounters.
