#!/usr/bin/env node
/**
 * seo/old-urls.json (every URL of the old food-storage site, captured before the Nov 2026 rebuild)
 * → data/old-redirects.json, the old-path → new-path map used by the catch-all route src/pages/[...path].ts.
 * (Vercel bulk redirects cap at 1,000 on this plan; the function has no limit.)
 *
 *   food storage pages (EN + es/de/fr/pt-br) → /calories/{slug}/ (#freeze, #bad, #leftout for the question pages)
 *   old category hubs                         → the matching /food/{category}/
 *   anything with no counterpart              → no entry; the catch-all route sends it to / with a 301
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const old = JSON.parse(fs.readFileSync(path.join(ROOT, "seo/old-urls.json"), "utf8"));
const pages = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, "data/nutrition.json"), "utf8")).foods.map((f) => f.slug));

const CAT = {
  "dairy-eggs": "dairy-eggs", meat: "beef", poultry: "poultry", seafood: "fish-seafood", "leftovers-deli": "meals-dishes", fruits: "fruits",
  vegetables: "vegetables", "grains-beans-pasta": "grains-pasta", "baked-goods": "breads-baked-goods", "condiments-sauces": "soups-sauces",
  beverages: "beverages", "baby-food": "baby-foods", "vegetarian-proteins": "beans-legumes",
};
const SUB = { "meat/bacon-ham-sausage": "sausages-deli-meats", "leftovers-deli/deli-meat": "sausages-deli-meats", "pantry-staples/nuts-seeds": "nuts-seeds", "pantry-staples/oils": "fats-oils", "pantry-staples/spices": "spices-herbs", "beverages/alcohol": "alcohol", "vegetables/herbs": "spices-herbs" };
const STATIC = {
  "/foods/": "/food/", "/can-you-freeze/": "/food/", "/does-it-go-bad/": "/food/", "/left-out-overnight/": "/food/",
  "/es/": "/", "/de/": "/", "/fr/": "/", "/pt-br/": "/",
  "/es/metodologia/": "/methodology/", "/de/methodik/": "/methodology/", "/fr/methodologie/": "/methodology/", "/pt-br/metodologia/": "/methodology/",
  "/es/alimentos/": "/food/", "/de/lebensmittel/": "/food/", "/fr/aliments/": "/food/", "/pt-br/alimentos/": "/food/",
};

const out = [];
for (const [src, [type, slug]] of Object.entries(old)) {
  let dest = null;
  if (type === "food" && pages.has(slug)) {
    const anchor = src.startsWith("/can-you-freeze-") ? "#freeze" : /^\/does-.+-go-bad\/$/.test(src) ? "#bad" : src.endsWith("-left-out-overnight/") ? "#leftout" : "";
    dest = `/calories/${slug}/${anchor}`;
  } else if (STATIC[src]) dest = STATIC[src];
  else {
    const m = src.match(/^\/foods\/([^/]+)\/(?:([^/]+)\/)?$/);
    if (m) dest = `/food/${SUB[`${m[1]}/${m[2]}`] ?? CAT[m[1]] ?? ""}${SUB[`${m[1]}/${m[2]}`] || CAT[m[1]] ? "/" : ""}`;
    else if (/^\/(es|de|fr|pt-br)\/[^/]+\/[^/]+\/$/.test(src)) dest = "/food/"; // localized category hubs
  }
  if (dest && dest !== src) out.push({ source: src, destination: dest, permanent: true });
}
const map = Object.fromEntries(out.map((r) => [r.source, r.destination]));
fs.writeFileSync(path.join(ROOT, "data/old-redirects.json"), JSON.stringify(map, null, 0).replace(/","/g, '",\n"') + "\n");
console.log(`data/old-redirects.json: ${out.length} redirects (${Object.keys(old).length - out.length} old URLs left to the catch-all or unchanged)`);
