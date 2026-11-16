#!/usr/bin/env node
/**
 * USDA FoodData Central → data/nutrition.json
 *
 *   node scripts/import-fdc.mjs            # read data/source/fdc/*.json (download them first with --fetch)
 *   node scripts/import-fdc.mjs --fetch    # download the three datasets into data/source/fdc/ (git-ignored, ~230 MB)
 *
 * Sources (all public domain, USDA ARS):
 *   Foundation Foods 2025-04, SR Legacy 2018-04, FNDDS 2021-2023 (survey foods, 2024-10).
 * Every food becomes one /calories/{slug}/ page. The 663 FoodKeeper storage foods are matched to one
 * FDC record each in data/storage-fdc.json; that record's page takes the storage food's name and slug
 * (so /how-long-does-milk-last/ → /calories/milk/) and carries the storage section.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SRC = path.join(ROOT, "data/source/fdc");
const BASE = "https://fdc.nal.usda.gov/fdc-datasets/";
const FILES = [
  { tag: "F", zip: "FoodData_Central_foundation_food_json_2025-04-24.zip", json: "FoodData_Central_foundation_food_json_2025-04-24.json", key: "FoundationFoods", name: "USDA Foundation Foods (April 2025)" },
  { tag: "S", zip: "FoodData_Central_sr_legacy_food_json_2018-04.zip", json: "FoodData_Central_sr_legacy_food_json_2018-04.json", key: "SRLegacyFoods", name: "USDA SR Legacy (April 2018)" },
  { tag: "N", zip: "FoodData_Central_survey_food_json_2024-10-31.zip", json: "surveyDownload.json", key: "SurveyFoods", name: "USDA FNDDS 2021–2023 (October 2024)" },
];

if (process.argv.includes("--fetch")) {
  fs.mkdirSync(SRC, { recursive: true });
  for (const f of FILES) {
    const zip = path.join(SRC, f.zip);
    console.log("downloading", f.zip);
    execFileSync("curl", ["-sSfL", "-m", "600", "-o", zip, BASE + f.zip], { stdio: "inherit" });
    execFileSync("unzip", ["-o", "-q", zip, "-d", SRC], { stdio: "inherit" });
    fs.rmSync(zip);
  }
}

/* ---------------------------------------------------------------- nutrients kept (FDC nutrient numbers) */
const KEEP = [
  "203", "204", "205", "291", "269", "209", "210", "211", "212", "213", "214", "287", "221", "255", "262", "263",
  "606", "645", "646", "605", "601", "307", "301", "303", "306", "304", "305", "309", "312", "315", "317", "313",
  "320", "318", "319", "321", "322", "334", "337", "338", "401", "328", "324", "325", "326", "323", "430",
  "404", "405", "406", "410", "415", "417", "435", "418", "421",
  "501", "502", "503", "504", "505", "506", "507", "508", "509", "510", "511", "512", "513", "514", "515", "516", "517", "518", "521",
];
const ALIASES = { "269.3": "269", "205.2": "205c", "298": "204n" };

/* ---------------------------------------------------------------- categories */
export const CATEGORIES = [
  ["fruits", "Fruits & fruit juices"], ["vegetables", "Vegetables"], ["beef", "Beef"], ["pork", "Pork"], ["poultry", "Chicken, turkey & poultry"],
  ["fish-seafood", "Fish & seafood"], ["lamb-veal-game", "Lamb, veal & game"], ["sausages-deli-meats", "Sausages, bacon & deli meats"],
  ["dairy-eggs", "Dairy & eggs"], ["beans-legumes", "Beans, legumes & soy"], ["nuts-seeds", "Nuts & seeds"], ["grains-pasta", "Grains, rice & pasta"],
  ["breads-baked-goods", "Breads & baked goods"], ["breakfast-cereals", "Breakfast cereals"], ["meals-dishes", "Meals & mixed dishes"],
  ["burgers-sandwiches-pizza", "Burgers, sandwiches & pizza"], ["fast-food-restaurants", "Fast food & restaurants"], ["soups-sauces", "Soups, sauces & condiments"],
  ["fats-oils", "Fats, oils & dressings"], ["snacks", "Snacks"], ["sweets-desserts", "Sweets & desserts"], ["beverages", "Beverages"],
  ["alcohol", "Beer, wine & spirits"], ["spices-herbs", "Spices & herbs"], ["baby-foods", "Baby foods & formula"], ["other-foods", "Other foods & ingredients"],
].map(([slug, name]) => ({ slug, name }));

const SR_CAT = {
  "Dairy and Egg Products": "dairy-eggs", "Spices and Herbs": "spices-herbs", "Baby Foods": "baby-foods", "Fats and Oils": "fats-oils",
  "Poultry Products": "poultry", "Soups, Sauces, and Gravies": "soups-sauces", "Sausages and Luncheon Meats": "sausages-deli-meats",
  "Breakfast Cereals": "breakfast-cereals", "Fruits and Fruit Juices": "fruits", "Pork Products": "pork", "Vegetables and Vegetable Products": "vegetables",
  "Nut and Seed Products": "nuts-seeds", "Beef Products": "beef", "Beverages": "beverages", "Finfish and Shellfish Products": "fish-seafood",
  "Legumes and Legume Products": "beans-legumes", "Lamb, Veal, and Game Products": "lamb-veal-game", "Baked Products": "breads-baked-goods",
  "Sweets": "sweets-desserts", "Cereal Grains and Pasta": "grains-pasta", "Fast Foods": "fast-food-restaurants", "Restaurant Foods": "fast-food-restaurants",
  "Meals, Entrees, and Side Dishes": "meals-dishes", "Snacks": "snacks",
};
function wweiaCat(n, desc) {
  if (n <= 1904) return "dairy-eggs";
  if (n <= 2004) return "beef";
  if (n === 2006) return "pork";
  if (n <= 2010) return "lamb-veal-game";
  if (n <= 2206) return "poultry";
  if (n <= 2404) return "fish-seafood";
  if (n === 2502) return "dairy-eggs";
  if (n <= 2608) return "sausages-deli-meats";
  if (n === 2804) return "nuts-seeds";
  if (n <= 2806) return "beans-legumes";
  if (n <= 3506) return "meals-dishes";
  if (n <= 3744) return "burgers-sandwiches-pizza";
  if (n <= 3808) return "soups-sauces";
  if (n <= 4004) return "grains-pasta";
  if (n <= 4404) return "breads-baked-goods";
  if (n <= 4804) return "breakfast-cereals";
  if (n <= 5404) return "snacks";
  if (n <= 5806) return "sweets-desserts";
  if (n <= 6024) return "fruits";
  if (n <= 6806) return "vegetables";
  if (n <= 7008) return n <= 7006 ? "fruits" : "vegetables";
  if (n >= 7502 && n <= 7506) return "alcohol";
  if (n <= 7804) return "beverages";
  if (n === 8006 || n === 8008) return "dairy-eggs";
  if (n <= 8012) return "fats-oils";
  if (n <= 8412) return "soups-sauces";
  if (n <= 8806) return "sweets-desserts";
  if (n <= 9602) return "baby-foods";
  if (n === 9802) return "beverages";
  if (/^(Basil|Chives|Cilantro|Parsley)/.test(desc)) return "spices-herbs";
  return "other-foods";
}

/* ---------------------------------------------------------------- names */
const SMALL = new Set(["and", "or", "of", "in", "with", "the", "a", "on", "to", "for", "as", "n'", "w/"]);
/** Brand segments in SR Legacy are upper case ("McDONALD'S, BIG MAC"). */
function brandCase(seg) {
  if (!/[A-Z]{3}/.test(seg) || /[a-z]{3}/.test(seg.replace(/Mc|Mac/g, ""))) return seg;
  if (/^[A-Z&]{2,4}$/.test(seg)) return seg; // KFC, A&W
  return seg.toLowerCase().replace(/(^|[\s\-/(&.])([a-z])/g, (_m, p, c) => p + c.toUpperCase()).replace(/\bMc([a-z])/g, (_m, c) => "Mc" + c.toUpperCase()).replace(/'S\b/g, "'s");
}
function clean(desc) {
  return desc
    .replace(/\s+/g, " ")
    .split(", ")
    .map(brandCase)
    .filter((s) => !/^(NFS|NS as to .*|not further specified|from fast food \/ restaurant)$/i.test(s))
    .join(", ")
    .replace(/\s*\((?:Includes|Include|formerly)[^)]*\)/gi, "")
    .replace(/,\s*$/, "")
    .trim();
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const slugify = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " and ").replace(/%/g, " percent ").replace(/['’]/g, "").split(/[^a-z0-9]+/).filter(Boolean).join("-");
function slugFor(name) {
  const words = slugify(name).split("-");
  let out = [];
  for (const w of words) { if ((out.join("-") + "-" + w).length > 70) break; out.push(w); }
  return out.join("-");
}

/* ---------------------------------------------------------------- portions */
const FRAC = { 0.25: "¼", 0.5: "½", 0.75: "¾", 0.33: "⅓", 0.333: "⅓", 0.67: "⅔", 0.667: "⅔", 1.5: "1½", 2.5: "2½" };
const num = (x) => FRAC[x] ?? String(+x.toFixed(2));
function portionsOf(x, tag) {
  const out = [];
  for (const p of x.foodPortions ?? []) {
    const g = +p.gramWeight;
    if (!g || g <= 0) continue;
    let label;
    if (tag === "N") label = (p.portionDescription ?? "").trim();
    else {
      const amt = +(p.amount ?? p.value ?? 1) || 1;
      const unit = p.measureUnit?.name && p.measureUnit.name !== "undetermined" ? p.measureUnit.name : "";
      const mod = (p.modifier ?? "").trim();
      label = [num(amt), unit, unit && mod ? `(${mod})` : mod].filter(Boolean).join(" ");
    }
    label = label.replace(/\s+/g, " ").replace(/^1 (?=\d)/, "");
    if (!label || /quantity not specified|^guideline amount/i.test(label) || /^\d+$/.test(label)) continue;
    if (out.some((o) => o[0] === label)) continue;
    out.push([label.slice(0, 80), Math.round(g * 10) / 10]);
  }
  return out.slice(0, 12);
}
/** Put the most natural serving first (it is the page's default): "1 medium", "1 slice", "1 cup"… */
function preferServing(p, cat, desc) {
  const head = desc.split(/[ ,]/)[0].toLowerCase().replace(/(es|s)$/, "");
  const small = cat === "spices-herbs" || cat === "fats-oils" || cat === "soups-sauces";
  const score = ([l, g]) => {
    let s = 0;
    if (/^1 /.test(l)) s += 2;
    if (/\bmedium\b/.test(l)) s += 5;
    if (/\b(slice|piece|fillet|breast|thigh|drumstick|egg|fruit|link|patty|sandwich|burger|bar|cookie|muffin|bagel|serving)\b/.test(l)) s += 4;
    if (/\bcup\b/.test(l)) s += 3;
    if (/\b(tbsp|tablespoon)\b/.test(l)) s += small ? 6 : 1;
    if (/\b(tsp|teaspoon)\b/.test(l)) s += cat === "spices-herbs" ? 7 : 0;
    if (/\b(fl oz|oz)\b/.test(l)) s += 1;
    if (/school|container|package|pkg|yield|\blb\b|whole (pie|cake|pizza|chicken)|roast\b|can\b|bottle|jar|loaf|recipe|batch/i.test(l)) s -= 6;
    if (head.length > 2 && l.toLowerCase().includes(head)) s += 5;
    if (g < 15 && !/(tsp|teaspoon|tbsp|tablespoon|slice|strip)/.test(l) && cat !== "spices-herbs") s -= 3;
    if (g > 600) s -= 4;
    return s;
  };
  return [...p].sort((a, b) => score(b) - score(a));
}

/* ---------------------------------------------------------------- nutrients */
const sig = (v) => (v === 0 ? 0 : +v.toPrecision(4));
function nutrientsOf(x) {
  const raw = {};
  for (const n of x.foodNutrients ?? []) {
    const k = n.nutrient?.number;
    if (k == null || n.amount == null) continue;
    raw[k] = n.amount;
  }
  const v = {};
  for (const k of KEEP) if (raw[k] != null) v[k] = sig(raw[k]);
  for (const [a, b] of Object.entries(ALIASES)) if (raw[a] != null && v[b.replace(/[a-z]$/, "")] == null) v[b.replace(/[a-z]$/, "")] = sig(raw[a]);
  const kcal = raw["208"] ?? raw["958"] ?? raw["957"] ?? (raw["268"] != null ? raw["268"] / 4.184 : null) ??
    (raw["203"] != null && raw["204"] != null && raw["205"] != null ? raw["203"] * 4 + raw["204"] * 9 + raw["205"] * 4 : null);
  if (kcal == null) return null;
  v.kcal = Math.round(kcal * 10) / 10;
  const ala = raw["851"] ?? raw["619"];
  const o3 = [ala, raw["629"], raw["621"], raw["631"]].filter((y) => y != null);
  if (o3.length) v.o3 = sig(o3.reduce((s, y) => s + y, 0));
  if (ala != null) v.ala = sig(ala);
  for (const [k, key] of [["621", "dha"], ["629", "epa"], ["631", "dpa"]]) if (raw[k] != null) v[key] = sig(raw[k]);
  const o6 = [raw["675"] ?? raw["618"], raw["855"] ?? raw["620"]].filter((y) => y != null);
  if (o6.length) v.o6 = sig(o6.reduce((s, y) => s + y, 0));
  if (v["203"] == null || v["204"] == null || v["205"] == null) return null;
  return v;
}

/* ---------------------------------------------------------------- load */
for (const f of FILES) if (!fs.existsSync(path.join(SRC, f.json))) { console.error(`missing ${path.join(SRC, f.json)} — run with --fetch`); process.exit(1); }
const storage = JSON.parse(fs.readFileSync(process.env.STORAGE_FDC ?? path.join(ROOT, "data/storage-fdc.json"), "utf8"));
const storageFoods = JSON.parse(fs.readFileSync(path.join(ROOT, "data/foods.json"), "utf8")).foods;
const storageBySlug = new Map(storageFoods.map((f) => [f.slug, f]));
const storageByFdc = new Map();
for (const [slug, m] of Object.entries(storage)) if (m) (storageByFdc.get(m.fdc) ?? storageByFdc.set(m.fdc, []).get(m.fdc)).push(slug);

const SKIP = /for use (with vegetables|on a sandwich)|\(Alaska Native\)|\(Navajo\)|\(Hopi\)|\(Apache\)|\(Shoshone Bannock\)|\(Northern Plains Indians\)|\(Southwest\)/;
const foods = [];
const bySourceId = new Map();
for (const f of FILES) {
  const list = JSON.parse(fs.readFileSync(path.join(SRC, f.json), "utf8"))[f.key];
  for (const x of list) {
    const fdc = +x.fdcId;
    if (SKIP.test(x.description) && !storageByFdc.has(fdc)) continue;
    const v = nutrientsOf(x);
    if (!v) continue;
    let cat;
    if (f.tag === "N") cat = wweiaCat(+(x.foodAttributes ?? []).find((a) => a.name === "WWEIA Category number")?.value || 9999, x.description);
    else cat = SR_CAT[x.foodCategory?.description] ?? "other-foods";
    if (cat === "beverages" && /\b(beer|wine|liquor|vodka|whiskey|rum|gin|tequila|brandy|cocktail|alcoholic)\b/i.test(x.description) && !/non-?alcoholic|vinegar/i.test(x.description)) cat = "alcohol";
    const desc = clean(x.description);
    const rec = { id: fdc, src: f.tag, desc, cat, p: preferServing(portionsOf(x, f.tag), cat, x.description), v };
    foods.push(rec);
    bySourceId.set(fdc, rec);
  }
}

/* ---------------------------------------------------------------- de-duplicate identical names (keep Foundation > SR > FNDDS, but always keep storage matches) */
const SRC_RANK = { F: 0, S: 1, N: 2 };
const byName = new Map();
for (const r of foods) {
  const k = r.desc.toLowerCase();
  const prev = byName.get(k);
  const better = !prev || storageByFdc.has(r.id) && !storageByFdc.has(prev.id) || (!storageByFdc.has(prev.id) && SRC_RANK[r.src] < SRC_RANK[prev.src]);
  if (better) byName.set(k, r);
}
let kept = [...byName.values()];
// A storage food whose record lost to a duplicate name still needs its record.
for (const fdc of storageByFdc.keys()) if (!kept.some((r) => r.id === fdc) && bySourceId.has(fdc)) kept.push(bySourceId.get(fdc));

/* ---------------------------------------------------------------- names, slugs */
const out = [];
const usedSlugs = new Set();
// Storage pages: one page per storage food (two storage foods may share a record).
for (const [slug, m] of Object.entries(storage)) {
  if (!m) continue;
  const r = bySourceId.get(m.fdc);
  if (!r) { console.warn("storage match not found / no nutrients:", slug, m.fdc); continue; }
  const sf = storageBySlug.get(slug);
  out.push({ ...r, slug, name: sf.name, storage: slug });
  usedSlugs.add(slug);
}
const storageIds = new Set(out.map((r) => r.id));
const storageNames = new Set(out.map((r) => r.name.toLowerCase()));
for (const r of kept.sort((a, b) => SRC_RANK[a.src] - SRC_RANK[b.src] || a.desc.localeCompare(b.desc))) {
  if (storageIds.has(r.id)) continue;
  if (storageNames.has(r.desc.toLowerCase())) continue; // "Bread" already has a page (the storage food's)
  let slug = slugFor(r.desc);
  if (usedSlugs.has(slug)) slug = `${slug}-${r.id}`;
  usedSlugs.add(slug);
  out.push({ ...r, slug, name: cap(r.desc) });
}

/* ---------------------------------------------------------------- similar foods (same category, shared name words) */
const STOP = new Set(["raw", "cooked", "with", "and", "or", "without", "added", "fat", "made", "from", "plain", "regular", "salt", "the", "of", "in", "no", "type", "style", "prepared", "ready", "to", "eat"]);
const words = (s) => new Set(slugify(s).split("-").filter((w) => w.length > 2 && !STOP.has(w)));
const byCat = new Map();
for (const r of out) { r._w = words(r.name + " " + r.desc); (byCat.get(r.cat) ?? byCat.set(r.cat, []).get(r.cat)).push(r); }
for (const r of out) {
  const head = slugify(r.desc.split(",")[0]);
  const scored = [];
  for (const o of byCat.get(r.cat)) {
    if (o === r || o.id === r.id) continue;
    let s = 0;
    for (const w of r._w) if (o._w.has(w)) s++;
    if (slugify(o.desc.split(",")[0]) === head) s += 2;
    if (o.storage) s += 0.5;
    if (s > 0) scored.push([s - o.desc.length / 400, o.slug]);
  }
  scored.sort((a, b) => b[0] - a[0]);
  r.sim = scored.slice(0, 8).map((x) => x[1]);
}
for (const r of out) delete r._w;

/* ---------------------------------------------------------------- write */
const cats = CATEGORIES.map((c) => ({ ...c, count: out.filter((r) => r.cat === c.slug).length })).filter((c) => c.count);
out.sort((a, b) => (a.storage ? 0 : 1) - (b.storage ? 0 : 1) || a.slug.localeCompare(b.slug));
const meta = {
  generated: new Date().toISOString().slice(0, 10),
  sources: FILES.map((f) => ({ tag: f.tag, name: f.name, url: "https://fdc.nal.usda.gov/download-datasets" })),
  count: out.length,
};
fs.writeFileSync(path.join(ROOT, "data/nutrition.json"), JSON.stringify({ meta, categories: cats, foods: out }));
const mb = (fs.statSync(path.join(ROOT, "data/nutrition.json")).size / 1e6).toFixed(1);
console.log(`data/nutrition.json: ${out.length} foods (${out.filter((r) => r.storage).length} with storage data), ${cats.length} categories, ${mb} MB`);
console.log(cats.map((c) => `${c.slug} ${c.count}`).join(", "));
