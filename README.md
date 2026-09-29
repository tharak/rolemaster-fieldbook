# Rolemaster Fieldbook

A static Rolemaster FRP companion for character creation and table lookup. It runs directly in a browser and can be hosted from the root of a GitHub Pages repository.

## Run locally

Serve this folder with any static web server and open its root URL. Browser storage and reference-data loading do not work reliably from a `file://` URL. No build step or package install is needed.

## Publish with GitHub Pages

1. Push the files in this folder to a GitHub repository.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select the branch containing these files and the `/ (root)` folder, then save.

The character roster is stored in browser local storage. It is available in the same browser and on the same device where each character was created. The Tables page lists 65 tables and charts; each has a separate JSON source file in `tables/`. Attack tables support roll and armor lookup, and critical tables support roll and critical type lookup. Other tables preserve their source page text. The page never opens the PDF viewer.

## Table source files

Each file in `tables/` is one table or chart. `tables/index.json` provides the searchable page index. Reference JSON contains cropped text from the printed table, with its spacing preserved so columns remain aligned. To regenerate the extracted data from the included PDF, install Poppler's `pdftotext` and run `node scripts/extract-development-costs.mjs`, `node scripts/extract-attack-tables.mjs`, `python3 scripts/extract-critical-tables.py`, and `node scripts/extract-book-tables.mjs` in that order. The last command refreshes only the other reference files and the index; it leaves attack and critical JSON untouched.

## Current scope

Character creation follows the Core Rules sequence: concept and initial choices, stats, adolescence, background options, apprenticeship, role, and final preparation. Each step links to its relevant table. The stats step tracks assignment points and can apply the fixed potential stat option. The apprenticeship step calculates development points from the five development stats and applies profession-specific skill costs; training packages and extra stat gain costs can be entered as other DP spent. Characters save automatically in this browser, including the current step.
