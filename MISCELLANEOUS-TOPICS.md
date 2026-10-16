# Core Rules §24 implementation tracker

Source: `Rolemaster FRP - CORE Rules - OCR.pdf`, printed pp. 75–83.
Each numbered topic is implemented and committed separately. The GM tools page
keeps calculations and campaign records separate from editable character stats.

- [x] **24.1 Injury, Death & Healing (75–79)** — wound classification; all T-5.4
  recovery bands and all 12 T-5.5 races; individual wound/nerve rolls, permanent
  nerve penalties, first aid and loss of its benefit after strain; combined
  recovery; concussion-hit recovery with optional active-encounter application;
  soul recovery; T-5.6 mental-stat loss, physical/potential loss clocks,
  Preservation, Lifekeeping, soul departure and Lifegiving restrictions.
  Source ambiguity at permanent-injury total exactly 100 is explicitly referred
  to the GM. Physical hourly loss starts at round 420 (one full hour after its
  60-round delay); daily penalty fractions truncate and the remainder applies
  on day one. Sheet stat edits, special healing-spell requirements, Undead
  transformation and narrative permanent injuries remain explicit GM decisions.
  Tests: source table values/bounds, Onree's 34.5-day recovery, Solrac's permanent
  nerve damage, Jaide's 35-round shock countdown, first aid, natural/soul healing,
  and separate death clocks. Appendix A-4.5 p. 112 sets the sleep minimum
  to three hits per three hours, whereas §24.1 p. 79 says one. The GM
  calculator exposes both printed choices; the character summary uses A-4.5.
  The character recovery summary and GM tool share the same hit-recovery function.
- [x] **24.2 Magic Items (80–81)** — T-5.3 appraisal (all worked examples),
  spell-level/charge limits, consumable and daily uses, attunement prerequisites,
  recharge/rune reuse, and one bonus spell item per rest with adder limits.
  Item spells and bonuses remain reviewed inputs to the existing spell/skill
  workflows. Daily resets use chronological GM-entered in-game day labels.
- [x] **24.3 Religion (82)** — editable, persistent character/community religious
  records: local practices, ceremonies, duties, sacred places and healing-service
  requirements. Archive/restore preserves history. No mechanical bonuses invented;
  detailed religious systems are explicitly deferred to Gamemaster Law.
- [x] **24.4 Economics (82)** — all five cultural guidelines, saved local market
  profiles, coin acceptance, barter comparisons using real A-7 prices, and
  editable obligation/gift/exchange records. Acceptance remains a local decision;
  the journal does not silently transfer equipment or money.
- [x] **24.5 Other Topics (83)** — sale quote prerequisites, Trading maneuver
  outcomes (not automatic negotiated prices), exact coin value/physical weight,
  daily weather journal, all ten A-7 poison summaries and preparation constraints,
  and poison/disease records. Missing Gamemaster Law weather/disease generation
  is not invented; these remain GM-entered conditions.
- [x] **24.6 Customizing Rolemaster (83)** — persistent campaign race choices,
  skill/weapon exclusions with categories and saved ranks preserved, and
  +10/+15/+20 fixed Body Development bonus. Applies to sheet calculations, shop,
  starting weapon choices, play rolls and character encounter/Coliseum projection.
  Older sheets adopt the explicit fixed bonus when opened/saved; existing manual
  +10 workarounds need removal. Printed NPCs and fights already started are unchanged.
