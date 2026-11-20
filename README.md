# guntherheller.com

Calories and nutrition facts for 13,000+ foods (USDA FoodData Central), with USDA FoodKeeper
storage times on 918 common foods. URL structure and page layout follow EatThisMuch: one page per
food at `/calories/{food}/`. Fully static HTML (Astro), deployed on Vercel.

```bash
npm ci
npm run data:fetch  # download the USDA FoodData Central datasets into data/source/fdc/ (~230 MB, git-ignored)
npm run data        # rebuild data/foods.json (FoodKeeper), data/nutrition.json (FDC) and api/_redirects.js
npm run dev         # http://localhost:4321
npm run build       # astro build + scripts/check-build.mjs (fails on broken links, duplicate titles, thin pages, bad redirects…)
```

`data/nutrition.json` and `api/_redirects.js` are committed, so `npm run build` works without the downloads.

## URLs

```
/calories/{food}/            one food: calories, macros, serving picker, Nutrition Facts (%DV), vitamins & minerals,
                             sugars, fats & fatty acids, amino acids; storage times, freezing, spoilage signs for FoodKeeper foods
/food/                       browse: categories + nutrient rankings
/food/{category}/            every food in a category (calories, protein, carbs, fat per 100 g)
/food/high-{nutrient}-foods/ top 100 foods per 100 g (protein, fiber, potassium, iron, vitamin C…), plus low-calorie / low-carb
/tools/{tool}/               storage calculators (leftovers, freezer time, thaw time, left-out checker, date decoder)
/search/  /methodology/  /about/  /privacy/  /terms/
```

## Data

| Path | What it is |
| --- | --- |
| `scripts/import-fdc.mjs` | FDC Foundation Foods (2025-04) + SR Legacy (2018-04) + FNDDS 2021–2023 → `data/nutrition.json`: per-100 g nutrients, household portions (most natural first), category, slug, similar foods. Identical names are de-duplicated (Foundation > SR > FNDDS). |
| `data/storage-fdc.json` | Each FoodKeeper food → the one FDC record that best represents it (2 have none). That record's page takes the storage food's name and slug, so `/how-long-does-milk-last/` maps to `/calories/milk/`. |
| `data/source/foodkeeper.json`, `scripts/import-foodkeeper.mjs`, `data/overrides.json` | USDA FSIS FoodKeeper v128 + our names/patches → `data/foods.json` (storage times). |
| `src/lib/nutrition.ts` | Nutrient definitions and FDA Daily Values, serving maths, titles/descriptions, rankings, URL builders. |
| `src/lib/data.ts`, `src/lib/content.ts` | Storage data and generated storage copy (signs of spoilage, freezing, left-out rule, tips). |
| `src/components/NutritionPage.astro` | The `/calories/` template. Schema: WebPage, BreadcrumbList, NutritionInformation, FAQPage. |

## Search demand, indexing and new page types (20 Nov 2026)

Google indexes the foods people search for, not every USDA record. The pipeline:

```bash
# 1. Put Semrush "Organic Positions" exports of sites that rank (EatBetter, CalorieKing, MyNetDiary) in research/competitors/ (git-ignored)
node scripts/import-branded.mjs --fetch   # store-brand products that answer a real search → data/branded.json (~440 MB download, git-ignored)
node scripts/build-demand.mjs             # keyword → food page mapping → data/demand.json, unmatched searches → seo/demand-gaps.md
npm run build
```

| File | What it is |
| --- | --- |
| `scripts/keywords.mjs` | Shared keyword parsing ("calories in a medium apple" → "medium apple") and food matching. |
| `data/demand.json` | Monthly US searches each food page answers. `isIndexable()` in `src/lib/nutrition.ts`: storage foods, restaurant items, store-brand products and generic foods with ≥ 100 searches/month are indexable; the rest stay built and linked but `noindex` and out of the sitemaps. |
| `data/chains.json` | Restaurant chains with USDA-analysed menu items → `/restaurants/` and `/restaurants/{chain}/`. |
| `data/branded.json` | Store-brand products (USDA Branded Foods, label data) → `/calories/{brand}-{product}/` and `/brands/{store}/`. |
| `seo/demand-gaps.md` | The most-searched foods with no page yet (mostly chains USDA does not analyse: Jersey Mike's, Texas Roadhouse, Dunkin', Starbucks…). |

Page names: `readableName()` in `src/lib/nutrition.ts` turns USDA record names into the words people search for
("Chicken, broilers or fryers, breast, meat only, cooked, roasted" → "Chicken breast (cooked, roasted)"). Slugs never change.
Titles read "{Food} Calories and Nutrition Facts ({n} Calories per {serving})".

### People and review
`src/lib/people.ts` holds the nutrition reviewer (Karman Meyer, RDN, LDN), shown on `/authors/karman-meyer/`, in every
byline and as Person structured data. `data/reviewed.json` records reviews: set `site` to the date she finished
reviewing the whole site, or list individual `pages` (path → date). Only then do pages say "Reviewed by … on {date}"
and carry `reviewedBy`/`lastReviewed`; `scripts/check-build.mjs` fails the build if a page claims a review that file does not list.
Trust pages: `/editorial-policy/`, `/contact/`, `/about/`, `/methodology/`.

## Old URLs (Nov 2026 rebuild)

`seo/old-urls.json` lists every URL of the previous food-storage site (English and es/de/fr/pt-br).
`scripts/build-redirects.mjs` turns it into `api/_redirects.js`, the map the catch-all function `api/home.js` uses (Vercel bulk redirects cap at 1,000 on this plan): each storage
page and its translations 301 to `/calories/{food}/` (question pages land on `#freeze`, `#bad` or `#leftout`),
old category hubs to the matching `/food/{category}/`; any other missing URL gets a 301 to `/`.
The function is reached through the `/:path*` rewrite in `vercel.json`. Vercel applies rewrites only after the
filesystem, so real pages are never affected.

## Data sync

`.github/workflows/foodkeeper-sync.yml` downloads the live FoodKeeper file every Monday, rebuilds
`data/foods.json`, runs the build check and opens a PR when it changed. If FoodKeeper adds a food,
add it to `data/storage-fdc.json` and run `npm run data`.

## Editorial rules
- Never invent a number. Nutrition comes from FDC; storage from FoodKeeper (or a named source in `overrides.json`).
- A nutrient USDA did not analyse shows a dash, never a zero.
- Hand-written food questions (`data/ask.json`) never restate numbers, so they cannot contradict the data.

## Not done yet
- Restaurant chains USDA does not analyse (Jersey Mike's, Texas Roadhouse, Dunkin', Starbucks, Wingstop, Panda Express,
  Five Guys, Costco food court…): their menus need another source, such as each chain's published nutrition guide. See `seo/demand-gaps.md`.
- Calorie / TDEE / macro calculators and meal plans.
