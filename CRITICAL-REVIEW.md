# Critical table review

Open `critical-review.html` from the main navigation. Hash links select a table,
e.g. `critical-review.html#A-10.10.4`. Coverage follows the A-10.10.* references in
`tables/index.json`, validates their critical schema, and checks 836 coordinates
across nine tables. Current derived results: 836 green, zero yellow. See
[the source audit](CRITICAL-AUDIT.md) for the source corrections and four explicit user rulings.

Green means no unresolved automated source/parser issue. It does not certify
rules correctness, human approval, or automation of every narrative injury.
Yellow has visible reasons for missing results, unsupported mechanical branches,
explicit GM uncertainty, unknown notation/prose, suspicious OCR, or unrecognized
target-fatal claims. Missing or broken tables remain unavailable and counts say
incomplete; empty/broken manifests never claim a successful review. Reload retries.

Supported equipment alternatives are parsed and checked separately. Green cells
with such branches include notes explaining that combat uses the foe's configured
equipment. Ordinary conditional or uncertain narrative is not treated as broken
notation. Clearly stated GM-managed conditions stay visible: inactive rounds,
hours/days, and ally bonuses do not become invented combat effects.

Omitted counts default to one, with the Core Rules penalty exception: a bare
`(-α)` lasts until the wound is healed. Stun/parry effects and bonuses default to
one round; `+H` means one hit, and `∫` means one bleeding hit per round. Explicit counts and relevant permanent/until-healed/ongoing durations
are preserved. Bleeding is a rate until treated. `π(-p)` means must parry at the
stated penalty; a spaced bleeding count retains its numeric value. The user ruled that the ambiguous printed `2∑π` at A-10.10.9 / 91–95 / Slaying
means two rounds stunned and unable to parry; that correction is scoped to its
source coordinate.

The shared source-correction layer retains all original extracted fields and
records checked PDF coordinates. Review shows original description/effect,
corrected readable output, and provenance notes. Source JSON and combat state are
not changed by opening review. The combat engines and table browser separately
use the same derived corrections. The emoji preference changes presentation only.

Filters cover all/green/yellow, reason, search, and table. Filtered cells keep
placeholders so roll/severity alignment remains honest. Overview counts refer to
the entire available inventory. Every result has a text status, and every yellow
lists reasons. Tables scroll inside keyboard-focusable regions on desktop/mobile.

Checks cover manifest completeness, source immutability, correction coordinates,
duration conventions, alternative equipment branches, unknown notation, missing
schemas, and meaningful narrative scope. Browser coverage verifies actual colors,
filters/search, original/readable text, shared emoji persistence, keyboard scrolling,
mobile overflow, missing-table recovery, manifest errors, and return navigation.
