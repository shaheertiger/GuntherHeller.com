import raw from "../../data/foods.json";
import overridesRaw from "../../data/overrides.json";

export type Dur = { min: number; max: number; unit: "hours" | "days" | "weeks" | "months" | "years" } | { text: string };
export type State = { key: string; label: string | null; pantry: Dur | null; fridge: Dur | null; freezer: Dur | null; fromId?: number };
export type Food = {
  id: number | string;
  slug: string;
  name: string;
  plural: boolean;
  fkName: string | null;
  keywords: string[];
  aliases: string[];
  category: string;
  subcategory: string | null;
  kind: string;
  perishable: boolean;
  states: State[];
  thawedFridge: Dur | null;
  tips: { pantry?: string; fridge?: string; freezer?: string };
  cooking: { tip: string | null; safeTempF: number | null }[];
  notes?: Partial<Record<"pantry" | "fridge" | "freezer", string>>;
  source: { name: string; url: string; fkId?: number };
  extraSource?: { name: string; url: string };
  derivedFrom?: string;
  derivedNote?: string;
  rank: number;
};
export type Category = { slug: string; name: string; blurb: string; count: number; subcategories: { slug: string; name: string; count: number }[] };

export type Content = {
  portion?: string;
  notes?: Record<string, Partial<Record<"pantry" | "fridge" | "freezer", string>>>;
  quote?: string;
  methods?: { method: string; duration: string; temp: string; container: string; note: string }[];
  signs?: { title: string; text: string }[];
  freezeSteps?: string[];
  leftOut?: string;
  dates?: { unopened: { title: string; text: string }; opened: { title: string; text: string } };
  store?: string[];
  similar?: string[];
  faq?: [string, string][];
};

export const META = raw.meta;
export const CATEGORIES = raw.categories as Category[];
export const FOODS = raw.foods as unknown as Food[];
export const CONTENT = (overridesRaw as { content: Record<string, Content> }).content;

const bySlug = new Map(FOODS.map((f) => [f.slug, f]));
export const getFood = (slug: string) => bySlug.get(slug);
export const getCategory = (slug: string) => CATEGORIES.find((c) => c.slug === slug)!;
export const contentFor = (f: Food): Content => CONTENT[f.slug] ?? {};

/* ---------------------------------------------------------------- URLs */
export const url = {
  food: (f: Food) => `/how-long-does-${f.slug}-last/`,
  freeze: (f: Food) => `/can-you-freeze-${f.slug}/`,
  bad: (f: Food) => `/does-${f.slug}-go-bad/`,
  leftOut: (f: Food) => `/${f.slug}-left-out-overnight/`,
  category: (c: string) => `/foods/${c}/`,
  sub: (c: string, s: string) => `/foods/${c}/${s}/`,
};

/* ---------------------------------------------------------------- durations */
const UNIT_DAYS = { hours: 1 / 24, days: 1, weeks: 7, months: 30, years: 365 } as const;
export const isNum = (d: Dur | null | undefined): d is Extract<Dur, { min: number }> => !!d && "min" in d;
export const days = (d: Dur | null | undefined): number | null => (isNum(d) ? d.min * UNIT_DAYS[d.unit] : d && d.text === "Indefinitely" ? 1e5 : null);

export function fmt(d: Dur | null | undefined): string | null {
  if (!d) return null;
  if (!isNum(d)) return d.text;
  const one = d.unit.replace(/s$/, "");
  const n = d.min === d.max ? `${d.min}` : `${d.min}–${d.max}`;
  return `${n} ${d.max === 1 ? one : d.unit}`;
}
export const cap1 = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const titleCase = (s: string) =>
  s.replace(/(^|[\s(\-–/])([a-z])/g, (_m, p, c) => p + c.toUpperCase()).replace(/\b(And|Or|Of|In|The|With|On|A)\b(?!$)/g, (w) => w.toLowerCase()).replace(/^./, (c) => c.toUpperCase());

/* ---------------------------------------------------------------- display cells */
export type Cell = { value: string; note: string };
export type Cells = { pantry: Cell; fridge: Cell; freezer: Cell };

export function cellsFor(f: Food, s: State, i: number): Cells {
  const c = contentFor(f).notes?.[s.key] ?? (i === 0 ? f.notes : undefined) ?? {};
  const perishableState = f.perishable && i === 0;
  let pantry: Cell;
  if (s.pantry) pantry = { value: fmt(s.pantry)!, note: s.pantry && !isNum(s.pantry) && s.pantry.text === "Until ripe" ? "then refrigerate" : "cool, dry place" };
  else if (perishableState || (f.perishable && s.key !== "unopened")) pantry = { value: "2 hours", note: "1 hour if above 90°F" };
  else if (s.key === "opened") pantry = { value: "Refrigerate", note: "once opened" };
  else pantry = { value: "Not recommended", note: "keep it cold" };

  let fridge: Cell;
  if (s.fridge) {
    const t = fmt(s.fridge)!;
    fridge = { value: t, note: t === "Use-by date" ? "follow the package date" : "at or below 40°F (4°C)" };
  } else if (s.pantry) fridge = { value: "Not needed", note: "shelf-stable" };
  else fridge = { value: "Not listed", note: "no FoodKeeper figure" };

  let freezer: Cell;
  if (s.freezer) {
    const t = fmt(s.freezer)!;
    freezer = isNum(s.freezer)
      ? { value: t, note: "at 0°F; quality, not safety" }
      : { value: t, note: t === "Not recommended" ? "texture or safety suffers" : "" };
  } else if (s.pantry && !s.fridge) freezer = { value: "Not needed", note: "keeps without freezing" };
  else freezer = { value: "Not listed", note: "no FoodKeeper figure" };

  if (c.pantry) pantry.note = c.pantry;
  if (c.fridge) fridge.note = c.fridge;
  if (c.freezer) freezer.note = c.freezer;
  return { pantry, fridge, freezer };
}

/* ---------------------------------------------------------------- variants */
export const freezerFacts = (f: Food) => {
  const d = f.states.map((s) => s.freezer).find((x) => x);
  return d ?? null;
};
export const hasFreezePage = (f: Food) => Boolean(freezerFacts(f));
export const hasLeftOutPage = (f: Food) => f.perishable;

export type Variant = "food" | "freeze" | "bad" | "leftOut";
export function variantsOf(f: Food): Variant[] {
  const v: Variant[] = ["food", "bad"];
  if (hasFreezePage(f)) v.push("freeze");
  if (hasLeftOutPage(f)) v.push("leftOut");
  return v;
}
export const variantPath = (f: Food, v: Variant) => url[v](f);

/* ---------------------------------------------------------------- relations */
export function similarFoods(f: Food, n = 8): Food[] {
  const picked = (contentFor(f).similar ?? []).map(getFood).filter((x): x is Food => !!x && x.slug !== f.slug);
  const pool = FOODS.filter((x) => x.slug !== f.slug && !picked.includes(x));
  const sameSub = f.subcategory ? pool.filter((x) => x.category === f.category && x.subcategory === f.subcategory) : [];
  const sameKind = pool.filter((x) => x.category === f.category && x.kind === f.kind);
  const sameCat = pool.filter((x) => x.category === f.category);
  const out: Food[] = [...picked];
  for (const list of [sameSub, sameKind, sameCat, pool]) {
    for (const x of list) {
      if (out.length >= n) return out;
      if (!out.includes(x)) out.push(x);
    }
  }
  return out;
}
export const primaryFridge = (f: Food) => fmt(f.states[0].fridge) ?? fmt(f.states[0].pantry) ?? "—";

export const foodsIn = (cat: string, sub?: string) =>
  FOODS.filter((f) => f.category === cat && (!sub || f.subcategory === sub)).sort((a, b) => a.name.localeCompare(b.name));

/** "Does"/"Do" for the entity name. */
export const does = (f: Food) => (f.plural ? "Do" : "Does");
export const lasts = (f: Food) => (f.plural ? "last" : "lasts");
export const isAre = (f: Food) => (f.plural ? "are" : "is");
export const itThey = (f: Food) => (f.plural ? "they" : "it");
export const lc = (f: Food) => (/^[A-Z]{2}|^[A-Z][a-z]+-O|^Nutella|^Jell/.test(f.name) ? f.name : f.name.charAt(0).toLowerCase() + f.name.slice(1));

/* ---------------------------------------------------------------- images */
/** Food image paths (public/images/foods/, generated by scripts/make-images.mjs). */
export const foodImage = (f: Food) => ({ src: `/images/foods/${f.slug}.webp`, src600: `/images/foods/${f.slug}-600.webp`, w: 1200, h: 800 });
