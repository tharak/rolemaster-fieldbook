# Rolemaster Fieldbook

A static Rolemaster FRP companion for character creation and table lookup. It runs directly in a browser and can be hosted from the root of a GitHub Pages repository.

## Run locally

Serve this folder with any static web server and open its root URL. Browser storage and reference-data loading do not work reliably from a `file://` URL. No build step or package install is needed.

## Publish with GitHub Pages

1. Push the files in this folder to a GitHub repository.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select the branch containing these files and the `/ (root)` folder, then save.

The character roster is stored in browser local storage. It is available in the same browser and on the same device where each character was created. The Tables page lists 65 tables and charts; each has a separate JSON source file in `tables/`. Attack tables support roll and armor lookup, and critical tables support roll and critical type lookup. Other tables preserve their source page text. The page never opens the PDF viewer.

The Encounters page opens by default and lists saved encounters. Each encounter has its own hex map, round, and action log in browser local storage; the list can create, continue, and delete encounters. Existing single-encounter data is carried into the list. Select characters in the encounter header to roll initiative automatically and plan each character’s Snap, Normal, and Deliberate actions in initiative order. Choices and status buttons are saved as they are made; Resolve round uses the selected actions. Place a character from their action card, then choose a highlighted hex; creature and hex targets are selected from highlighted map locations. Weapon criticals, weapon fumbles, and spell failures are rolled and their table descriptions appear in the action log with effect symbols expanded. Unconditional critical penalties reduce later action rolls and initiative, expire after their listed rounds, and can be cleared from a character card when healed; DB and resistance rolls are unaffected. A timed penalty begins next round if the target has already used at least 50% of this round’s activity.

## Table source files

Each file in `tables/` is one table or chart. `tables/index.json` provides the searchable page index. Reference JSON contains cropped text from the printed table, with its spacing preserved so columns remain aligned. To regenerate the extracted data from the included PDF, install Poppler's `pdftotext` and run `node scripts/extract-development-costs.mjs`, `node scripts/extract-attack-tables.mjs`, `python3 scripts/extract-critical-tables.py`, and `node scripts/extract-book-tables.mjs` in that order. The last command refreshes only the other reference files and the index; it leaves attack and critical JSON untouched.

## Current scope

Character creation uses a single editable page modeled on Character Record Sheet T-6.1 in the Core Rules. It groups identity, defense, resistance rolls, role traits, and background on the left, with stats, skills, attacks, equipment, hits, and power points on the right. Existing characters remain in browser storage. The sheet can roll a 10d10 stat pool, check stat assignment costs and prime stats, calculate stat and resistance bonuses, and track apprenticeship development point costs. The remaining sheet entries are recorded manually for now.
