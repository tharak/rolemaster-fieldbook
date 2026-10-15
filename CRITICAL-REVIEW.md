# Read-only critical table review

Open critical-review.html (main navigation: Critical review). Hash links select a
table, e.g. critical-review.html#A-10.10.4. No backend, new dependency, changes to
source tables, or combat mechanics. Existing criticalTokens/criticalEffectMarkup
are reused; original stored cell description and effect remain visible separately.

Coverage comes from all A-10.10.* references in tables/index.json, then validates
kind: critical and the row/column schema. No table numbers are enumerated in the
implementation. Current manifest: nine tables, 836 result coordinates. Current
checks: 547 green, 289 yellow. Missing cells are yellow; a table that cannot load
or has an invalid schema remains visible as unavailable, and totals explicitly say
incomplete. Empty/broken manifests report no results checked. Reload retries.

Green means only no automated issues detected — NOT rules correctness, human
approval, source transcription verification, or permission to automate narration.
Yellow reasons (visible text as well as background color):

- Missing description/result or malformed effect field.
- If/unless/w/o, with/without branches in effect fields, and equipment-dependent
  with/without clauses in descriptions: GM should review branch. Ordinary
  descriptions such as “with too much effort” are not flagged just for with.
- Explicit review/GM/uncertainty markers.
- Penalty without round count unless the description supplies an explicit duration,
  permanent effect, healing or until-condition; undated narrative stun/parry.
- Unknown leftover shorthand (including bare signed numbers, unfamiliar glyphs or
  incomplete parentheses); no unrecognized effect remainder can be green.
- Prose mixed into the effect field: check extraction boundaries against source.
- Shorthand embedded in description, repeated words, double colons, replacement
  glyphs, and known ambiguous/parser-mismatch spellings such as 10 ∫, ∑π, π(−10).

Bare ∑/∏/π, compound ∑∏ and bare bonuses retain their established one-round
convention. Bleeding is a rate until treated, not a missing duration. Explicit
permanent/until-healed/conditional durations are not called absent. No durations
or conditions are inferred into combat data. The review does not silently repair
OCR or choose branches.

Filters: all/green/yellow, reason, source/coordinate/reason search, one table or all.
Non-matching cells retain an explicit Filtered out placeholder so column alignment
and roll/severity coordinates remain honest. Overview and global counts always
refer to available source results, not the current filter. Every yellow result
lists reasons; every green result has a text status. Tables scroll horizontally
inside keyboard-focusable regions on desktop/mobile, not the page. Use emojis
shares the existing local preference; raw text is unaffected.

Limitations: heuristic keyword checks can over-flag or miss conditional prose
and cannot fully understand scope, healing conditions or narrative durations.
Recognizing a token is not proof that its OCR/count is correct. Green narration can
still require GM interpretation. Compare cells with the book before deciding.
This page neither records manual approval nor mutates source data.

Tests: npm test covers all manifest tables, exact count sums, source immutability,
positive/negative duration conventions, unknown notation and missing/schema errors.
The existing tests/wasm-browser.mjs suite additionally runs review acceptance:
actual green/yellow computed colors, complete inventory, table/hash navigation,
filters/search, original+readable text, emoji persistence, horizontal keyboard
scrolling, desktop/mobile overflow, missing-table recovery, empty/503 manifests,
and return navigation. Other character/Coliseum/timeline/critical/Wasm regressions
remain in the same suite. Native Rust and parity tests are unchanged.
