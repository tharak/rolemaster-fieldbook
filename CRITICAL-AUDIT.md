# Critical source audit

The nine critical-strike tables were compared with the included Core Rules PDF,
printed pages 231–239 (PDF pages 232–240). All 836 result coordinates remain in
review. The current derived review has 836 green and zero yellow results.
Green means no unresolved automated source/parser issue, not human approval or
complete automation of every narrative injury.

`critical-source.js` records 58 corrections (54 PDF corrections and four user rulings) with their coordinate, printed/PDF
page, exact extracted originals, derived description/effect, and reason. Matching
requires both original fields, so changed source cannot receive an old correction.
The original `tables/*.json` and embedded source-page records remain intact.
Review shows original text beside the corrected readable result and its provenance.
Tables, encounter criticals and Coliseum use the same derived corrections.

Corrections repair duplicated OCR, words spilled between columns, description
lines cut into effect fields, and duplicated effect text. The Puncture 66/D
postfix helmet condition is moved before the fatal clause in the derived text
so the condition scopes the death correctly. The four ambiguous printed
notations were resolved by the user on 2026-10-15; their original text remains
visible and the derived entries explicitly identify the user rulings:

| Coordinate | Printed effect | User ruling |
| --- | --- | --- |
| Heat 66 / B | `+10 – 2∑ – 4∫` | 10 extra hits; retain 2 stunned rounds and bleeding 4/round |
| Heat 66 / D | `+10∑ – (-10) – 6∫` | 10 extra hits and 1 stunned round; retain penalty and bleeding |
| Heat 76–80 / B | `20 – 2∫` | 20 extra hits and bleeding 2/round |
| Spells Against Creatures 91–95 / Large creature Slaying | `2∑π – (-30)` | 2 stunned rounds and 2 rounds unable to parry; retain penalty |

The Core Rules “Key to the Criticals,” printed page 209 (PDF page 210), supplies
the shared defaults: omitted β means one, except an uncounted penalty lasts until
the wound is healed. Bleeding starts next round and stays ongoing; omitted parry
penalty α means zero. No-parry and must-parry are mutually exclusive in one
result branch. No-parry restricts attacks, and general penalties/bonuses affect
initiative and attacks while leaving DB and resistance rolls unchanged.

Supported equipment branches are checked separately, with explanatory notes and
foe equipment required for combat. Wet/soaked, warm clothing and neck armor are
explicit conditions. Narrative conditions without parsed numeric consequences
remain visible as GM-managed text; unsupported mechanical conditions stay yellow.
False positives for dying flames, figurative mortal blows, uncertain footing,
spaced bleeding amounts and the `π(-p)` parry spelling are resolved.

Explicit bare death, immediate death, next-round death and stated countdown
variants are recognized. Inactive-round requirements and hours/days are displayed
with their exact conditions as GM-managed, and never converted to ordinary combat
countdowns. All-allies bonuses preserve their scope and require GM assignment
because encounters and the arena have no team model.

Stun uses one cumulative pool across ordinary stun, stunned/no-parry and typed
down-or-out effects. Each completed round spends only one active stun round,
from the most severe type first. Character consciousness uses Co stat bonus:
above `10 + 2 × Co` loses consciousness, equality preserves existing stun
unconsciousness, and recovery requires a lower total with no other cause.
Clearing an effect reduces the same pool; damage/manual unconsciousness survives
stun relief. The arena shares cumulative expiry; creature Co stats and parrying
are not modeled by its source catalog.

Recoil uses the stated number of feet. Direct attacks use the attacker's current
hex; area spells use a fixed selected center and the targets inside the initial
radius. Movement stops before blocked/occupied hexes or the map edge. Whole hexes
use the encounter scale; any unrepresentable remainder is reported for GM review.
A foe at the attack origin requires the GM to choose a direction. Bolt/ball spells
have an optional critical-type choice; existing drafts default to manual critical
resolution. The arena reports recoil without inventing map positions.

The combined regression coverage includes source-coordinate
integrity, source immutability, branch alternatives, fatal wording and scope,
actual weapon/bolt/area recoil, map rendering, saving, and mobile controls.

Validation on 2026-10-15: all 70 unit tests passed. The combined Chromium run
passed all nine browser regressions, Rust/Wasm parity at root and project paths,
and missing/delayed-Wasm startup. The actual review UI reported 836 green, zero
yellow, 58 source corrections and zero page errors. Stun recovery, other causes
of unconsciousness and saved state were checked through actual encounter controls.
