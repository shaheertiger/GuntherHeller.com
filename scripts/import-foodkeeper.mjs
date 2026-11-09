#!/usr/bin/env node
/**
 * Builds data/foods.json from USDA FSIS FoodKeeper + data/overrides.json.
 *
 *   npm run data            # use the vendored copy in data/source/foodkeeper.json
 *   npm run data -- --fetch # try to download the live FSIS file first
 *
 * FoodKeeper is a US-government work (public domain / CC0). The vendored file is
 * byte-identical to https://www.fsis.usda.gov/shared/data/EN/foodkeeper.json (v128).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "data/source/foodkeeper.json");
const FSIS_URL = "https://www.fsis.usda.gov/shared/data/EN/foodkeeper.json";

if (process.argv.includes("--fetch")) {
  try {
    const res = await fetch(FSIS_URL, { headers: { "user-agent": "guntherheller.com data sync (+https://www.guntherheller.com/methodology/)" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    JSON.parse(text);
    writeFileSync(SRC, text);
    console.log(`fetched ${FSIS_URL}`);
  } catch (e) {
    if (process.argv.includes("--require-fetch")) {
      console.error(`could not fetch FSIS file: ${e.message}`);
      process.exit(1);
    }
    console.warn(`could not fetch FSIS file (${e.message}); using vendored copy`);
  }
}

const raw = readFileSync(SRC);
const sha256 = createHash("sha256").update(raw).digest("hex");
const fk = JSON.parse(raw);
const overrides = JSON.parse(readFileSync(join(ROOT, "data/overrides.json"), "utf8"));

// The FSIS file stores each row as an array of single-key objects.
const sheet = (name) =>
  fk.sheets.find((s) => s.name === name).data.map((row) => Object.assign({}, ...row));
const products = sheet("Product");
const cookingTips = sheet("CookingTips");
const version = sheet("Version").find((v) => v.Current_Version === "Yes") ?? sheet("Version").at(-1);

const clean = (s) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim() : s ?? null);

/* ------------------------------------------------------------------ durations */
const UNIT = { Hours: "hours", Days: "days", Weeks: "weeks", Months: "months", Years: "years", Year: "years" };
const TEXT = {
  "Not Recommended": "Not recommended",
  "Package use-by date": "Use-by date",
  Indefinitely: "Indefinitely",
  "When Ripe": "Until ripe",
};
function dur(p, prefix) {
  const metric = clean(p[`${prefix}_Metric`]);
  if (!metric) return null;
  if (TEXT[metric]) return { text: TEXT[metric] };
  const unit = UNIT[metric];
  if (!unit) throw new Error(`unknown metric ${metric} on product ${p.ID}`);
  let min = p[`${prefix}_Min`];
  let max = p[`${prefix}_Max`];
  if (min == null && max == null) return null;
  min = Number(min ?? max);
  max = Number(max ?? min);
  return { min, max, unit };
}
const pick = (...ds) => ds.find(Boolean) ?? null;

/* ------------------------------------------------------------------ taxonomy */
const ids = (s) => new Set(s.split(/\s+/).map(Number));
const CATEGORIES = [
  { slug: "dairy-eggs", name: "Dairy & Eggs", fk: [7], blurb: "milk, cheese, yogurt, butter, cream and eggs",
    subs: [
      { slug: "eggs", name: "Eggs", ids: ids("17 20 21 22 23 24") },
      { slug: "cheese", name: "Cheese", ids: ids("3 4 5 6 7 9 10 477 490 544 545 546 620 628") },
      { slug: "milk-cream", name: "Milk & cream", ids: ids("2 8 11 12 13 14 15 25 27 421 427 428 429 430 465 543") },
      { slug: "butter-spreads", name: "Butter & spreads", ids: ids("1 26 649") },
      { slug: "yogurt-desserts", name: "Yogurt, sour cream & toppings", ids: ids("16 28 29 30 31 32 33") },
    ] },
  { slug: "meat", name: "Meat", fk: [10, 11, 12, 13], blurb: "beef, pork, lamb, ham, bacon and sausage",
    subs: [
      { slug: "fresh", name: "Fresh meat", fkCat: 10 },
      { slug: "bacon-ham-sausage", name: "Bacon, ham & sausage", fkCat: 12 },
      { slug: "jerky-canned", name: "Jerky & canned meat", fkCat: 11 },
      { slug: "stuffed-kabobs", name: "Stuffed & kabobs", fkCat: 13 },
    ] },
  { slug: "poultry", name: "Poultry", fk: [14, 15, 16, 17], blurb: "raw and cooked chicken, turkey and duck",
    subs: [
      { slug: "raw", name: "Raw poultry", fkCat: 15 },
      { slug: "cooked", name: "Cooked poultry", fkCat: 14 },
      { slug: "canned", name: "Canned poultry", fkCat: 16 },
      { slug: "stuffed-kabobs", name: "Stuffed & kabobs", fkCat: 17 },
    ] },
  { slug: "seafood", name: "Seafood", fk: [20, 21, 22], blurb: "fish, shrimp, crab, lobster and smoked salmon",
    subs: [
      { slug: "fish", name: "Fish", fkCat: 20 },
      { slug: "shellfish", name: "Shellfish", fkCat: 21 },
      { slug: "smoked", name: "Smoked fish", fkCat: 22 },
    ] },
  { slug: "leftovers-deli", name: "Leftovers & Deli", fk: [25], blurb: "cooked leftovers, deli meat, salads and dips",
    subs: [
      { slug: "deli-meat", name: "Deli meat", ids: ids("184 188 192 514 515 516 517 518 519") },
      { slug: "salads", name: "Prepared salads", ids: ids("190 191 417 418 419 420 603") },
      { slug: "leftovers", name: "Cooked leftovers", ids: ids("173 174 175 177 178 185 186 193 194 629 667 140") },
    ] },
  { slug: "fruits", name: "Fruits", fk: [18], blurb: "fresh fruit on the counter, in the fridge and frozen" },
  { slug: "vegetables", name: "Vegetables", fk: [19], blurb: "fresh vegetables, salad greens and herbs",
    subs: [
      { slug: "herbs", name: "Fresh herbs", ids: ids("288 505 506 507 508 509 510 511 512 513 611") },
      { slug: "leafy-greens", name: "Leafy greens", ids: ids("275 287 290 291 415 423 550 674 678") },
    ] },
  { slug: "grains-beans-pasta", name: "Grains, Beans & Pasta", fk: [9], blurb: "rice, pasta, quinoa, beans, lentils and whole grains" },
  { slug: "baked-goods", name: "Bread & Baking", fk: [2, 3, 4], blurb: "bread, cakes, pies, flour, sugar and spices",
    subs: [
      { slug: "bakery", name: "Bread & bakery", fkCat: 2 },
      { slug: "baking", name: "Baking & seasoning", fkCat: 3 },
      { slug: "dough", name: "Refrigerated dough", fkCat: 4 },
    ] },
  { slug: "condiments-sauces", name: "Condiments & Sauces", fk: [6], blurb: "ketchup, mayo, salsa, dressings and broth" },
  { slug: "pantry-staples", name: "Pantry Staples", fk: [23], blurb: "nuts, oils, canned goods, cereal and snacks",
    subs: [
      { slug: "nuts-seeds", name: "Nuts & seeds", re: /nut|seed|almond|cashew|pecan|pistach|walnut|peanut(?! butter)|macadamia|flax|chia|sesame seeds/i },
      { slug: "oils", name: "Oils", re: /\boil\b/i },
      { slug: "spices", name: "Spices & salt", re: /pepper|cinnamon|cumin|garlic powder|onion powder|nutmeg|cajun|^salt|dry mustard/i },
      { slug: "canned", name: "Canned goods", re: /canned|tuna|seafood/i },
    ] },
  { slug: "beverages", name: "Drinks", fk: [5], blurb: "coffee, tea, juice, wine and spirits",
    subs: [
      { slug: "coffee-tea", name: "Coffee & tea", re: /coffee|tea\b/i },
      { slug: "juice", name: "Juice", re: /juice|nectar|cider|punch/i },
      { slug: "alcohol", name: "Wine & spirits", re: /wine|liquor|liqueur/i },
    ] },
  { slug: "frozen-foods", name: "Frozen Foods", fk: [8], blurb: "food bought frozen: pizza, vegetables, ice cream" },
  { slug: "baby-food", name: "Baby Food", fk: [1], blurb: "formula, breast milk, jars and pouches" },
  { slug: "vegetarian-proteins", name: "Vegetarian Proteins", fk: [24], blurb: "tofu, tempeh, miso and soy protein" },
];
const catByFk = new Map(CATEGORIES.flatMap((c) => c.fk.map((id) => [id, c])));

/* ------------------------------------------------------------------ kinds (drive copy templates) */
function kindOf(p, cat, name) {
  const id = Number(p.ID);
  const n = name.toLowerCase();
  const c = Number(p.Category_ID);
  if (cat.slug === "baby-food") return "baby";
  if (c === 10 || c === 13 || c === 15 || c === 17) return "raw-meat";
  if (c === 12) return /cooked|bacon|hot dog|pepperoni|kielbasa|smoked|prosciutto|pastrami|corned|pork roll|country ham|ham/i.test(n) && !/fresh|uncooked|raw/i.test(n) ? "cured-meat" : "raw-meat";
  if (c === 11 || c === 16) return "shelf-meat";
  if (c === 14) return "cooked";
  if (c === 20 || c === 21) return /cooked/i.test(n) ? "cooked" : "raw-seafood";
  if (c === 22) return "cured-meat";
  if (c === 25) {
    if ([184, 188, 192, 514, 515, 516, 517, 518, 519].includes(id)) return "cured-meat";
    if ([179].includes(id)) return "fruit";
    if ([180, 181, 183, 572, 645, 187].includes(id)) return "dip";
    return "cooked";
  }
  if (c === 7) {
    if ([17, 20, 21, 22, 23, 24].includes(id)) return "eggs";
    if ([3, 4, 5, 6, 544, 545, 628].includes(id)) return "hard-cheese";
    if ([7, 9, 10, 477, 490, 546, 620].includes(id)) return "soft-cheese";
    if ([1, 26, 649].includes(id)) return "butter";
    if ([16, 28, 29, 30, 31, 32, 33].includes(id)) return "soft-dairy";
    return "milk";
  }
  if (c === 18) return "fruit";
  if (c === 19) {
    if ([288, 505, 506, 507, 509, 510, 511, 512, 513, 611].includes(id)) return "herb";
    if ([275, 287, 290, 291, 415, 423, 550, 674, 678, 549, 679].includes(id)) return "leafy";
    if (id === 493 || id === 570) return "condiment";
    return "vegetable";
  }
  if (c === 2) return "bakery";
  if (c === 3) return /spice|powder|pepper|herb|season|masala|extract|flavor/i.test(n) && !/baking|cocoa/i.test(n) ? "spice" : /oil|shortening|spray/i.test(n) ? "oil" : "dry-goods";
  if (c === 4) return "dough";
  if (c === 9) return /cooked|fresh pasta|boiled|refried|bread|tortilla|sprouts/i.test(n) ? (/bread|tortilla/i.test(n) ? "bakery" : "cooked") : "dry-goods";
  if (c === 6) return /homemade|fresh|broth|stock|reused/i.test(n) ? "sauce-perishable" : "condiment";
  if (c === 5) {
    if (/wine|liquor|liqueur/i.test(n)) return "alcohol";
    if (/coffee|tea\b/i.test(n)) return "coffee-tea";
    if (/fresh|squeezed|cider|homemade/i.test(n)) return "juice-fresh";
    return "beverage";
  }
  if (c === 8) return "frozen";
  if (c === 24) return "soy";
  if (c === 23) {
    if (/\boil\b/i.test(n)) return "oil";
    if (/nut|seed|almond|cashew|pecan|pistach|walnut|peanut|macadamia|flax|chia|sesame|butter|spread|tahini/i.test(n)) return "nuts";
    if (/pepper|cinnamon|cumin|powder|nutmeg|cajun|salt|mustard/i.test(n)) return "spice";
    if (/canned|tuna|seafood|anchov|evaporated|shelf-stable milk|cocktail|applesauce|coconut (milk|cream)|tomato paste/i.test(n)) return "canned";
    return "dry-goods";
  }
  return "dry-goods";
}
const PERISHABLE_IDS = new Set([179, 497, 495, 496]);
const PERISHABLE_KINDS = new Set(["raw-meat", "raw-seafood", "cooked", "cured-meat", "milk", "soft-cheese", "eggs", "soft-dairy", "dip", "baby", "sauce-perishable", "juice-fresh", "dough", "soy"]);

/* ------------------------------------------------------------------ naming */
const STOP = new Set(["and", "or", "the", "of", "with", "a", "an", "in", "for", "such", "as", "etc", "all", "to", "on"]);
export function slugify(s) {
  return s
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/&/g, " and ").replace(/['’"“”]/g, "")
    .split(/[^a-z0-9]+/).filter((w) => w && !STOP.has(w)).join("-");
}
const SINGULAR = new Set(["molasses", "hummus", "asparagus", "couscous", "citrus", "swiss", "grits?", "half and half", "jerky", "bratwurst", "mac and cheese"]);
function isPlural(name) {
  const n = name.toLowerCase();
  if (SINGULAR.has(n)) return false;
  if (/^half and half/.test(n)) return false;
  const head = n.split(/ with | in the | in | \(|,/)[0].trim();
  if (/ and /.test(head)) return true;
  const last = head.split(" ").at(-1);
  if (/(ss|us|is)$/.test(last) || SINGULAR.has(last)) return false;
  return /s$/.test(last);
}
function autoName(p) {
  const name = clean(p.Name).replace(/^"Genuine" /, "");
  const sub = clean(p.Name_subtitle);
  return sub ? `${name} (${sub.replace(/[()]/g, "")})` : name;
}

/* ------------------------------------------------------------------ build */
const tipsById = new Map();
for (const t of cookingTips) {
  const id = Number(t.Product_ID);
  const list = tipsById.get(id) ?? [];
  list.push({ tip: clean(t.Tips), safeTempF: t.Safe_Minimum_Temperature ? Number(t.Safe_Minimum_Temperature) : null });
  tipsById.set(id, list);
}

const pairAlt = new Map(overrides.pairs.map((p) => [p.id, p]));
const altIds = new Set(overrides.pairs.map((p) => p.alt));
const byId = new Map(products.map((p) => [Number(p.ID), p]));

function statesFor(p) {
  const unopened = {
    pantry: pick(dur(p, "Pantry"), dur(p, "DOP_Pantry")),
    fridge: pick(dur(p, "Refrigerate"), dur(p, "DOP_Refrigerate")),
    freezer: pick(dur(p, "Freeze"), dur(p, "DOP_Freeze")),
  };
  const opened = {
    pantry: dur(p, "Pantry_After_Opening"),
    fridge: dur(p, "Refrigerate_After_Opening"),
    freezer: unopened.freezer,
  };
  return { unopened, opened, hasOpened: Boolean(opened.pantry || opened.fridge) };
}

function subcategoryFor(cat, p, name) {
  for (const s of cat.subs ?? []) {
    if (s.fkCat && Number(p.Category_ID) === s.fkCat) return s.slug;
    if (s.ids && s.ids.has(Number(p.ID))) return s.slug;
    if (s.re && s.re.test(name)) return s.slug;
  }
  return null;
}

const foods = [];
const seen = new Map();
function addFood(f) {
  let slug = f.slug;
  if (seen.has(slug)) {
    let i = 2;
    while (seen.has(`${slug}-${i}`)) i++;
    console.warn(`slug collision: ${slug} (${f.name}) vs ${seen.get(slug)}; using ${slug}-${i}`);
    slug = `${slug}-${i}`;
  }
  seen.set(slug, f.name);
  foods.push({ ...f, slug });
}

for (const p of products) {
  const id = Number(p.ID);
  if (altIds.has(id) && !pairAlt.has(id)) {
    // still gets its own page (e.g. dry rice), the pair only borrows its numbers
  }
  const cat = catByFk.get(Number(p.Category_ID));
  const name = clean(overrides.names[String(id)]) || autoName(p);
  const slug = overrides.slugs[String(id)] || slugify(name);
  const { unopened, opened, hasOpened } = statesFor(p);
  let states;
  const pair = pairAlt.get(id);
  if (pair) {
    const alt = statesFor(byId.get(pair.alt));
    const [a, b] = pair.labels;
    states = [
      { key: slugify(a) || "a", label: a, ...unopened },
      { key: slugify(b.split("/")[0]) || "b", label: b, ...alt.unopened, fromId: pair.alt },
    ];
  } else if (hasOpened) {
    states = [
      { key: "opened", label: "Opened", ...opened },
      { key: "unopened", label: "Unopened", ...unopened },
    ];
  } else {
    states = [{ key: "default", label: null, ...unopened }];
  }
  const kind = kindOf(p, cat, name);
  // A pantry figure measured in hours (prepared baby formula: 1 hour) is a time limit, not shelf
  // stability, so it must not switch off the perishable flag.
  const anyPantry = Boolean(states[0].pantry && !states[0].pantry.text && states[0].pantry.unit !== "hours");
  const tips = {
    pantry: clean(p.Pantry_tips) || clean(p.DOP_Pantry_tips),
    fridge: clean(p.Refrigerate_tips) || clean(p.DOP_Refrigerate_tips),
    freezer: clean(p.Freeze_Tips) || clean(p.DOP_Freeze_Tips),
  };
  addFood({
    id,
    slug,
    name,
    plural: isPlural(name),
    fkName: autoName(p),
    keywords: (clean(p.Keywords) || "").split(",").map((k) => k.trim().toLowerCase()).filter(Boolean),
    aliases: overrides.aliases[slug] ?? [],
    category: cat.slug,
    subcategory: subcategoryFor(cat, p, name),
    kind,
    perishable: (PERISHABLE_KINDS.has(kind) || PERISHABLE_IDS.has(id)) && !anyPantry,
    states,
    thawedFridge: dur(p, "Refrigerate_After_Thawing"),
    tips: Object.fromEntries(Object.entries(tips).filter(([, v]) => v)),
    cooking: tipsById.get(id) ?? [],
    source: { name: `USDA FoodKeeper v${Number(version.Data_Version_Number)}`, url: "https://www.foodsafety.gov/keep-food-safe/foodkeeper-app", fkId: id },
  });
}

for (const [id, patch] of Object.entries(overrides.patches ?? {})) {
  const f = foods.find((x) => x.id === Number(id));
  if (!f) throw new Error(`patch for unknown FoodKeeper id ${id}`);
  if (patch.states) f.states = patch.states;
  if (patch.notes) f.notes = patch.notes;
  if (patch.extraSource) f.extraSource = patch.extraSource;
}

// Splits: one page per food a FoodKeeper record names explicitly ("Citrus fruit: lemon, lime, orange…").
for (const [id, names] of Object.entries(overrides.splits ?? {})) {
  if (id.startsWith("_")) continue;
  const base = foods.find((x) => x.id === Number(id));
  if (!base) throw new Error(`split for unknown FoodKeeper id ${id}`);
  for (const name of names) {
    const slug = slugify(name);
    if (seen.has(slug)) { console.warn(`split ${name}: slug ${slug} already exists, skipped`); continue; }
    addFood({
      ...base,
      id: `split:${slug}`,
      slug,
      name,
      plural: isPlural(name),
      keywords: [name.toLowerCase()],
      aliases: overrides.aliases[slug] ?? [],
      derivedFrom: base.slug,
      derivedNote: `USDA FoodKeeper lists ${name.toLowerCase()} under “${base.fkName}”, so this page uses that entry's storage times.`,
    });
  }
}

for (const d of overrides.derived) {
  const base = foods.find((f) => f.id === d.from);
  addFood({
    ...base,
    id: `derived:${d.slug}`,
    slug: d.slug,
    name: d.name,
    plural: isPlural(d.name),
    keywords: [d.name.toLowerCase()],
    aliases: overrides.aliases[d.slug] ?? [],
    category: d.category ?? base.category,
    subcategory: d.subcategory ?? base.subcategory,
    derivedFrom: base.slug,
    derivedNote: d.note,
    ...(d.notInRelated ? { notInRelated: true } : {}),
  });
}

for (const c of overrides.custom) {
  addFood({
    id: `custom:${c.slug}`,
    slug: c.slug,
    name: c.name,
    plural: isPlural(c.name),
    fkName: null,
    keywords: [c.name.toLowerCase()],
    aliases: overrides.aliases[c.slug] ?? [],
    category: c.category,
    subcategory: c.subcategory ?? null,
    kind: c.kind,
    perishable: Boolean(c.perishable),
    states: c.states,
    thawedFridge: null,
    tips: {},
    cooking: [],
    notes: c.notes,
    source: c.source,
  });
}

// Priority order: listed slugs first, then everything else by category, then name.
const prio = new Map(overrides.priority.map((s, i) => [s, i]));
for (const s of overrides.priority) if (!seen.has(s)) console.warn(`priority slug not found: ${s}`);
const catOrder = new Map(CATEGORIES.map((c, i) => [c.slug, i]));
foods.sort((a, b) =>
  (prio.get(a.slug) ?? 1e6) - (prio.get(b.slug) ?? 1e6) ||
  catOrder.get(a.category) - catOrder.get(b.category) ||
  a.name.localeCompare(b.name));
foods.forEach((f, i) => (f.rank = i + 1));

const categories = CATEGORIES.map((c) => ({
  slug: c.slug,
  name: c.name,
  blurb: c.blurb,
  subcategories: (c.subs ?? [])
    .map((s) => ({ slug: s.slug, name: s.name, count: foods.filter((f) => f.category === c.slug && f.subcategory === s.slug).length }))
    .filter((s) => s.count > 0),
  count: foods.filter((f) => f.category === c.slug).length,
}));

const out = {
  meta: {
    source: "USDA Food Safety and Inspection Service — FoodKeeper",
    sourceUrl: FSIS_URL,
    license: "Public domain (US government work, CC0 1.0)",
    version: Number(version.Data_Version_Number),
    modified: version.Modified_Date,
    sha256,
    builtAt: new Date().toISOString().slice(0, 10),
  },
  categories,
  foods,
};
writeFileSync(join(ROOT, "data/foods.json"), JSON.stringify(out, null, 1) + "\n");
console.log(`wrote data/foods.json: ${foods.length} foods, ${categories.length} categories (FoodKeeper v${out.meta.version}, sha256 ${sha256.slice(0, 12)}…)`);
