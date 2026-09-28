# Rolemaster Fieldbook

A static Rolemaster FRP companion for character creation and table lookup. It runs directly in a browser and can be hosted from the root of a GitHub Pages repository.

## Run locally

Serve this folder with any static web server and open its root URL. Browser storage and reference-data loading do not work reliably from a `file://` URL. No build step or package install is needed.

## Publish with GitHub Pages

1. Push the files in this folder to a GitHub repository.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select the branch containing these files and the `/ (root)` folder, then save.

The character roster is stored in browser local storage. It is available in the same browser and on the same device where each character was created. The Tables page lists 65 tables and charts; each has a separate JSON source file in `tables/`. Attack tables are structured for roll and armor lookup; the other tables preserve their source page text and spacing. The page never opens the PDF viewer.

## Table source files

Each file in `tables/` is one table or chart. `tables/index.json` provides the searchable page index. To regenerate the extracted data from the included PDF, install Poppler's `pdftotext` and run `node scripts/extract-development-costs.mjs`, `node scripts/extract-attack-tables.mjs`, and `node scripts/extract-book-tables.mjs` in that order.

## Current scope

The sheet calculates the apprenticeship development point budget from the five development stats and applies profession-specific skill development costs as ranks are assigned. Experience points remain the advancement currency for levels; development points are spent on skills. Training package and extra stat gain purchases still need to be recorded with the GM.
