#!/usr/bin/env node
/**
 * USDA FoodData Central Branded Foods → data/branded.json (store-brand products people search for)
 *
 *   node scripts/import-branded.mjs [--fetch]
 *
 * Branded Foods (April 2025, public domain) holds ~450k packaged products with their label nutrition. We do not
 * publish them all: a page only exists for a store-brand product that answers a real search. For each competitor
 * keyword that names a store brand ("kirkland egg whites", "great value greek yogurt"), the closest product of that
 * brand is imported. Keywords come from research/competitors/*.csv (see scripts/keywords.mjs).
 *
 * The dataset (~440 MB zipped, ~3 GB unzipped) goes to data/source/branded/ (git-ignored). --fetch downloads it.
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { execFileSync } from "node:child_process";
import { ROOT, loadKeywords, core, tok, makeMatcher } from "./keywords.mjs";

const ZIP = "FoodData_Central_branded_food_csv_2025-04-24.zip";
const SRC = path.join(ROOT, "data/source/branded");
const DIR = path.join(SRC, ZIP.replace(/\.zip$/, ""));
if (process.argv.includes("--fetch")) {
  fs.mkdirSync(SRC, { recursive: true });
  execFileSync("curl", ["-sSfL", "-m", "1800", "-o", path.join(SRC, ZIP), `https://fdc.nal.usda.gov/fdc-datasets/${ZIP}`], { stdio: "inherit" });
  execFileSync("unzip", ["-o", "-q", path.join(SRC, ZIP), "-d", SRC], { stdio: "inherit" });
  fs.rmSync(path.join(SRC, ZIP));
}
if (!fs.existsSync(path.join(DIR, "branded_food.csv"))) { console.error(`missing ${DIR}/branded_food.csv — run with --fetch`); process.exit(1); }

/* ---------------------------------------------------------------- store brands */
/** kw: how searchers name the store; product: brand_name / brand_owner of its own-label products. */
const STORES = [
  { slug: "kirkland-signature", brand: "Kirkland Signature", store: "Costco", kw: /\bkirkland\b|\bcostco\b/, product: /kirkland/i },
  { slug: "great-value", brand: "Great Value", store: "Walmart", kw: /great value|\bwalmart\b/, product: /^great value/i },
  { slug: "members-mark", brand: "Member's Mark", store: "Sam's Club", kw: /members? mark|sams club/, product: /member'?s mark/i },
  { slug: "good-and-gather", brand: "Good & Gather", store: "Target", kw: /good (and |& )?gather|\btarget\b/, product: /good (&|and) gather/i },
  { slug: "market-pantry", brand: "Market Pantry", store: "Target", kw: /market pantry/, product: /market pantry/i },
  { slug: "kroger", brand: "Kroger", store: "Kroger", kw: /\bkroger\b/, product: /^kroger\b/i },
  { slug: "simple-truth", brand: "Simple Truth", store: "Kroger", kw: /simple truth/, product: /simple truth/i },
  { slug: "365-whole-foods-market", brand: "365 by Whole Foods Market", store: "Whole Foods Market", kw: /\b365\b|whole foods/, product: /^365\b|whole foods market/i },
  { slug: "trader-joes", brand: "Trader Joe's", store: "Trader Joe's", kw: /trader joe/, product: /trader joe/i },
  { slug: "market-basket", brand: "Market Basket", store: "Market Basket", kw: /market basket/, product: /market basket/i },
  { slug: "wegmans", brand: "Wegmans", store: "Wegmans", kw: /\bwegmans\b/, product: /wegmans/i },
  { slug: "publix", brand: "Publix", store: "Publix", kw: /\bpublix\b/, product: /^publix/i },
  { slug: "h-e-b", brand: "H-E-B", store: "H-E-B", kw: /\bh-?e-?b\b/, product: /^h-?e-?b\b|h e butt/i },
  { slug: "signature-select", brand: "Signature Select", store: "Safeway & Albertsons", kw: /signature select|\bsafeway\b|\balbertsons\b/, product: /signature select/i },
  { slug: "food-lion", brand: "Food Lion", store: "Food Lion", kw: /food lion/, product: /food lion/i },
  { slug: "aldi", brand: "Aldi", store: "Aldi", kw: /\baldi\b/, product: /\baldi\b/i },
];
const storeTokens = new Set(STORES.flatMap((s) => [...tok(s.brand), ...tok(s.store), ...s.kw.source.replace(/\\b|[()?|^&]/g, " ").split(/\s+/).flatMap((w) => tok(w))]));

/* ---------------------------------------------------------------- the searches */
const { vol } = loadKeywords([]);
const wanted = new Map(); // store slug → [{ q: tokens, text, v }]
for (const [k, v] of vol) {
  const s = STORES.find((x) => x.kw.test(k));
  if (!s || /heart rate|calculator|bmi/.test(k)) continue;
  const { t, text } = core(k);
  const q = t.filter((w) => !storeTokens.has(w));
  if (!q.length) continue;
  (wanted.get(s.slug) ?? wanted.set(s.slug, []).get(s.slug)).push({ q, text, v });
}
console.log(`import-branded: ${[...wanted.values()].reduce((n, l) => n + l.length, 0)} store-brand searches across ${wanted.size} stores`);

/* ---------------------------------------------------------------- CSV streaming */
/** Rows of a large CSV (quoted fields may hold commas, quotes and newlines). */
async function* rows(file) {
  const stream = fs.createReadStream(file, { encoding: "utf8", highWaterMark: 1 << 20 });
  let head = null, row = [], cell = "", q = false, pendingQuote = false;
  for await (const chunk of stream) {
    for (let i = 0; i < chunk.length; i++) {
      const c = chunk[i];
      if (pendingQuote) { pendingQuote = false; if (c === '"') { cell += '"'; continue; } q = false; }
      if (q) { if (c === '"') pendingQuote = true; else cell += c; continue; }
      if (c === '"') q = true;
      else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\n") {
        row.push(cell); cell = "";
        if (!head) head = row; else if (row.length === head.length) yield Object.fromEntries(head.map((h, j) => [h, row[j]]));
        row = [];
      } else if (c !== "\r") cell += c;
    }
  }
}

/* ---------------------------------------------------------------- 1. store-brand products */
const prod = new Map(); // fdc_id → product
const byGtin = new Map();
for await (const r of rows(path.join(DIR, "branded_food.csv"))) {
  if (r.discontinued_date || (r.market_country && r.market_country !== "United States")) continue;
  const s = STORES.find((x) => x.product.test(r.brand_name) || x.product.test(r.brand_owner));
  if (!s || !wanted.has(s.slug)) continue;
  const size = +r.serving_size;
  const unit = (r.serving_size_unit || "").toLowerCase();
  if (!size || !/^(g|grm|ml|mlt)$/.test(unit)) continue;
  const p = { id: +r.fdc_id, store: s, size, liquid: /^m/.test(unit), household: r.household_serving_fulltext.trim(), category: r.branded_food_category, modified: r.modified_date || r.available_date };
  const key = r.gtin_upc || r.fdc_id;
  const prev = byGtin.get(key);
  if (prev && prev.modified >= p.modified) continue;
  if (prev) prod.delete(prev.id);
  byGtin.set(key, p);
  prod.set(p.id, p);
}
for await (const r of rows(path.join(DIR, "food.csv"))) {
  const p = prod.get(+r.fdc_id);
  if (p) p.description = r.description.trim();
}
console.log(`import-branded: ${prod.size} current store-brand products for those stores`);

/* ---------------------------------------------------------------- 2. pick the product each search means */
const titleCase = (s) =>
  s.toLowerCase().replace(/(^|[\s\-/(&])([a-z])/g, (_m, p, c) => p + c.toUpperCase())
    .replace(/\b(And|Or|Of|In|The|With|On|A|To|For|From)\b/g, (w) => w.toLowerCase()).replace(/^./, (c) => c.toUpperCase())
    .replace(/'S\b/g, "'s").replace(/\b(\d+)(Oz|Ct|Lb|Pk|G|Ml)\b/g, (_m, n, u) => n + u.toLowerCase());
const productsByStore = new Map();
for (const p of prod.values()) {
  if (!p.description) continue;
  // Product names repeat the brand ("KIRKLAND SIGNATURE EGG WHITES"); the page name adds it back once.
  let n = titleCase(p.description.replace(new RegExp(`^(${p.store.brand.replace(/[^a-z0-9 ]/gi, ".?")})\\s*`, "i"), "").trim() || p.description);
  const segs = n.split(/,\s*/);
  if (segs.length > 1 && tok(segs.at(-1)).every((w) => tok(segs.slice(0, -1).join(" ")).includes(w))) n = segs.slice(0, -1).join(", ");
  p.name = n;
  (productsByStore.get(p.store.slug) ?? productsByStore.set(p.store.slug, []).get(p.store.slug)).push({ ...p, desc: p.description, src: "B", brand: p.store.brand });
}
const picked = new Map(); // fdc_id → { product, searches }
for (const [slug, list] of wanted) {
  const products = productsByStore.get(slug) ?? [];
  if (!products.length) continue;
  const { bestLoose } = makeMatcher(products);
  for (const w of list) {
    const m = bestLoose(w.q);
    if (!m) continue;
    const e = picked.get(m.food.id) ?? picked.set(m.food.id, { p: m.food, v: 0, searches: [] }).get(m.food.id);
    e.v += w.v;
    e.searches.push(w.text);
  }
}
console.log(`import-branded: ${picked.size} products answer at least one search`);

/* ---------------------------------------------------------------- 3. their nutrients (per 100 g / 100 ml, as USDA publishes them) */
const nbr = new Map();
for await (const r of rows(path.join(DIR, "nutrient.csv"))) if (r.nutrient_nbr) nbr.set(r.id, r.nutrient_nbr.replace(/\.0$/, ""));
const KEEP = new Set(["203", "204", "205", "291", "269", "539", "606", "605", "645", "646", "601", "307", "301", "303", "306", "304", "305", "309", "320", "318", "324", "328", "401", "404", "405", "406", "415", "417", "418", "430", "323", "262", "255", "208"]);
const vals = new Map();
const rl = readline.createInterface({ input: fs.createReadStream(path.join(DIR, "food_nutrient.csv"), { highWaterMark: 1 << 20 }), crlfDelay: Infinity });
for await (const line of rl) {
  // "id","fdc_id","nutrient_id","amount",…  (no commas inside these fields)
  const a = line.indexOf('","'), b = line.indexOf('","', a + 3);
  const id = +line.slice(a + 3, b);
  if (!picked.has(id)) continue;
  const c = line.indexOf('","', b + 3), d = line.indexOf('"', c + 3);
  const k = nbr.get(line.slice(b + 3, c));
  const amount = parseFloat(line.slice(c + 3, d));
  if (!k || !KEEP.has(k) || Number.isNaN(amount)) continue;
  (vals.get(id) ?? vals.set(id, {}).get(id))[k] = amount;
}

/* ---------------------------------------------------------------- 4. write */
const CAT_RULES = [
  [/dressing|mayonnaise|sauce|condiment|salsa|\bdip|gravy|vinegar|seasoning|spice/i, "soups-sauces"], [/nut (and|&) seed butter|peanut|almond|\bnuts?\b|\bseeds?\b/i, "nuts-seeds"],
  [/ice cream|frozen (dessert|novelt)|candy|chocolate|cookie|cake|pastr|dessert|donut|doughnut/i, "sweets-desserts"],
  [/yogurt|milk|cheese|cream|\bbutter\b|egg|dairy/i, "dairy-eggs"], [/chicken|turkey|poultry/i, "poultry"], [/beef|steak/i, "beef"], [/pork|ham\b/i, "pork"],
  [/bacon|sausage|hot dog|deli|lunch ?meat|pepperoni|salami/i, "sausages-deli-meats"], [/fish|seafood|tuna|salmon|shrimp|tilapia|sardine/i, "fish-seafood"],
  [/bread|bagel|muffin|croissant|tortilla|bakery|cake|cookie|pastr|biscuit|roll/i, "breads-baked-goods"], [/cereal|granola|oat/i, "breakfast-cereals"],
  [/pasta|rice|grain|noodle|quinoa/i, "grains-pasta"], [/bean|legume|hummus|tofu/i, "beans-legumes"],
  [/fruit|berr|apple|banana/i, "fruits"], [/vegetable|potato|salad|produce/i, "vegetables"], [/soup|sauce|dressing|condiment|salsa|dip/i, "soups-sauces"],
  [/oil|shortening|mayonnaise/i, "fats-oils"], [/candy|chocolate|dessert|ice cream|frozen novelt|sweet/i, "sweets-desserts"],
  [/chip|cracker|snack|popcorn|pretzel/i, "snacks"], [/pizza|sandwich|burrito/i, "burgers-sandwiches-pizza"], [/meal|entree|dinner|prepared/i, "meals-dishes"],
  [/beverage|drink|juice|water|soda|coffee|tea/i, "beverages"],
];
const catOf = (p) => (CAT_RULES.find(([re]) => re.test(p.category)) ?? CAT_RULES.find(([re]) => re.test(p.name)) ?? [null, "other-foods"])[1];
const slugify = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " and ").replace(/%/g, " percent ").replace(/['’]/g, "").split(/[^a-z0-9]+/).filter(Boolean).join("-");
const existing = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, "data/nutrition.json"), "utf8")).foods.map((f) => f.slug));
const sig = (v) => (v === 0 ? 0 : +v.toPrecision(4));
const out = [];
for (const { p, v: demand, searches } of [...picked.values()].sort((a, b) => b.v - a.v)) {
  const raw = vals.get(p.id);
  if (!raw || raw["208"] == null || raw["203"] == null || raw["204"] == null || raw["205"] == null) continue;
  const v = {};
  for (const [k, x] of Object.entries(raw)) if (k !== "208" && k !== "539") v[k] = sig(x);
  v.kcal = Math.round(raw["208"] * 10) / 10;
  const unit = p.liquid ? "ml" : "g";
  const FR = { "0.25": "¼", "0.33": "⅓", "0.333": "⅓", "0.5": "½", "0.66": "⅔", "0.667": "⅔", "0.75": "¾" };
  const label = (p.household && !/^(amount per serving|serving|1 serving)$/i.test(p.household) ? p.household : "1 serving")
    .replace(/\s+/g, " ").toLowerCase().replace(/\bgrm\b/g, "g").replace(/\bonz\b/g, "oz").replace(/\bmlt\b/g, "ml").replace(/\btbsp\./g, "tbsp").replace(/\btsp\./g, "tsp")
    .replace(/^(0\.\d+)/, (m) => FR[m] ?? m).replace(/, per package$/, "");
  let slug = slugify(`${p.store.brand.replace(/ by Whole Foods Market/, "")} ${p.name}`).split("-").reduce((acc, w) => ((acc + "-" + w).length > 72 ? acc : acc ? acc + "-" + w : w), "");
  if (existing.has(slug)) slug = `${slug}-${p.id}`;
  existing.add(slug);
  out.push({
    id: p.id, src: "B", brand: p.store.brand, store: p.store.store, storeSlug: p.store.slug,
    desc: p.description, name: `${p.store.brand} ${p.name}`, cat: catOf(p), slug,
    p: [[`${label}${unit === "ml" ? ` (${+p.size.toFixed(1)} ml)` : ""}`, +p.size.toFixed(1)]],
    v, sim: [], liquid: p.liquid || undefined, labelUpdated: p.modified, searches: [...new Set(searches)].slice(0, 5),
  });
}
fs.writeFileSync(path.join(ROOT, "data/branded.json"), JSON.stringify({
  meta: { generated: new Date().toISOString().slice(0, 10), source: "USDA FoodData Central, Branded Foods (April 2025)", url: "https://fdc.nal.usda.gov/download-datasets", count: out.length, stores: STORES.map(({ slug, brand, store }) => ({ slug, brand, store })) },
  foods: out,
}));
console.log(`data/branded.json: ${out.length} store-brand products (${[...new Set(out.map((f) => f.brand))].length} brands)`);
