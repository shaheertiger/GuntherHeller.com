/**
 * Nutrition data (data/nutrition.json, built by scripts/import-fdc.mjs from USDA FoodData Central).
 * Values are per 100 g; keys are FDC nutrient numbers plus a few derived keys (kcal, o3, o6, ala, dha, epa, dpa).
 */
import raw from "../../data/nutrition.json";
import branded from "../../data/branded.json";
import demandRaw from "../../data/demand.json";
import chainsRaw from "../../data/chains.json";
import restaurantRaw from "../../data/restaurant-foods.json";
import provenRaw from "../../data/proven.json";
import { builtSlugs } from "./built.mjs";

/** [label, grams] — a third element 1 means the weight is unknown (a chain guide gave only "1 donut"); grams is then 100 and v holds per-serving values. */
export type Portion = [label: string, grams: number, noWeight?: number];
export type NFood = {
  id: number;
  /** F Foundation Foods, S SR Legacy, N FNDDS, B Branded Foods (store-brand products, scripts/import-branded.mjs) */
  src: "F" | "S" | "N" | "B" | "R";
  desc: string;
  cat: string;
  p: Portion[];
  v: Record<string, number>;
  slug: string;
  name: string;
  storage?: string;
  sim: string[];
  /** Store-brand products only. */
  brand?: string;
  store?: string;
  storeSlug?: string;
  labelUpdated?: string;
  liquid?: boolean;
  /** Restaurant-guide items (src R): the chain, its guide, and ps = per-serving values only (no weight). */
  chainSlug?: string;
  ps?: boolean;
  source?: { name: string; url: string; date: string };
};
export type NCategory = { slug: string; name: string; count: number };

// Restaurant-guide items without a serving weight get a page only when people search for them (the guides list
// every size and milk option); items with weights are few enough to publish whole.
const RESTAURANT = (restaurantRaw.foods as unknown as NFood[]).filter((f) => !f.ps || ((demandRaw.foods as Record<string, { v: number }>)[f.slug]?.v ?? 0) > 0);
/** Every record in the data files. Names are worked out over all of them (below), so they stay unique and stable. */
const ALL_FOODS = [...(raw.foods as unknown as NFood[]), ...(branded.foods as unknown as NFood[]), ...RESTAURANT];
/** Foods Google has shown this site for (data/proven.json, from Search Console). */
export const PROVEN = provenRaw.foods as Record<string, { clicks: number; impressions: number; pages: number }>;
/**
 * Foods with a /calories/ page: proven foods plus restaurant menu items (src/lib/built.mjs). Every other food URL
 * returns 410 Gone (src/lib/gone.mjs).
 */
const BUILT: Set<string> = builtSlugs({ nutrition: raw, branded, restaurant: restaurantRaw, demand: demandRaw, chains: chainsRaw, proven: provenRaw } as any);
export const NFOODS = ALL_FOODS.filter((f) => BUILT.has(f.slug));
export const NMETA = { ...(raw.meta as { generated: string; sources: { tag: string; name: string; url: string }[] }), count: NFOODS.length };
const ALL_CATS = (raw.categories as NCategory[]).map((c) => ({ ...c, count: NFOODS.filter((f) => f.cat === c.slug).length }));
/** Categories whose list page was removed (410, src/lib/gone.mjs): beef and pork (owner's decision, Nov 2026). Their foods keep their pages. */
const NO_CAT_PAGE = new Set(["beef", "pork"]);
/** Categories with a /food/{slug}/ list page: at least one food, and not removed. */
export const NCATS = ALL_CATS.filter((c) => c.count > 0 && !NO_CAT_PAGE.has(c.slug));
/** Whether a category has a list page to link to. */
export const hasCatPage = (slug: string) => NCATS.some((c) => c.slug === slug);
export const STORES = branded.meta.stores as { slug: string; brand: string; store: string }[];

/* ---------------------------------------------------------------- restaurant chains (data/chains.json) */
export type Chain = { slug: string; name: string; re: RegExp };
/** "McDonald's" stays "McDonald's"; "Taco Bell" becomes "Taco Bell's". */
export const possessive = (name: string) => (/'s$/i.test(name) ? name : /'$/.test(name) ? `${name}s` : /s$/i.test(name) ? `${name}'` : `${name}'s`);
/** "2026-10-28" → "October 28, 2026"; "2026-11" → "November 2026"; "2026" stays. */
export const guideDate = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  if (!m) return String(y);
  const month = new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", { month: "long", timeZone: "UTC" });
  return day ? `${month} ${day}, ${y}` : `${month} ${y}`;
};
export const CHAINS: Chain[] = chainsRaw.chains.map((c) => ({ slug: c.slug, name: c.name, re: new RegExp(c.match, "i") }));
const chainCache = new Map<string, Chain | null>();
/** The restaurant chain a USDA record is from (store-brand products are never chain items). */
export function chainOf(f: NFood): Chain | null {
  if (f.src === "B") return null;
  if (!chainCache.has(f.slug)) chainCache.set(f.slug, f.chainSlug ? CHAINS.find((c) => c.slug === f.chainSlug) ?? null : CHAINS.find((c) => c.re.test(f.desc)) ?? null);
  return chainCache.get(f.slug)!;
}

/* ---------------------------------------------------------------- readable names */
/**
 * USDA record names read like database rows ("Chicken, broilers or fryers, breast, meat only, cooked, roasted").
 * Pages use the words people search for ("Chicken breast (cooked, roasted)"). Slugs are never changed.
 */
const DROP_SEG = /^(broilers or fryers|meat only|all grades|separable lean only|separable lean and fat|trimmed to .*fat|year round average|includes .*|ns as to .*|nfs|not further specified|from fast food \/ restaurant|commercial|commercially prepared|regular|unenriched)$/i;
const PARTS = new Set("breast thigh thighs wing wings drumstick drumsticks leg legs back neck liver gizzard heart ground loin tenderloin tenderloins chop chops ribs rib brisket flank sirloin steak roast shoulder fillet fillets juice sauce soup salad sandwich bread".split(" "));
const ADJ = new Set("white brown wild whole red green yellow sweet black pinto kidney navy baby plain dark light".split(" "));
const cap1 = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
function readableName(f: NFood): string {
  const chain = chainOf(f);
  let desc = f.desc.replace(/\s*\((?:Includes|Include|formerly)[^)]*\)/gi, "");
  if (chain) {
    // FNDDS names the chain in brackets at the end ("McDouble (McDonalds)"); SR Legacy puts it first ("McDONALD'S, BIG MAC").
    const tail = desc.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
    const rest = (tail && chain.re.test(tail[2]) ? tail[1] : desc.replace(chain.re, "").replace(/^'?s\b/i, "")).replace(/^[\s,]+|[\s,]+$/g, "").replace(/\(\s*\)/g, "").trim();
    const [head, ...more] = rest.split(/,\s*/).filter((s) => s && !DROP_SEG.test(s) && !/^(analyzed \d{4}|beverages)$/i.test(s));
    if (!head) return f.desc;
    // USDA writes some chain items in capitals ("BIG MAC"); keep acronyms, title-case the rest.
    // Words in capitals ("McNUGGETS", "DOUBLE QUARTER POUNDER") become title case; short acronyms (BLT, KFC) stay.
    const fixWord = (w: string) => (/^Mc[A-Z]{3,}/.test(w) ? "Mc" + w.charAt(2) + w.slice(3).toLowerCase() : /^[A-Z'\-]{4,}$/.test(w) ? w.charAt(0) + w.slice(1).toLowerCase() : w);
    const fixCase = (x: string) => x.split(" ").map(fixWord).join(" ").replace(/\b(With|And|Or|On|Of|In)\b(?!$)/g, (w) => w.toLowerCase());
    return `${chain.name} ${cap1(fixCase(head))}${more.length ? ` (${more.map(fixCase).join(", ").toLowerCase()})` : ""}`;
  }
  let segs = desc.split(/,\s*/).map((s) => s.trim()).filter((s) => s && !DROP_SEG.test(s));
  const tags: string[] = [];
  if (/^fast foods?$/i.test(segs[0] ?? "")) { segs = segs.slice(1); tags.push("fast food"); }
  if (/^restaurant$/i.test(segs[0] ?? "")) { segs = segs.slice(1); if (segs.length > 1 && /^[A-Z][a-z]+$/.test(segs[0])) { tags.push(`${segs[0]} restaurant`); segs = segs.slice(1); } else tags.push("restaurant"); }
  if (/^school lunch$/i.test(segs[0] ?? "")) { segs = segs.slice(1); tags.push("school lunch"); }
  if (!segs.length) return f.desc;
  let head = segs[0];
  let rest = segs.slice(1);
  const next = rest[0]?.toLowerCase();
  if (next && !next.includes(" ") && PARTS.has(next)) { head = `${head} ${next}`; rest = rest.slice(1); }
  else if (next && !next.includes(" ") && ADJ.has(next) && !/\s/.test(head)) { head = `${cap1(next)} ${head.toLowerCase()}`; rest = rest.slice(1); }
  const qual = [...rest.map((s) => (/^[A-Z]{2,}/.test(s) ? s : s.toLowerCase())), ...tags];
  return `${cap1(head)}${qual.length ? ` (${qual.join(", ")})` : ""}`;
}
// Curated names (storage foods, store-brand products) stay. Others get a readable name, unless two foods would
// share it; those keep USDA's full description, which is unique.
{
  const proposed = new Map<NFood, string>();
  const count = new Map<string, number>();
  const taken = new Set(ALL_FOODS.filter((f) => f.storage || f.src === "B" || f.src === "R").map((f) => f.name.toLowerCase()));
  for (const f of ALL_FOODS) {
    if (f.storage || f.src === "B" || f.src === "R") continue;
    const n = readableName(f);
    proposed.set(f, n);
    count.set(n.toLowerCase(), (count.get(n.toLowerCase()) ?? 0) + 1);
  }
  // A shared name goes to the best source (Foundation > SR Legacy > FNDDS); the others say which source they are.
  const TAG: Record<string, string> = { F: "USDA Foundation", S: "USDA lab analysis", N: "USDA estimate" };
  const RANK: Record<string, number> = { F: 0, S: 1, N: 2, B: 3 };
  const winner = new Map<string, NFood>();
  for (const [f, n] of proposed) { const k = n.toLowerCase(); const w = winner.get(k); if (!w || RANK[f.src] < RANK[w.src]) winner.set(k, f); }
  const used = new Set(taken);
  for (const [f, n] of proposed) {
    const k = n.toLowerCase();
    if (taken.has(k)) continue;
    if (count.get(k) === 1 || winner.get(k) === f) { f.name = n; used.add(k); }
  }
  for (const [f, n] of proposed) {
    const k = n.toLowerCase();
    if (taken.has(k) || count.get(k) === 1 || winner.get(k) === f) continue;
    const alt = `${n} (${TAG[f.src]})`;
    if (!used.has(alt.toLowerCase()) && [...proposed].filter(([g, m]) => m.toLowerCase() === k && g.src === f.src).length === 1) { f.name = alt; used.add(alt.toLowerCase()); }
  }
}

/* ---------------------------------------------------------------- search demand → indexing */
const DEMAND = demandRaw.foods as Record<string, { v: number; phrase: string | null }>;
export const CHAIN_DEMAND = (demandRaw as { chains?: Record<string, number> }).chains ?? {};
/** Monthly US searches (competitor-ranking keywords) that this page answers. scripts/build-demand.mjs */
export const demandOf = (f: { slug: string }) => DEMAND[f.slug]?.v ?? 0;
/** Every built food page is indexable: the site only builds foods with proven Google impressions (PROVEN). */
export const isIndexable = (f: NFood) => BUILT.has(f.slug);
/** Foods ordered by search demand (most searched first), then name. */
export const byDemand = (a: NFood, b: NFood) => demandOf(b) - demandOf(a) || a.name.localeCompare(b.name);

const bySlug = new Map(NFOODS.map((f) => [f.slug, f]));
export const nfood = (slug: string) => bySlug.get(slug);
export const ncat = (slug: string) => ALL_CATS.find((c) => c.slug === slug)!;
const byStorage = new Map(NFOODS.filter((f) => f.storage).map((f) => [f.storage!, f]));
/** The nutrition page that carries a FoodKeeper storage food. */
export const pageForStorage = (storageSlug: string) => byStorage.get(storageSlug);

export const SOURCE_NAME: Record<NFood["src"], string> = { F: "USDA Foundation Foods", S: "USDA SR Legacy", N: "USDA FNDDS 2021–2023", B: "USDA Branded Foods (manufacturer label data)", R: "the restaurant's published nutrition guide" };

/* ---------------------------------------------------------------- URLs (EatThisMuch-style) */
export const nurl = {
  food: (f: { slug: string }) => `/calories/${f.slug}/`,
  browse: () => `/food/`,
  cat: (c: string) => `/food/${c}/`,
  rank: (r: { slug: string }) => `/food/${r.slug}/`,
  restaurants: () => `/restaurants/`,
  chain: (c: { slug: string }) => `/restaurants/${c.slug}/`,
  stores: () => `/brands/`,
  store: (s: { slug: string }) => `/brands/${s.slug}/`,
};
/** Menu items of a chain, most searched first. */
export const chainItems = (c: Chain) => NFOODS.filter((f) => chainOf(f)?.slug === c.slug).sort(byDemand);
/** Store-brand products of a store brand, most searched first. */
export const storeItems = (slug: string) => NFOODS.filter((f) => f.storeSlug === slug).sort(byDemand);
/** Chains and store brands that get a hub page (at least 3 items). */
export const HUB_CHAINS = CHAINS.filter((c) => chainItems(c).length >= 3);
export const HUB_STORES = STORES.filter((s) => storeItems(s.slug).length >= 3);

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
export const servingLabel = (p: Portion) => (p[2] || /^\d+(\.\d+)?\s*g$/.test(p[0]) ? p[0] : `${p[0]} (${+p[1].toFixed(1)} g)`);

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
  else if (!f.ps) text += ` It has ${Math.round(f.v.kcal)} calories per 100 g.`;
  return { s, kcal, m, good, text };
}

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const KEEP_CASE = /^(?:[A-Z]{2}|Mc|[A-Z][a-z]+'s\b|[A-Z][a-z]+ (?:[A-Z]|&))/;
export const lcName = (f: NFood) => (KEEP_CASE.test(f.name) || f.src === "R" || f.src === "B" || chainOf(f) ? f.name : f.name.charAt(0).toLowerCase() + f.name.slice(1));

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

/* ---------------------------------------------------------------- calorie page: servings, title, H1 */
/** Household measures nobody types into a search box ("1 individual school container", "1 linear inch"). */
const ODD_SERVING = /school|linear inch|guide amount|as purchased|recipe|batch|\bpan\b/i;
/** Whole items people count ("1 medium", "1 fruit", "1 egg") come before cups and slices. */
const WHOLE = /\b(small|medium|large|extra large|jumbo|fruit|whole|each|item)\b/i;
/** "1 cup, cooked" → "1 cup"; "1 medium slice (yield after cooking)" → "1 medium slice". */
const cleanServing = (label: string) => label.replace(/\s*\(.*\)\s*/g, " ").replace(/,.*$/, "").replace(/\s+/g, " ").trim();
/** "Apples" → "apple", "Eggs" → "egg", "Cherries" → "cherry", "Tomatoes" → "tomato"; null for multi-word names. */
function singular(f: NFood): string | null {
  if (/\s|,|\(/.test(f.name)) return null;
  const n = f.name.toLowerCase();
  return /ies$/.test(n) ? n.replace(/ies$/, "y") : /oes$/.test(n) ? n.replace(/es$/, "") : /[^s]s$/.test(n) ? n.slice(0, -1) : n;
}
/** perServing: a chain-guide item with no weight; values in v are for this serving, and there is no 100 g row. */
export type Serving = { label: string; grams: number; ofFood: boolean; perServing?: boolean };
/**
 * Servings people actually use: the food's USDA household measures (first ones first, odd ones skipped, at most 3),
 * then 100 g. "1 medium" becomes "1 medium apple" when the food's name is one word; ofFood is false when the label
 * already names the food ("1 egg", "1 medium apple"), so sentences read "1 egg has …" rather than "1 egg of eggs".
 */
export function servings(f: NFood): Serving[] {
  if (f.ps) return [{ label: cleanServing(f.p[0]?.[0] ?? "") || "1 serving", grams: 100, ofFood: false, perServing: true }];
  const out: Serving[] = [];
  const one = singular(f);
  const named = (l: string) => WHOLE.test(l) || (one ? new RegExp(`\\b${one}s?\\b`, "i").test(l) : false);
  const ordered = [...f.p].sort((a, b) => Number(named(b[0])) - Number(named(a[0])));
  for (const [l, g, noWeight] of ordered) {
    if (noWeight || ODD_SERVING.test(l) || !g) continue;
    let label = cleanServing(l);
    if (!/^[\d½¼¾⅓⅔.\/]+\s/.test(label) || /\bg$/.test(label)) continue;
    let ofFood = true;
    if (one && /^[\d½¼¾.\/]+ (small|medium|large|extra large|jumbo)$/.test(label)) { label = `${label} ${one}`; ofFood = false; }
    else if (one && /^1 (fruit|whole|each|item)$/.test(label)) { label = `1 ${one}`; ofFood = false; }
    else if (one && new RegExp(`\\b${one}s?\\b`, "i").test(label)) ofFood = false;
    if (out.some((x) => x.label === label)) continue;
    out.push({ label, grams: g, ofFood });
    if (out.length === 3) break;
  }
  out.push({ label: "100 g", grams: 100, ofFood: true });
  return out;
}
/** The serving a page leads with: the first household measure, else 100 g. */
export const commonServing = (f: NFood) => servings(f)[0];
export const kcalIn = (f: NFood, grams: number) => Math.round(per(f.v.kcal, grams));
/** "1 cup of cooked rice" / "1 egg" / "100 g of salmon". */
export const servingPhrase = (f: NFood, s: Serving) => (s.perServing ? f.name : s.ofFood ? `${s.label} of ${lcName(f)}` : s.label);
/** "1 cup (158 g)", "100 g", or "1 large" for a per-serving chain item (no weight published). */
export const servingWithGrams = (s: Serving) => (s.perServing || s.label === "100 g" ? s.label : `${s.label} (${+s.grams.toFixed(1)} g)`);

const TITLE_MAX = 65;
/**
 * "{Food} Calories: {N} per {serving} (Nutrition Facts)", at most 65 characters. Long names drop "(Nutrition
 * Facts)", then fall back to 100 g, then to "{Food} Calories and Nutrition Facts".
 */
export function pageTitle(f: NFood) {
  const name = titleCase(f.name);
  const s = commonServing(f);
  const tries = s.perServing ? [`${name} Calories: ${kcalIn(f, s.grams)} (Nutrition Facts)`, `${name} Calories: ${kcalIn(f, s.grams)}`, `${name} Calories`] : [
    `${name} Calories: ${kcalIn(f, s.grams)} per ${s.label} (Nutrition Facts)`,
    `${name} Calories: ${kcalIn(f, s.grams)} per ${s.label}`,
    `${name} Calories: ${kcalIn(f, 100)} per 100 g`,
    `${name} Calories and Nutrition Facts`,
    `${name} Calories`,
  ];
  return tries.find((t) => t.length <= TITLE_MAX) ?? tries.at(-1)!;
}
/** H1: the question people type. */
export const pageH1 = (f: NFood) => `How many calories are in ${lcName(f)}?`;

/** Where a food sits in its category by calories per 100 g (1 = most). */
export function calorieRank(f: NFood) {
  const list = NFOODS.filter((x) => x.cat === f.cat).sort((a, b) => b.v.kcal - a.v.kcal || a.name.localeCompare(b.name));
  return { pos: list.indexOf(f) + 1, of: list.length };
}
/** 3 comparable foods: USDA's similar records that have a page, else the category's foods closest in calories. */
export function similarThree(f: NFood): NFood[] {
  // Foods that use the same USDA record have the same numbers: comparing with them says nothing.
  const other = (x: NFood) => x !== f && x.id !== f.id;
  const out = f.sim.map(nfood).filter((x): x is NFood => !!x && other(x));
  const near = NFOODS.filter((x) => x.cat === f.cat && other(x) && !out.includes(x)).sort((a, b) => Math.abs(a.v.kcal - f.v.kcal) - Math.abs(b.v.kcal - f.v.kcal));
  return [...out, ...near].slice(0, 3);
}
export function pageDescription(f: NFood) {
  const s = commonServing(f);
  const g = (k: string) => fmtN(per(f.v[k] ?? 0, s.grams), " g").replace(/^<0.1 g$/, "under 0.1 g");
  const hundred = s.grams === 100 || s.perServing ? "" : ` 100 g has ${kcalIn(f, 100)} calories.`;
  return `${cap(servingPhrase(f, s))} has ${kcalIn(f, s.grams)} calories, ${g("203")} of protein, ${g("205")} of carbs and ${g("204")} of fat.${hundred} Serving sizes, vitamins and minerals from USDA data.`.slice(0, 300);
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
  // Rankings compare everyday foods: the ones people search for, not every USDA record or packaged product.
  const pool = NFOODS.filter((f) => isIndexable(f) && f.src !== "B" && f.src !== "R" && !RANK_SKIP.has(f.cat) && val(f, r.k) != null && (r.dir === "high" || (f.v["255"] ?? 0) < 99 && f.v.kcal > 0));
  const seen = new Set<string>();
  return pool
    .sort((a, b) => (r.dir === "high" ? val(b, r.k)! - val(a, r.k)! : val(a, r.k)! - val(b, r.k)! || a.v.kcal - b.v.kcal))
    .filter((f) => { const h = f.desc.toLowerCase().split(",").slice(0, 2).join(","); if (seen.has(h)) return false; seen.add(h); return true; })
    .slice(0, n);
}
export const nutrientDef = (k: string): NDef => [...MAIN, ...VITAMINS, ...MINERALS, ...FATS, ...SUGARS, { k: "kcal", name: "Calories", unit: "kcal" as const }].find((d) => d.k === k)!;

/** A category's foods: indexable ones first, most searched first. */
export const foodsInCat = (c: string) => NFOODS.filter((f) => f.cat === c && !f.ps).sort((a, b) => (isIndexable(a) ? 0 : 1) - (isIndexable(b) ? 0 : 1) || byDemand(a, b));

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
  if (f.ps) return [f.p[0]];
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
  if (f.ps) { [1, 2, 3].forEach((n) => add(n, 0)); return out; }
  const gi = units.length - 3;
  [50, 100, 200].forEach((n) => add(n, gi));
  units.slice(0, gi).forEach((_, i) => [0.5, 1, 2].forEach((n) => add(n, i)));
  [1, 4, 8].forEach((n) => add(n, gi + 1));
  add(1, gi + 2);
  return out;
}
