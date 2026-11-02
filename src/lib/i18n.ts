/**
 * Phase 3 localisation. Strings live in data/i18n/{lang}.json, food names in
 * data/i18n/foods.{lang}.json (validated by scripts/check-i18n.mjs). A locale is
 * published only when both files exist. Numbers come from the same FoodKeeper data
 * as the English site; only words change.
 */
import { type Food, type State, type Dur, FOODS, CATEGORIES, isNum, days, getFood, similarFoods, freezerFacts, url as enUrl } from "./data";
import { groupOf, leftOutFor } from "./content";
import { SITE } from "./site";

type Strings = any; // shape of data/i18n/en.json
type FoodT = { n: string; q: string; o: string; p: boolean; s: string };

const stringFiles = import.meta.glob<Strings>("../../data/i18n/*.json", { eager: true, import: "default" });
const file = (name: string) => stringFiles[`../../data/i18n/${name}.json`];

export const LOCALE_DEFS = [
  { code: "es", food: "cuanto-dura", hub: "alimentos", method: "metodologia" },
  { code: "de", food: "haltbarkeit", hub: "lebensmittel", method: "methodik" },
  { code: "fr", food: "conservation", hub: "aliments", method: "methodologie" },
  { code: "pt-br", food: "quanto-dura", hub: "alimentos", method: "metodologia" },
] as const;
export type LocaleCode = (typeof LOCALE_DEFS)[number]["code"];

export type Locale = {
  code: LocaleCode;
  def: (typeof LOCALE_DEFS)[number];
  s: Strings;
  foods: Record<string, FoodT>;
};
export const LOCALES: Locale[] = LOCALE_DEFS.filter((d) => file(d.code) && file(`foods.${d.code}`)).map((def) => ({
  code: def.code,
  def,
  s: file(def.code),
  foods: file(`foods.${def.code}`),
}));
export const getLocale = (code: string) => LOCALES.find((l) => l.code === code)!;

/* ---------------------------------------------------------------- URLs */
export const slugify = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/ß/g, "ss").replace(/œ/g, "oe").replace(/æ/g, "ae").replace(/&/g, " ").replace(/['’]/g, "").split(/[^a-z0-9]+/).filter(Boolean).join("-");
const CAT_STOP = new Set(["y", "e", "et", "und", "de", "del", "la", "el", "les", "des", "do", "da", "dos", "das"]);
export const lurl = {
  home: (L: Locale) => `/${L.code}/`,
  food: (L: Locale, f: Food) => `/${L.code}/${L.def.food}-${L.foods[f.slug].s}/`,
  hubIndex: (L: Locale) => `/${L.code}/${L.def.hub}/`,
  hub: (L: Locale, cat: string) => `/${L.code}/${L.def.hub}/${slugify(L.s.categories[cat]).split("-").filter((w) => !CAT_STOP.has(w)).join("-")}/`,
  method: (L: Locale) => `/${L.code}/${L.def.method}/`,
};
export type Alt = { lang: string; href: string };
/** hreflang cluster for a food entity: English + every published locale. */
export const foodAlternates = (f: Food): Alt[] => [{ lang: "en", href: enUrl.food(f) }, ...LOCALES.map((L) => ({ lang: L.s.htmlLang, href: lurl.food(L, f) }))];
export const homeAlternates = (): Alt[] => [{ lang: "en", href: "/" }, ...LOCALES.map((L) => ({ lang: L.s.htmlLang, href: lurl.home(L) }))];
export const hubAlternates = (cat: string): Alt[] => [{ lang: "en", href: enUrl.category(cat) }, ...LOCALES.map((L) => ({ lang: L.s.htmlLang, href: lurl.hub(L, cat) }))];
export const methodAlternates = (): Alt[] => [{ lang: "en", href: "/methodology/" }, ...LOCALES.map((L) => ({ lang: L.s.htmlLang, href: lurl.method(L) }))];
export const hubIndexAlternates = (): Alt[] => [{ lang: "en", href: "/foods/" }, ...LOCALES.map((L) => ({ lang: L.s.htmlLang, href: lurl.hubIndex(L) }))];

/* ---------------------------------------------------------------- text helpers */
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const pick = (v: string | string[], plural: boolean) => (Array.isArray(v) ? v[plural ? 1 : 0] : v);
/** Fill a template. {Q} is capitalised only at the start of a sentence (after an optional ¿ or ¡). */
export function fill(tpl: string, vars: Record<string, string>, ft?: FoodT): string {
  let out = tpl;
  if (ft) {
    out = out.replace(/(^|[.!?]\s+)([¿¡]?)\{Q\}/g, (_m, a, b) => `${a}${b}${b ? ft.q : cap(ft.q)}`).replace(/\{Q\}/g, ft.q).replace(/\{q\}/g, ft.q).replace(/\{o\}/g, ft.o).replace(/\{n\}/g, ft.n);
  }
  for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(v);
  return cap(out);
}
/** Substitute without capitalising (for phrases inside a sentence). */
export const sub = (tpl: string, vars: Record<string, string>) => Object.entries(vars).reduce((o, [k, v]) => o.split(`{${k}}`).join(v), tpl);
export const t = (L: Locale, path: string): any => path.split(".").reduce((o: any, k) => o?.[k], L.s);
export const ft = (L: Locale, f: Food): FoodT => L.foods[f.slug];
export const verifiedDate = (L: Locale) => new Intl.DateTimeFormat(L.s.locale, { month: "long", year: "numeric" }).format(new Date(SITE.verifiedISO + "T12:00:00Z"));
export function joinList(L: Locale, parts: string[]) {
  if (parts.length < 2) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} ${L.s.and} ${parts.at(-1)}`;
}

/* ---------------------------------------------------------------- durations & cells */
export function fmtL(L: Locale, d: Dur | null | undefined): string | null {
  if (!d) return null;
  if (!isNum(d)) return L.s.vals[d.text] ?? d.text;
  const u = L.s.units[d.unit.replace(/s$/, "")] as [string, string];
  const n = d.min === d.max ? `${d.min}` : `${d.min}–${d.max}`;
  return `${n} ${d.max === 1 ? u[0] : u[1]}`;
}
const STATE_LABEL: Record<string, string> = { Opened: "opened", Unopened: "unopened", Cooked: "cooked", "Dry / uncooked": "dry", Dry: "dryShort", Uncooked: "uncooked", "Freshly expressed": "fresh", Thawed: "thawed" };
export const stateLabel = (L: Locale, s: State) => (s.label ? L.s.ui[STATE_LABEL[s.label] ?? "opened"] : null);

export type CellL = { value: string; note: string };
export function cellsL(L: Locale, f: Food, s: State, i: number): Record<"pantry" | "fridge" | "freezer", CellL> {
  const V = L.s.vals, N = L.s.notes;
  const perishableState = f.perishable && i === 0;
  let pantry: CellL;
  if (s.pantry) pantry = { value: fmtL(L, s.pantry)!, note: !isNum(s.pantry) && s.pantry.text === "Until ripe" ? N.ripe : N.cool };
  else if (perishableState || (f.perishable && s.key !== "unopened")) pantry = { value: V["2 hours"], note: N.hot };
  else if (s.key === "opened") pantry = { value: V.Refrigerate, note: N.onceOpened };
  else pantry = { value: V["Not recommended"], note: N.keepCold };
  let fridge: CellL;
  if (s.fridge) fridge = { value: fmtL(L, s.fridge)!, note: !isNum(s.fridge) && s.fridge.text === "Use-by date" ? N.useBy : N.fridgeTemp };
  else if (s.pantry) fridge = { value: V["Not needed"], note: N.shelfStable };
  else fridge = { value: V["Not listed"], note: N.noFigure };
  let freezer: CellL;
  if (s.freezer) freezer = isNum(s.freezer) ? { value: fmtL(L, s.freezer)!, note: N.freezerQuality } : { value: fmtL(L, s.freezer)!, note: s.freezer.text === "Not recommended" ? N.notRec : "" };
  else if (s.pantry && !s.fridge) freezer = { value: V["Not needed"], note: N.noFreeze };
  else freezer = { value: V["Not listed"], note: N.noFigure };
  return { pantry, fridge, freezer };
}

/* ---------------------------------------------------------------- page copy */
function headlineL(L: Locale, f: Food): { d: string; where: string } {
  const s = f.states[0];
  const F = L.s.food;
  if (s.pantry && isNum(s.pantry) && (days(s.pantry) ?? 0) >= 30) return { d: fmtL(L, s.pantry)!, where: F.inPantry };
  if (s.fridge && isNum(s.fridge)) return { d: fmtL(L, s.fridge)!, where: F.inFridge };
  if (s.pantry && isNum(s.pantry)) return { d: fmtL(L, s.pantry)!, where: F.inPantry };
  const alt = f.states.find((x) => x.fridge && isNum(x.fridge));
  if (alt) return { d: fmtL(L, alt.fridge)!, where: F.inFridge };
  const p = f.states.find((x) => x.pantry && isNum(x.pantry));
  if (p) return { d: fmtL(L, p.pantry)!, where: F.inPantry };
  return { d: F.phUseBy, where: "" };
}
const clip = (s: string, n = 155) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, "").replace(/[,;:.]$/, "") + "…");

export function foodCopy(L: Locale, f: Food) {
  const T = ft(L, f);
  const F = L.s.food;
  const p = T.p;
  const h1 = fill(pick(F.h1, p), {}, T);
  const hd = headlineL(L, f);
  const fz = freezerFacts(f);
  const title = fill(F.title, { h1, d: hd.d, where: hd.where }, T).replace(/\s+/g, " ").trim() + (fz && isNum(fz) ? sub(F.titleFreezer, { d: fmtL(L, fz)! }) : "");
  let desc = fill(pick(F.desc, p), { d: hd.d, where: hd.where }, T).replace(/\s+\./, ".");
  if (fz && isNum(fz)) desc += sub(F.descFreezer, { d: fmtL(L, fz)! });
  if (f.perishable) desc += F.descPerishable;
  desc += F.descTail;

  // Quotable sentence
  const s = f.states[0];
  const parts: string[] = [];
  if (s.pantry && isNum(s.pantry)) parts.push(sub(F.phPantry, { d: fmtL(L, s.pantry)! }));
  else if (s.pantry && !isNum(s.pantry) && s.pantry.text === "Until ripe") parts.push(F.phRipe);
  if (s.fridge) parts.push(isNum(s.fridge) ? sub(F.phFridge, { d: fmtL(L, s.fridge)! }) : F.phUseBy);
  if (s.freezer && isNum(s.freezer)) parts.push(sub(F.phFreezer, { d: fmtL(L, s.freezer)! }));
  if (f.perishable && !(s.pantry && isNum(s.pantry))) parts.push(F.ph2h);
  let quote = parts.length ? fill(pick(F.quote, p), { list: joinList(L, parts) }, T) : "";
  if (f.states.length > 1) {
    const b = f.states[1];
    const bp = [b.pantry && isNum(b.pantry) ? sub(F.phPantry, { d: fmtL(L, b.pantry)! }) : null, b.fridge && isNum(b.fridge) ? sub(F.phFridge, { d: fmtL(L, b.fridge)! }) : null].filter(Boolean) as string[];
    if (bp.length) quote += " " + fill(F.quote2, { label: stateLabel(L, b)!, list: joinList(L, bp) });
  }
  return { T, h1, title: clip(title, 120), description: clip(desc), quote };
}

export function methodsL(L: Locale, f: Food) {
  const F = L.s.food;
  const rows: { method: string; duration: string; temp: string; note: string }[] = [];
  f.states.forEach((s, i) => {
    const c = cellsL(L, f, s, i);
    const tag = s.label && f.states.length > 1 ? ` (${stateLabel(L, s)!.toLowerCase()})` : "";
    if (s.pantry || (i === 0 && f.perishable)) rows.push({ method: F.mPantry + tag, duration: c.pantry.value, temp: F.tRoom, note: c.pantry.note });
    if (s.fridge) rows.push({ method: F.mFridge + tag, duration: c.fridge.value, temp: F.tFridge, note: c.fridge.note });
    if (s.freezer && (i === 0 || !f.states[0].freezer)) rows.push({ method: F.mFreezer, duration: c.freezer.value, temp: F.tFreezer, note: c.freezer.note });
  });
  if (f.thawedFridge) rows.push({ method: F.mThawed, duration: fmtL(L, f.thawedFridge)!, temp: F.tFridge, note: F.noteThawed });
  const safe = f.cooking.find((c) => c.safeTempF);
  if (safe) rows.push({ method: F.mCook, duration: "—", temp: fill(F.tCook, { c: String(Math.round(((safe.safeTempF! - 32) * 5) / 9)), f: String(safe.safeTempF) }), note: F.noteCook });
  return rows;
}

const CAUTION_KINDS = new Set(["milk", "soft-cheese", "soft-dairy", "dip", "hard-cheese"]);
export function freezeL(L: Locale, f: Food) {
  const Z = L.s.freeze;
  const d = freezerFacts(f);
  const g = groupOf(f);
  if (!d) return { tone: "caution", label: Z.noFigure, detail: Z.dNoFigure, steps: [] as string[] };
  if (!isNum(d)) {
    if (d.text === "Not recommended") return { tone: "no", label: Z.no, detail: Z.dNo, steps: [] };
    return { tone: "caution", label: fmtL(L, d)!, detail: fmtL(L, d)!, steps: [] };
  }
  const dd = fmtL(L, d)!;
  const steps = L.s.freezeSteps[g] as string[];
  if (CAUTION_KINDS.has(f.kind)) return { tone: "caution", label: fill(Z.yesCooking, { d: dd }), detail: fill(Z.dCooking, { d: dd }), steps };
  return { tone: "yes", label: (days(d) ?? 0) >= 60 ? Z.yesWell : Z.yesShort, detail: fill(Z.dYes, { d: dd }), steps };
}

export function leftOutL(L: Locale, f: Food) {
  const O = L.s.leftOut;
  const tone = leftOutFor(f).tone;
  const S = f.states[0];
  const text = f.perishable ? O.tDiscard : S.pantry && isNum(S.pantry) ? O.tKeep : S.pantry ? O.tRipe : f.states.some((s) => s.key === "opened") ? O.tOpened : O.tCaution;
  return { tone, label: tone === "discard" ? O.discard : tone === "keep" ? O.keep : O.check, text };
}

export function faqL(L: Locale, f: Food): [string, string][] {
  const Q = L.s.faq;
  const T = ft(L, f);
  const s = f.states[0];
  const c = cellsL(L, f, s, 0);
  const out: [string, string][] = [];
  if (s.fridge) out.push([fill(pick(Q.qFridge, T.p), {}, T), fill(Q.aFridge, { d: c.fridge.value })]);
  const z = freezeL(L, f);
  out.push([fill(Q.qFreeze, {}, T), `${z.label}. ${z.detail}`]);
  if (f.perishable) out.push([fill(pick(Q.qSitOut, T.p), {}, T), Q.aSitOut]);
  else if (s.pantry && isNum(s.pantry)) out.push([fill(pick(Q.qPantry, T.p), {}, T), fill(Q.aPantry, { d: fmtL(L, s.pantry)! })]);
  const signs = (L.s.signs[groupOf(f)] as [string, string][]).slice(0, 3);
  out.push([fill(pick(Q.qSigns, T.p), {}, T), signs.map(([a, b]) => `${a}: ${b.replace(/\.$/, "")}`).join("; ") + "."]);
  out.push([Q.qSource, Q.aSource]);
  return out;
}

export const similarL = (L: Locale, f: Food) => similarFoods(f, 8).map((x) => ({ f: x, name: ft(L, x).n, href: lurl.food(L, x), fridge: cellsL(L, x, x.states[0], 0).fridge.value }));
export const foodsInCat = (cat: string) => FOODS.filter((f) => f.category === cat);
export { CATEGORIES, getFood };
