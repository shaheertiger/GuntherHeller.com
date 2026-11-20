/**
 * Keyword parsing and food matching shared by scripts/build-demand.mjs and scripts/import-branded.mjs.
 * Input: Semrush "Organic Positions" CSV exports in research/competitors/ (git-ignored).
 */
import fs from "node:fs";
import path from "node:path";

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

/* ---------------------------------------------------------------- CSV */
export function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows;
  return body.filter((r) => r.length === head.length).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

/** keyword → monthly US search volume (the highest seen across the exports). */
export function loadKeywords(files) {
  if (!files.length) {
    const dir = path.join(ROOT, "research/competitors");
    files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".csv")).map((f) => path.join(dir, f)) : [];
  }
  if (!files.length) throw new Error("no Semrush CSV exports found in research/competitors/");
  const vol = new Map();
  for (const f of files) {
    for (const r of parseCsv(fs.readFileSync(f, "utf8"))) {
      const k = (r.Keyword ?? "").trim().toLowerCase();
      const v = +r["Search Volume"] || 0;
      if (k && v > (vol.get(k) ?? 0)) vol.set(k, v);
    }
  }
  return { vol, files };
}

/* ---------------------------------------------------------------- words */
export const INTENT = /\b(calorie|calories|cal|kcal|kilocalories|nutrition|nutritional|nutrients?|macros?|protein|carbs?|carbohydrates?|fat|sugar|fiber|fibre|sodium|cholesterol|potassium|iron|vitamin)\b/;
/** Words that say what is being asked, not which food. */
export const ASK = new Set(("how many much calories calorie cal kcal kilocalories nutrition nutritional nutrients nutrient facts fact info information label value values data " +
  "macros macro protein carbs carb carbohydrates carbohydrate fat fats sugar sugars fiber fibre sodium cholesterol potassium iron vitamin vitamins " +
  "content count amount amounts chart breakdown per in of a an the is are does do there for one 1 with total grams g serving size sizes servings contain contains have has " +
  "whats what calculator from at").split(" "));
export const UNITS = new Set("cup cups oz ounce ounces tbsp tablespoon tablespoons tsp teaspoon teaspoons gram lb lbs pound pounds ml".split(" "));

export const norm = (s) =>
  s.toLowerCase()
    .replace(/[’']/g, "")
    .replace(/&/g, " and ")
    .replace(/(\d+)\s*\/\s*(\d+)/g, "$1/$2")
    .replace(/[^a-z0-9/%.]+/g, " ")
    .replace(/(?<![0-9])\.|\.(?![0-9])/g, " ")
    .trim();
export const sing = (w) => (w.length > 3 && /[^s]s$/.test(w) && !/(ous|ss|us|is)$/.test(w) ? (/ies$/.test(w) ? w.slice(0, -3) + "y" : /oes$/.test(w) ? w.slice(0, -2) : w.slice(0, -1)) : w);
const SYN = { mcdonald: "mcdonalds", fry: "fries", fri: "fries", frie: "fries", chickfila: "chick-fil-a", yoghurt: "yogurt", donut: "doughnut", hotdog: "frankfurter" };
const canon = (w) => SYN[w] ?? SYN[sing(w)] ?? sing(w);
export const tok = (s) => norm(s).split(" ").filter(Boolean).map(canon);

/** The food a keyword is about: "how many calories in a medium apple" → t ["medium", "apple"], text "medium apple". */
export function core(k) {
  const words = norm(k).split(" ").filter((w) => w && !ASK.has(w) && !UNITS.has(w) && !/^\d+(\.\d+)?$/.test(w));
  const t = words.map(canon).filter((w) => !ASK.has(w) && !UNITS.has(w));
  return { t: [...new Set(t)], text: words.join(" ") };
}

/* ---------------------------------------------------------------- matching */
/** Tokens USDA adds to almost every record; their presence should not count against a match. */
export const NOISE = new Set(("raw cooked ns nfs as to form type made from regular all commercial commercially prepared prepared plain unenriched enriched " +
  "without with salt added no fat broilers or fryers meat only and skin separable lean trimmed grade grades choice select fresh frozen canned " +
  "drained solid liquid water other").split(" "));
const SRC_RANK = { F: 0, S: 1, N: 2, B: 3 };

/**
 * A matcher over foods ({ desc, name, brand?, storage?, src }). best(tokens) returns the food whose words cover
 * every query word with the fewest extra words, or null. Readable names ("Eggs") are scored on their own so the
 * plain food beats USDA's long records.
 */
export function makeMatcher(foods) {
  const index = new Map();
  const ftoks = foods.map((f, i) => {
    const t = new Set([...tok(f.desc), ...tok(f.name), ...(f.brand ? tok(f.brand) : [])]);
    for (const w of t) (index.get(w) ?? index.set(w, new Set()).get(w)).add(i);
    return t;
  });
  const ntoks = foods.map((f) => new Set([...tok(f.name), ...(f.brand ? tok(f.brand) : [])]));
  function best(q, maxExtra = Math.max(3, q.length + 1)) {
    if (!q.length) return null;
    const sets = q.map((w) => index.get(w));
    if (sets.some((s) => !s)) return null;
    sets.sort((a, b) => a.size - b.size);
    const cand = [...sets[0]].filter((i) => sets.every((s) => s.has(i)));
    if (!cand.length) return null;
    const qs = new Set(q);
    const extras = (set) => { let n = 0; for (const w of set) if (!qs.has(w) && !NOISE.has(w)) n++; return n; };
    const covers = (set) => q.every((w) => set.has(w));
    const score = (i) => Math.min(extras(ftoks[i]), covers(ntoks[i]) ? extras(ntoks[i]) : Infinity);
    const ranked = cand.map((i) => ({ i, s: score(i) })).sort((a, b) =>
      a.s - b.s || (foods[b.i].storage ? 1 : 0) - (foods[a.i].storage ? 1 : 0) || SRC_RANK[foods[a.i].src] - SRC_RANK[foods[b.i].src] || foods[a.i].desc.length - foods[b.i].desc.length);
    return ranked[0].s <= maxExtra ? { i: ranked[0].i, food: foods[ranked[0].i], extra: ranked[0].s } : null;
  }
  /** best(), and if nothing matches a 3+ word query, the best match with one qualifier dropped ("medium"). */
  function bestLoose(q) {
    let m = best(q);
    if (!m && q.length >= 3) for (let d = 0; d < q.length && !m; d++) m = best(q.filter((_, j) => j !== d));
    return m;
  }
  return { best, bestLoose };
}
