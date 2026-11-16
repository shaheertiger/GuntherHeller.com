# guntherheller.com

Calories and nutrition facts for 13,000+ foods (USDA FoodData Central), with USDA FoodKeeper
storage times on 918 common foods. URL structure and page layout follow EatThisMuch: one page per
food at `/calories/{food}/`. Fully static HTML (Astro), deployed on Vercel.

```bash
npm ci
npm run data:fetch  # download the USDA FoodData Central datasets into data/source/fdc/ (~230 MB, git-ignored)
npm run data        # rebuild data/foods.json (FoodKeeper), data/nutrition.json (FDC) and redirects.json
npm run dev         # http://localhost:4321
npm run build       # astro build + scripts/check-build.mjs (fails on broken links, duplicate titles, thin pages, bad redirects…)
```

`data/nutrition.json` and `redirects.json` are committed, so `npm run build` works without the downloads.

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

## Old URLs (Nov 2026 rebuild)

`seo/old-urls.json` lists every URL of the previous food-storage site (English and es/de/fr/pt-br).
`scripts/build-redirects.mjs` turns it into `redirects.json` (Vercel `bulkRedirectsPath`): each storage
page and its translations 301 to `/calories/{food}/` (question pages land on `#freeze`, `#bad` or `#leftout`),
old category hubs to the matching `/food/{category}/`. Anything else that does not exist is caught by
the `/:path*` rewrite to `api/home.js`, which answers 301 → `/`. Vercel applies rewrites only after the
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
- Branded and restaurant foods (EatThisMuch's biggest traffic: Jersey Mike's, Texas Roadhouse, Costco…).
  USDA's Branded Foods dataset covers packaged products (~450k); restaurant menus need another source.
- Calorie / TDEE / macro calculators and meal plans.
