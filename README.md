# guntherheller.com

Programmatic food-storage reference: "how long does {food} last", "can you freeze {food}",
"does {food} go bad" and "{food} left out overnight" for every food in USDA FoodKeeper.
Fully static HTML (Astro), deployed on Vercel.

```bash
npm ci
npm run data     # rebuild data/foods.json from FoodKeeper + overrides
npm run dev      # http://localhost:4321
npm run build    # astro build + scripts/check-build.mjs (fails on broken links, missing schema, etc.)
npm run og       # re-render the single site-wide OG image (public/og.png)
```

## How it fits together

| Path | What it is |
| --- | --- |
| `data/source/foodkeeper.json` | USDA FSIS FoodKeeper v128, byte-identical to `fsis.usda.gov/shared/data/EN/foodkeeper.json` (SHA-256 `037df0d3…`). Public domain. `npm run data -- --fetch` tries to refresh it. |
| `data/overrides.json` | Our layer: search-friendly names and slugs, toggle pairs (cooked ↔ dry rice), sourced patches (milk), custom foods with their own source (breast milk/CDC), hand-written copy by slug, publishing priority. Schema: `data/overrides.schema.json`. |
| `scripts/import-foodkeeper.mjs` | Normalises FoodKeeper + overrides → `data/foods.json` (663 foods, 15 categories). |
| `src/lib/data.ts` | Types, URL builders, duration formatting, answer-card cells. |
| `src/lib/content.ts` | Generated copy per food "kind" (signs of spoilage, freeze steps, storage tips, FAQ, titles, meta descriptions). Overrides win. |
| `src/pages/[slug].astro` | All root-level food URLs (base page + 3 variants). |
| `src/components/FoodPage.astro` | Food page template (matches the FoodPage / MobileFood designs). |
| `src/components/VariantPage.astro` | Can-you-freeze / does-it-go-bad / left-out-overnight pages: own H1, title, numbers and FAQ. |
| `src/components/HubPage.astro` | Category and subcategory hubs (filter chips + sortable table, ItemList schema). |
| `src/components/QuestionHub.astro` | A–Z question hubs. |
| `src/pages/tools/` | Leftover, freezer-time, thaw-time, left-out and date-label tools. |
| `src/lib/sitemap.ts` | Sitemap index split into foods / questions / hubs; `lastmod` = `SITE.verifiedISO`. |
| `seo/` | Disavow builder notes and the launch checklist. |

## URLs

```
/how-long-does-{food}-last/   /can-you-freeze-{food}/   /does-{food}-go-bad/   /{food}-left-out-overnight/
/foods/  /foods/{category}/  /foods/{category}/{sub}/
/can-you-freeze/  /does-it-go-bad/  /left-out-overnight/
/tools/  /tools/{tool}/  /methodology/  /about/
```
Variant pages exist only where they have something to say: can-you-freeze needs a FoodKeeper
freezer figure; left-out-overnight is only for perishable foods. Currently 2,021 HTML pages.

## Editorial rules
- Never invent a duration. No FoodKeeper figure → the page says "Not listed".
- Any number not from FoodKeeper lives in `overrides.json` with `_why` and a named public source.
- When you re-verify against a new FoodKeeper release, bump `SITE.verifiedISO` / `verifiedLabel` in
  `src/lib/site.ts`; that date drives "last verified", JSON-LD `dateModified` and sitemap `lastmod`.

## Performance budget
Food pages ship zero client JS (the opened/unopened toggle is CSS radio inputs, FAQs are `<details>`).
CSS ~26 KB, inlined. Lighthouse mobile: 100 / 100 / 100 / 100 on food, home, hub and tool pages.
Ad slots are fixed-size placeholders (`AdSlot.astro`) so CLS stays 0 when a network is added.

## Not done yet
- Phase 3 locales (ES/DE/FR/PT-BR mirrors + hreflang). `Base.astro` already emits `en` + `x-default`.
- Foods from the priority list that FoodKeeper does not cover and that need a citable source
  before publishing: cold brew, beer, protein powder, opened dog food and cat food.
- Illustrations: hubs and home use paper tiles with stroke icons until the watercolour set exists.
