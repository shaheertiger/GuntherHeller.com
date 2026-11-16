/**
 * Nutrition data (data/nutrition.json, built by scripts/import-fdc.mjs from USDA FoodData Central).
 * Values are per 100 g; keys are FDC nutrient numbers plus a few derived keys (kcal, o3, o6, ala, dha, epa, dpa).
 */
import raw from "../../data/nutrition.json";

export type Portion = [label: string, grams: number];
export type NFood = {
  id: number;
  src: "F" | "S" | "N";
  desc: string;
  cat: string;
  p: Portion[];
  v: Record<string, number>;
  slug: string;
  name: string;
  storage?: string;
  sim: string[];
};
export type NCategory = { slug: string; name: string; count: number };

export const NMETA = raw.meta as { generated: string; count: number; sources: { tag: string; name: string; url: string }[] };
export const NFOODS = raw.foods as unknown as NFood[];
export const NCATS = raw.categories as NCategory[];

const bySlug = new Map(NFOODS.map((f) => [f.slug, f]));
export const nfood = (slug: string) => bySlug.get(slug);
export const ncat = (slug: string) => NCATS.find((c) => c.slug === slug)!;
const byStorage = new Map(NFOODS.filter((f) => f.storage).map((f) => [f.storage!, f]));
/** The nutrition page that carries a FoodKeeper storage food. */
export const pageForStorage = (storageSlug: string) => byStorage.get(storageSlug);

export const SOURCE_NAME: Record<NFood["src"], string> = { F: "USDA Foundation Foods", S: "USDA SR Legacy", N: "USDA FNDDS 2021–2023" };

/* ---------------------------------------------------------------- URLs (EatThisMuch-style) */
export const nurl = {
  food: (f: { slug: string }) => `/calories/${f.slug}/`,
  browse: () => `/food/`,
  cat: (c: string) => `/food/${c}/`,
  rank: (r: { slug: string }) => `/food/${r.slug}/`,
};

/* ---------------------------------------------------------------- nutrient definitions */
export type NDef = { k: string; name: string; unit: "g" | "mg" | "µg" | "IU" | "kcal"; dv?: number; short?: string };
/** FDA Daily Values for adults and children 4+ (21 CFR 101.9, 2,000-calorie diet). */
export const MAIN: NDef[] = [
  { k: "204", name: "Fat", unit: "g", dv: 78 },
  { k: "606", name: "Saturated fat", unit: "g", dv: 20 },
  { k: "605", name: "Trans fat", unit: "g" },
  { k: "601", name: "Cholesterol", unit: "mg", dv: 300 },
  { k: "307", name: "Sodium", unit: "mg", dv: 2300 },
  { k: "205", name: "Carbohydrates", unit: "g", dv: 275, short: "Carbs" },
  { k: "net", name: "Net carbs", unit: "g" },
  { k: "291", name: "Fiber", unit: "g", dv: 28 },
  { k: "269", name: "Sugar", unit: "g" },
  { k: "203", name: "Protein", unit: "g", dv: 50 },
  { k: "328", name: "Vitamin D", unit: "µg", dv: 20 },
  { k: "301", name: "Calcium", unit: "mg", dv: 1300 },
  { k: "303", name: "Iron", unit: "mg", dv: 18 },
  { k: "306", name: "Potassium", unit: "mg", dv: 4700 },
];
export const VITAMINS: NDef[] = [
  { k: "320", name: "Vitamin A", unit: "µg", dv: 900 },
  { k: "318", name: "Vitamin A (IU)", unit: "IU" },
  { k: "404", name: "Thiamin (B1)", unit: "mg", dv: 1.2 },
  { k: "405", name: "Riboflavin (B2)", unit: "mg", dv: 1.3 },
  { k: "406", name: "Niacin (B3)", unit: "mg", dv: 16 },
  { k: "410", name: "Pantothenic acid (B5)", unit: "mg", dv: 5 },
  { k: "415", name: "Vitamin B6", unit: "mg", dv: 1.7 },
  { k: "417", name: "Folate (B9)", unit: "µg", dv: 400 },
  { k: "418", name: "Vitamin B12", unit: "µg", dv: 2.4 },
  { k: "401", name: "Vitamin C", unit: "mg", dv: 90 },
  { k: "328", name: "Vitamin D", unit: "µg", dv: 20 },
  { k: "324", name: "Vitamin D (IU)", unit: "IU" },
  { k: "323", name: "Vitamin E", unit: "mg", dv: 15 },
  { k: "430", name: "Vitamin K", unit: "µg", dv: 120 },
  { k: "421", name: "Choline", unit: "mg", dv: 550 },
  { k: "319", name: "Retinol", unit: "µg" },
  { k: "321", name: "Beta carotene", unit: "µg" },
  { k: "322", name: "Alpha carotene", unit: "µg" },
  { k: "334", name: "Beta cryptoxanthin", unit: "µg" },
  { k: "337", name: "Lycopene", unit: "µg" },
  { k: "338", name: "Lutein + zeaxanthin", unit: "µg" },
];
export const MINERALS: NDef[] = [
  { k: "301", name: "Calcium", unit: "mg", dv: 1300 },
  { k: "303", name: "Iron", unit: "mg", dv: 18 },
  { k: "304", name: "Magnesium", unit: "mg", dv: 420 },
  { k: "305", name: "Phosphorus", unit: "mg", dv: 1250 },
  { k: "306", name: "Potassium", unit: "mg", dv: 4700 },
  { k: "307", name: "Sodium", unit: "mg", dv: 2300 },
  { k: "309", name: "Zinc", unit: "mg", dv: 11 },
  { k: "312", name: "Copper", unit: "mg", dv: 0.9 },
  { k: "315", name: "Manganese", unit: "mg", dv: 2.3 },
  { k: "317", name: "Selenium", unit: "µg", dv: 55 },
  { k: "313", name: "Fluoride", unit: "µg" },
];
export const SUGARS: NDef[] = [
  { k: "269", name: "Total sugar", unit: "g" },
  { k: "210", name: "Sucrose", unit: "g" },
  { k: "211", name: "Glucose", unit: "g" },
  { k: "212", name: "Fructose", unit: "g" },
  { k: "213", name: "Lactose", unit: "g" },
  { k: "214", name: "Maltose", unit: "g" },
  { k: "287", name: "Galactose", unit: "g" },
  { k: "209", name: "Starch", unit: "g" },
];
export const FATS: NDef[] = [
  { k: "204", name: "Total fat", unit: "g", dv: 78 },
  { k: "606", name: "Saturated fat", unit: "g", dv: 20 },
  { k: "645", name: "Monounsaturated fat", unit: "g" },
  { k: "646", name: "Polyunsaturated fat", unit: "g" },
  { k: "605", name: "Trans fat", unit: "g" },
  { k: "o3", name: "Total omega-3", unit: "g" },
  { k: "ala", name: "Alpha-linolenic acid (ALA)", unit: "g" },
  { k: "epa", name: "Eicosapentaenoic acid (EPA)", unit: "g" },
  { k: "dpa", name: "Docosapentaenoic acid (DPA)", unit: "g" },
  { k: "dha", name: "Docosahexaenoic acid (DHA)", unit: "g" },
  { k: "o6", name: "Total omega-6", unit: "g" },
];
export const AMINOS: NDef[] = [
  ["513", "Alanine"], ["511", "Arginine"], ["514", "Aspartic acid"], ["507", "Cystine"], ["515", "Glutamic acid"], ["516", "Glycine"],
  ["512", "Histidine"], ["521", "Hydroxyproline"], ["503", "Isoleucine"], ["504", "Leucine"], ["505", "Lysine"], ["506", "Methionine"],
  ["508", "Phenylalanine"], ["517", "Proline"], ["518", "Serine"], ["502", "Threonine"], ["501", "Tryptophan"], ["509", "Tyrosine"], ["510", "Valine"],
].map(([k, name]) => ({ k, name, unit: "g" as const }));
export const OTHER: NDef[] = [
  { k: "255", name: "Water", unit: "g" },
  { k: "221", name: "Alcohol", unit: "g" },
  { k: "262", name: "Caffeine", unit: "mg" },
  { k: "263", name: "Theobromine", unit: "mg" },
];

/* ---------------------------------------------------------------- values */
/** Per-100 g value of a nutrient (derived keys included). */
export function val(f: NFood, k: string): number | null {
  if (k === "kcal") return f.v.kcal;
  if (k === "net") {
    const c = f.v["205"];
    return c == null ? null : Math.max(0, c - (f.v["291"] ?? 0));
  }
  return f.v[k] ?? null;
}
export const per = (v100: number, grams: number) => (v100 * grams) / 100;
/** Display rounding similar to label rules: <1 → 1 decimal (2 for tiny µg/mg), else integer. */
export function fmtN(x: number | null, unit: string): string {
  if (x == null) return "–";
  if (unit === "kcal") return String(Math.round(x));
  if (x === 0) return `0${unit === "IU" ? "IU" : unit}`;
  const a = Math.abs(x);
  const n = a >= 10 ? Math.round(x).toString() : a >= 1 ? (+x.toFixed(1)).toString() : a >= 0.1 ? (+x.toFixed(1)).toString() : (+x.toFixed(2)).toString();
  return `${n === "0" ? "<0.1" : n}${unit}`;
}
export const pctDV = (x: number | null, d?: NDef) => (x == null || !d?.dv ? null : Math.round((x / d.dv) * 100));

/* ---------------------------------------------------------------- serving */
export function defaultServing(f: NFood): Portion {
  return f.p[0] ?? ["100 g", 100];
}
/** "1 cup (158 g)" */
export const servingLabel = (p: Portion) => (/^\d+(\.\d+)?\s*g$/.test(p[0]) ? p[0] : `${p[0]} (${+p[1].toFixed(1)} g)`);

/** Share of calories from carbs / fat / protein (Atwater 4-9-4), rounded to sum ≈ 100. */
export function macroSplit(f: NFood) {
  const c = (f.v["205"] ?? 0) * 4, fa = (f.v["204"] ?? 0) * 9, p = (f.v["203"] ?? 0) * 4;
  const t = c + fa + p;
  if (!t) return { carbs: 0, fat: 0, protein: 0 };
  const carbs = Math.round((c / t) * 100), fat = Math.round((fa / t) * 100);
  return { carbs, fat, protein: Math.max(0, 100 - carbs - fat) };
}

/** Nutrients that reach ≥ 10% DV in the default serving, largest first. */
export function goodSources(f: NFood, grams: number) {
  const seen = new Set<string>();
  return [...MAIN.filter((d) => ["203", "291"].includes(d.k)), ...VITAMINS, ...MINERALS.filter((d) => d.k !== "307")]
    .filter((d) => d.dv && !seen.has(d.k) && seen.add(d.k))
    .map((d) => ({ d, pct: pctDV(per(val(f, d.k) ?? 0, grams), d)! }))
    .filter((x) => x.pct >= 10)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3);
}

export function summary(f: NFood) {
  const s = defaultServing(f);
  const kcal = Math.round(per(f.v.kcal, s[1]));
  const m = macroSplit(f);
  const good = goodSources(f, s[1]);
  const what = /^\d/.test(s[0]) ? `${s[0]} of ${lcName(f)}` : `${s[0]} ${lcName(f)}`;
  let text = `${cap(what)} contains ${kcal} calories. The macronutrient breakdown is ${m.carbs}% carbs, ${m.fat}% fat, and ${m.protein}% protein.`;
  if (good.length) text += ` This is a good source of ${good.map((g) => `${g.d.name.replace(/ \(.*\)$/, "").toLowerCase().replace(/^vitamin (\w+)/, "vitamin $1")} (${g.pct}% of your Daily Value)`).join(", ").replace(/, ([^,]*)$/, good.length > 2 ? ", and $1" : " and $1")}.`;
  else text += ` It has ${Math.round(f.v.kcal)} calories per 100 g.`;
  return { s, kcal, m, good, text };
}

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const KEEP_CASE = /^(?:[A-Z]{2}|Mc|[A-Z][a-z]+'s\b|[A-Z][a-z]+ (?:[A-Z]|&))/;
export const lcName = (f: NFood) => (KEEP_CASE.test(f.name) ? f.name : f.name.charAt(0).toLowerCase() + f.name.slice(1));

/** Head of the USDA description ("Chicken" in "Chicken, breast, raw"), title-cased for breadcrumbs/H1s. */
export function shortName(f: NFood) {
  if (f.storage) return f.name;
  const parts = f.name.split(", ");
  return parts.length > 1 && parts[0].length < 4 ? parts.slice(0, 2).join(", ") : parts[0];
}
export function subName(f: NFood) {
  if (f.storage) return f.desc;
  const head = shortName(f);
  return f.name.slice(head.length).replace(/^,\s*/, "");
}
/** Title-case for <title>: "Rice, White, Cooked". */
export const titleCase = (s: string) =>
  s.replace(/(^|[\s(\-/])([a-z])/g, (_m, p, c) => p + c.toUpperCase()).replace(/\b(And|Or|Of|In|The|With|On|A|To|As|For|From|Without|No)\b(?!$)/g, (w) => w.toLowerCase()).replace(/^./, (c) => c.toUpperCase());

export function pageTitle(f: NFood) {
  const s = defaultServing(f);
  const kcal = Math.round(per(f.v.kcal, s[1]));
  const base = `${titleCase(f.name)} Nutrition Facts`;
  const extra = ` (${kcal} Calories per ${s[0].replace(/^1 /, "").replace(/\s*\(.*\)$/, "")})`;
  // Full name always (EatThisMuch does the same); short titles get the calorie figure too.
  return (base + extra).length <= 72 ? base + extra : base;
}
export function pageDescription(f: NFood) {
  const { s, kcal, m } = summary(f);
  const p = fmtN(per(f.v["203"] ?? 0, s[1]), "g"), c = fmtN(per(f.v["205"] ?? 0, s[1]), "g"), fa = fmtN(per(f.v["204"] ?? 0, s[1]), "g");
  return `${servingLabel(s)} of ${lcName(f)} has ${kcal} calories: ${p} protein, ${c} carbs and ${fa} fat (${m.carbs}% carbs, ${m.fat}% fat, ${m.protein}% protein). Full nutrition facts, vitamins and minerals.`.slice(0, 300);
}

/* ---------------------------------------------------------------- rankings ("foods high in …") */
export type Ranking = { slug: string; k: string; title: string; h1: string; blurb: string; dir: "high" | "low" };
const R = (slug: string, k: string, nutrient: string, dir: "high" | "low" = "high", blurb = ""): Ranking => ({
  slug, k, dir,
  title: `${dir === "high" ? "Foods High in" : "Foods Lowest in"} ${nutrient}`,
  h1: `${dir === "high" ? "Foods high in" : "Foods lowest in"} ${/^Vitamin /.test(nutrient) ? nutrient.replace("Vitamin", "vitamin") : nutrient.toLowerCase()}`,
  blurb,
});
export const RANKINGS: Ranking[] = [
  R("high-protein-foods", "203", "Protein", "high", "Protein builds and repairs muscle; the Daily Value is 50 g."),
  R("high-fiber-foods", "291", "Fiber", "high", "Fiber supports digestion and fullness; the Daily Value is 28 g."),
  R("high-potassium-foods", "306", "Potassium", "high", "Potassium helps regulate blood pressure; the Daily Value is 4,700 mg."),
  R("high-iron-foods", "303", "Iron", "high", "Iron carries oxygen in the blood; the Daily Value is 18 mg."),
  R("high-calcium-foods", "301", "Calcium", "high", "Calcium keeps bones and teeth strong; the Daily Value is 1,300 mg."),
  R("high-magnesium-foods", "304", "Magnesium", "high", "Magnesium is used in hundreds of enzyme reactions; the Daily Value is 420 mg."),
  R("high-zinc-foods", "309", "Zinc", "high", "Zinc supports immunity and wound healing; the Daily Value is 11 mg."),
  R("high-vitamin-c-foods", "401", "Vitamin C", "high", "Vitamin C is an antioxidant needed for collagen; the Daily Value is 90 mg."),
  R("high-vitamin-a-foods", "320", "Vitamin A", "high", "Vitamin A supports vision and immunity; the Daily Value is 900 µg RAE."),
  R("high-vitamin-d-foods", "328", "Vitamin D", "high", "Vitamin D helps you absorb calcium; the Daily Value is 20 µg."),
  R("high-vitamin-k-foods", "430", "Vitamin K", "high", "Vitamin K is needed for blood clotting; the Daily Value is 120 µg."),
  R("high-vitamin-b12-foods", "418", "Vitamin B12", "high", "Vitamin B12 keeps nerve and blood cells healthy; the Daily Value is 2.4 µg."),
  R("high-folate-foods", "417", "Folate", "high", "Folate is needed to make DNA; the Daily Value is 400 µg."),
  R("high-omega-3-foods", "o3", "Omega-3", "high", "Omega-3 fats (ALA, EPA, DHA) are essential fats your body cannot make."),
  R("high-sodium-foods", "307", "Sodium", "high", "The Daily Value for sodium is 2,300 mg; most people eat more than that."),
  R("high-sugar-foods", "269", "Sugar", "high", "Total sugars include natural and added sugars."),
  R("high-calorie-foods", "kcal", "Calories", "high", "The most energy-dense foods per 100 g."),
  R("low-calorie-foods", "kcal", "Calories", "low", "The least energy-dense foods per 100 g."),
  R("low-carb-foods", "205", "Carbs", "low", "Foods with the fewest carbohydrates per 100 g."),
];
const RANK_SKIP = new Set(["baby-foods", "other-foods", "spices-herbs"]);
export function ranked(r: Ranking, n = 100): NFood[] {
  const pool = NFOODS.filter((f) => !RANK_SKIP.has(f.cat) && val(f, r.k) != null && (r.dir === "high" || (f.v["255"] ?? 0) < 99 && f.v.kcal > 0));
  const seen = new Set<string>();
  return pool
    .sort((a, b) => (r.dir === "high" ? val(b, r.k)! - val(a, r.k)! : val(a, r.k)! - val(b, r.k)! || a.v.kcal - b.v.kcal))
    .filter((f) => { const h = f.desc.toLowerCase().split(",").slice(0, 2).join(","); if (seen.has(h)) return false; seen.add(h); return true; })
    .slice(0, n);
}
export const nutrientDef = (k: string): NDef => [...MAIN, ...VITAMINS, ...MINERALS, ...FATS, ...SUGARS, { k: "kcal", name: "Calories", unit: "kcal" as const }].find((d) => d.k === k)!;

export const foodsInCat = (c: string) => NFOODS.filter((f) => f.cat === c).sort((a, b) => (a.storage ? 0 : 1) - (b.storage ? 0 : 1) || a.name.localeCompare(b.name));

/* ---------------------------------------------------------------- interlinking */
let RANK_POS: Map<string, { r: Ranking; pos: number }[]> | null = null;
/** Every ranking list a food appears in, with its position (computed once per build). */
export function rankingsOf(f: NFood) {
  if (!RANK_POS) {
    RANK_POS = new Map();
    for (const r of RANKINGS) ranked(r).forEach((x, i) => (RANK_POS!.get(x.slug) ?? RANK_POS!.set(x.slug, []).get(x.slug)!).push({ r, pos: i + 1 }));
  }
  return (RANK_POS.get(f.slug) ?? []).sort((a, b) => a.pos - b.pos);
}
/** The "foods high in …" list for a nutrient key, if there is one. */
export const rankingFor = (k: string) => RANKINGS.find((r) => r.k === k && r.dir === "high");

/** EatThisMuch-style serving links: 50/100/200 g, ½/1/2 of each household unit, oz and lb.
 *  Each is a link to the same page with ?a={amount}:{unitIndex}; the page reads it and rescales. */
export function servingUnits(f: NFood): Portion[] {
  return [...f.p.slice(0, 6), ["g", 1], ["oz", 28.35], ["lb", 453.6]];
}
const half = (n: number) => (n === 0.5 ? "½" : String(n));
export function servingLinks(f: NFood) {
  const units = servingUnits(f);
  const out: { label: string; a: string; kcal: number }[] = [];
  const add = (amt: number, idx: number) => {
    const [l, g] = units[idx];
    const label = l === "g" ? `${amt * 1} grams` : l === "oz" || l === "lb" ? `${half(amt)} ${l}` : `${half(amt)} ${l.replace(/^1 /, "")}`;
    out.push({ label, a: `${amt}:${idx}`, kcal: Math.round(per(f.v.kcal, amt * g)) });
  };
  const gi = units.length - 3;
  [50, 100, 200].forEach((n) => add(n, gi));
  units.slice(0, gi).forEach((_, i) => [0.5, 1, 2].forEach((n) => add(n, i)));
  [1, 4, 8].forEach((n) => add(n, gi + 1));
  add(1, gi + 2);
  return out;
}
