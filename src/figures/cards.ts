/**
 * Which figures each page gets, built from the exact data and strings the page itself prints.
 *
 * Used twice: by the page templates (to place <figure>s, alt text, JSON-LD, og:image) and by
 * scripts/figures.mjs (loaded through Vite) to render the images. A figure can only show a value
 * that one of the page's own helpers (cellsFor / cellsL / fmt / fmtL / content.ts) returns.
 */
import { FOODS, CATEGORIES, META, type Food, type State, type Dur, type Variant, url, getCategory, foodsIn, cellsFor, fmt, isNum, lc, does, titleCase, cap1, freezerFacts, hasFreezePage, hasLeftOutPage, primaryFridge, contentFor } from "../lib/data";
import { headline, signsFor, freezeStepsFor, storeTipsFor, freezeVerdict, leftOutFor, groupOf, SIGNS, FREEZE_STEPS, STORE, thawVariantFor } from "../lib/content";
import { LOCALES, type Locale, lurl, hasT, ft, cellsL, fmtL, stateLabel, headlineL, freezeL, leftOutL, fill, foodCopy } from "../lib/i18n";
import { widgetsFor } from "../lib/interactiveL";
import { range } from "../lib/viz";
import { TOOLS } from "../lib/tools";
import { familyOf, CATEGORY_FAMILY } from "./icons.mjs";
import en from "../../data/i18n/en.json";

export type CardType = "answer" | "shelf-life" | "temperature" | "steps" | "signs" | "versus" | "matrix" | "callout";
export type Zone = "pantry" | "fridge" | "freezer" | "danger" | "accent";
export type Card = {
  id: string;
  type: CardType;
  /** id of the section (H2) the figure sits under; "hero" sits under the H1. */
  anchor: string;
  alt: string;
  caption?: string;
  src: string;
  src720: string;
  w: 1200;
  h: 675;
  spec: Record<string, any>;
};
export type PageFigs = { path: string; lang: string; key: string; hero: Card; figures: Card[]; at: (anchor: string) => Card[] };

type FigS = typeof en.fig;
const ENF = en.fig as FigS;
const ENX = (en as any).figEn as Record<string, string>;
const SOURCE_EN = ENF.source;

/* ---------------------------------------------------------------- helpers */
const fillS = (t: string, v: Record<string, string>) => Object.entries(v).reduce((o, [k, x]) => o.split(`{${k}}`).join(x), t);
const days = (d: Dur | null | undefined): number | null => range(d)?.[1] ?? null;
const hasDigit = (s: string) => /\d/.test(s);
const sentence1 = (s: string) => (s.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? s).trim();
export const pageKey = (path: string) => path.replace(/^\/(es|de|fr|pt-br)\//, "/").replace(/^\/|\/$/g, "").replace(/\//g, "-") || "home";
const langOf = (path: string) => path.match(/^\/(es|de|fr|pt-br)\//)?.[1] ?? "en";
/** "4–6 days" → ["4–6", "days"]; "Use-by date" → ["Use-by date", ""] */
function splitValue(v: string): { big: string; unit: string; isWord: boolean } {
  const m = v.match(/^([\d.,–-]+)\s+(.*)$/);
  return m ? { big: m[1], unit: m[2], isWord: false } : { big: v, unit: "", isWord: true };
}
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

const STEP_ICONS: [RegExp, string][] = [
  [/thermometer|165°F|160°F|°F \(|°F\)/i, "thermometer"], [/\bthaw/i, "thaw"], [/foil/i, "foil"], [/bag|vacuum|wrap/i, "bag"],
  [/container|tub|airtight|jar|ice-cube/i, "container"], [/freez/i, "freezer"], [/fridge|refrigerat|crisper|shelf/i, "fridge"],
  [/label|date|opening/i, "calendar"], [/hour|minute|quickly|day you/i, "clock"], [/pantry|cupboard|cool, dark|dry place|bread box/i, "pantry"],
  [/wash|cut|slice|portion|chop|knife|beat/i, "knife"], [/counter|room temperature/i, "counter"], [/smell|rancid/i, "smell"], [/pest|insect/i, "pests"],
];
const stepIcon = (enText: string) => enText.startsWith("__") ? enText.slice(2) : STEP_ICONS.find(([re]) => re.test(enText))?.[1] ?? "check";
const SIGN_ICONS: Record<string, string> = { smell: "smell", texture: "texture", colour: "colour", color: "colour", mould: "mould", mold: "mould", taste: "look", flavour: "look", look: "look", package: "pack", seal: "pack", shell: "pack", shells: "pack", inside: "look", "float test": "thaw", pests: "pests", "freezer burn": "freezer", "ice crystals": "freezer" };
const signIcon = (enTitle: string) => SIGN_ICONS[enTitle.toLowerCase()] ?? "look";

/* ---------------------------------------------------------------- language adapters */
type Cells = Record<"pantry" | "fridge" | "freezer", { value: string; note: string }>;
type Ad = {
  lang: string;
  S: FigS;
  name: (f: Food) => string;
  cells: (f: Food, s: State, i: number) => Cells;
  stateLabel: (s: State) => string | null;
  fmt: (d: Dur | null | undefined) => string | null;
  skip: Set<string>;
  twoHours: string;
  tempUnit: "F" | "C";
};
const EN: Ad = {
  lang: "en", S: ENF, name: (f) => lc(f), cells: (f, s, i) => cellsFor(f, s, i), stateLabel: (s) => s.label, fmt: (d) => fmt(d),
  skip: new Set(["Not listed", "Not needed"]), twoHours: "2 hours", tempUnit: "F",
};
const adFor = (L: Locale): Ad => ({
  lang: L.code, S: L.s.fig, name: (f) => ft(L, f).n, cells: (f, s, i) => cellsL(L, f, s, i), stateLabel: (s) => stateLabel(L, s), fmt: (d) => fmtL(L, d),
  skip: new Set([L.s.vals["Not listed"], L.s.vals["Not needed"]]), twoHours: L.s.vals["2 hours"], tempUnit: "C",
});

/* ---------------------------------------------------------------- card factory */
function makeCard(page: string, lang: string, id: string, type: CardType, anchor: string, spec: Record<string, any>, alt: string, caption?: string): Card {
  const base = `/img/fig/${lang}/${pageKey(page)}-${id}`;
  if (caption === undefined && type !== "answer" && spec.title) caption = `${spec.title}${spec.sub && !/\d/.test(spec.sub) && spec.sub.length < 70 ? `. ${spec.sub}` : ""}`.replace(/\.\.$/, ".");
  return { id, type, anchor, alt: ((a) => (/[.!?]["“”»]?$/.test(a) ? a : `${a}.`))(alt.replace(/\s+/g, " ").replace(/\s+([.,:;])/g, "$1").trim()), caption, src: `${base}-1200x675.webp`, src720: `${base}-720x405.webp`, w: 1200, h: 675, spec: { ...spec, type, lang } };
}
function pageFigs(path: string, lang: string, cards: Card[]): PageFigs {
  const ids = new Map<string, number>();
  for (const c of cards) {
    const n = (ids.get(c.id) ?? 0) + 1;
    ids.set(c.id, n);
    if (n > 1) { c.id = `${c.id}-${n}`; c.src = c.src.replace(/-(1200x675)\.webp$/, `-${n}-$1.webp`); c.src720 = c.src720.replace(/-(720x405)\.webp$/, `-${n}-$1.webp`); }
  }
  const [hero, ...figures] = cards;
  return { path, lang, key: pageKey(path), hero, figures, at: (a: string) => figures.filter((c) => c.anchor === a) };
}

/* ---------------------------------------------------------------- shared card builders */
function shelfCard(ad: Ad, page: string, f: Food, anchor: string) {
  const states = f.states.slice(0, 2);
  const paired = states.length > 1;
  const cells = states.map((s, i) => ad.cells(f, s, i));
  const rows: any[] = [];
  const listParts: string[] = [];
  for (const zone of ["pantry", "fridge", "freezer"] as const) {
    const bars = states.map((s, i) => {
      const value = cells[i][zone].value;
      let d: number | null = days(s[zone]);
      if (zone === "pantry" && !s.pantry && value === ad.twoHours) d = 2 / 24;
      return { days: d, text: value, alt: i === 1, skip: d == null && ad.skip.has(value) };
    });
    if (bars.every((b) => b.skip)) continue;
    const label = zone === "pantry" ? (f.perishable && !states[0].pantry ? ad.S.counter : ad.S.pantry) : ad.S[zone];
    const icon = zone === "pantry" ? (f.perishable && !states[0].pantry ? "counter" : "pantry") : zone;
    rows.push({ zone, icon, label, bars: bars.filter((b) => !b.skip).map(({ skip, ...b }) => b) });
    const own = bars[0];
    if (!own.skip) listParts.push(`${label} ${own.text}`);
  }
  if (rows.length < 1) return null;
  const legend = paired ? [ad.stateLabel(states[0]) ?? "", ad.stateLabel(states[1]) ?? ""] : null;
  const title = fillS(ad.S.shelfTitle, { n: ad.name(f) });
  return makeCard(page, ad.lang, "shelf-life", "shelf-life", anchor, { zone: "fridge", title, sub: ad.S.shelfSub, source: ad.S.source, data: { rows, legend } },
    fillS(ad.S.alt.shelf, { n: ad.name(f), list: listParts.join(", ") }));
}

const deg = (ad: Ad, f: number, c: number) => (ad.tempUnit === "F" ? { label: `${f}°F`, alt: `${c}°C` } : { label: `${String(c).replace("-", "−")} °C`, alt: `${f} °F` });
function fridgeGauge(ad: Ad, note?: string) {
  const k = deg(ad, 40, 4);
  return ad.tempUnit === "F"
    ? { zone: "fridge", label: ad.S.fridge, min: 30, max: 50, safe: [null, 40], keys: [{ v: 40, ...k }], note }
    : { zone: "fridge", label: ad.S.fridge, min: -1, max: 10, safe: [null, 4], keys: [{ v: 4, ...k }], note };
}
function freezerGauge(ad: Ad, note?: string) {
  const k = deg(ad, 0, -18);
  return ad.tempUnit === "F"
    ? { zone: "freezer", label: ad.S.freezer, min: -20, max: 20, safe: [null, 0], keys: [{ v: 0, ...k }], note }
    : { zone: "freezer", label: ad.S.freezer, min: -28, max: -8, safe: [null, -18], keys: [{ v: -18, ...k }], note };
}
function dangerGauge(ad: Ad) {
  const a = deg(ad, 40, 4), b = deg(ad, 140, 60);
  return ad.tempUnit === "F"
    ? { zone: "danger", label: ad.S.dangerLabel, min: 20, max: 160, safe: [40, 140], keys: [{ v: 40, ...a }, { v: 140, ...b }], note: ad.S.dangerLabel, noteAt: "left" }
    : { zone: "danger", label: ad.S.dangerLabel, min: -5, max: 70, safe: [4, 60], keys: [{ v: 4, ...a }, { v: 60, ...b }], note: ad.S.dangerLabel, noteAt: "left" };
}
function tempCard(ad: Ad, page: string, f: Food | null, anchor: string, opts: { fridge?: string | null; freezer?: string | null; danger?: boolean; title?: string; sub?: string; nameForAlt?: string }) {
  const gauges: any[] = [];
  if (opts.fridge !== undefined) gauges.push(fridgeGauge(ad, opts.fridge && hasDigit(opts.fridge) ? opts.fridge : undefined));
  if (opts.freezer !== undefined) gauges.push(freezerGauge(ad, opts.freezer && hasDigit(opts.freezer) ? opts.freezer : undefined));
  if (opts.danger) gauges.push(dangerGauge(ad));
  if (!gauges.length) return null;
  const n = opts.nameForAlt ?? (f ? ad.name(f) : "");
  const list = gauges.map((g) => `${g.label} ${g.keys.map((k: any) => `${k.label} (${k.alt})`).join("–")}${g.note && g.note !== g.label ? `, ${g.note}` : ""}`).join("; ");
  return makeCard(page, ad.lang, "temperature", "temperature", anchor, { zone: gauges[0].zone, title: opts.title ?? fillS(ad.S.tempTitle, { n }), sub: opts.sub ?? ad.S.tempSub, source: ad.S.source, data: { gauges } },
    fillS(ad.S.alt.temp, { n, list }));
}
function stepsCard(ad: Ad, page: string, anchor: string, title: string, texts: string[], enTexts: string[], zone: Zone, max = 4) {
  const items = texts.slice(0, max).map((t, i) => ({ text: t, icon: stepIcon(enTexts[i] ?? t) }));
  if (items.length < 3) return null;
  return makeCard(page, ad.lang, "steps", "steps", anchor, { zone, title, source: ad.S.source, data: { steps: items } },
    fillS(ad.S.alt.steps, { title, first: items.map((s, i) => `${i + 1}. ${s.text}`).join(" ") }));
}
function signsCard(ad: Ad, page: string, f: Food, anchor: string, signs: [string, string][], enTitles: string[], ok: string | null) {
  const rows = signs.slice(0, 4).map(([name, text], i) => ({ name, text, icon: signIcon(enTitles[i] ?? name) }));
  const title = fillS(ad.S.signsTitle, { n: ad.name(f) });
  return makeCard(page, ad.lang, "signs", "signs", anchor, { zone: "danger", title, source: ad.S.source, data: { rows, discard: ad.S.discard, ok } },
    fillS(ad.S.alt.signs, { n: ad.name(f), list: rows.map((r) => `${r.name}: ${r.text.replace(/\.$/, "")}`).join("; ") }));
}
function versusStates(ad: Ad, page: string, f: Food, anchor: string) {
  if (f.states.length < 2) return null;
  const cols = f.states.slice(0, 2).map((s, i) => {
    const c = ad.cells(f, s, i);
    const rows = (["pantry", "fridge", "freezer"] as const)
      .map((z) => ({ zone: z, icon: z === "pantry" ? (f.perishable && !f.states[0].pantry ? "counter" : "pantry") : z, label: z === "pantry" ? (f.perishable && !f.states[0].pantry ? ad.S.counter : ad.S.pantry) : ad.S[z], value: c[z].value, isText: !hasDigit(c[z].value) }))
      .filter((r) => !(ad.skip.has(r.value)));
    return { name: ad.stateLabel(s) ?? "", rows };
  });
  if (cols.some((c) => !c.rows.length)) return null;
  const [a, b] = cols.map((c) => c.name);
  const title = fillS(ad.S.vsTitle, { a, b });
  return makeCard(page, ad.lang, "versus", "versus", anchor, { zone: "fridge", title, sub: cap1(ad.name(f)), source: ad.S.source, data: { cols } },
    fillS(ad.S.alt.versus, { n: ad.name(f), a, b, list: cols.map((c) => `${c.name}: ${c.rows.map((r) => `${r.label} ${r.value}`).join(", ")}`).join("; ") }));
}
function versusFridgeFreezer(ad: Ad, page: string, f: Food, anchor: string, fridgeValue: string, freezerValue: string) {
  const cols = [
    { name: ad.S.fridge, rows: [{ zone: "fridge", label: ad.S.fridge, value: fridgeValue, isText: !hasDigit(fridgeValue) }] },
    { name: ad.S.freezer, rows: [{ zone: "freezer", label: ad.S.freezer, value: freezerValue, isText: !hasDigit(freezerValue) }] },
  ];
  return makeCard(page, ad.lang, "versus", "versus", anchor, { zone: "freezer", title: ad.S.fridgeVsFreezer, sub: cap1(ad.name(f)), source: ad.S.source, data: { cols } },
    fillS(ad.S.alt.versus, { n: ad.name(f), a: ad.S.fridge, b: ad.S.freezer, list: `${ad.S.fridge} ${fridgeValue}; ${ad.S.freezer} ${freezerValue}` }));
}
function calloutCard(ad: Ad, page: string, anchor: string, text: string, note: string | undefined, title: string, zone: Zone = "danger", icon = "clock") {
  return makeCard(page, ad.lang, "callout", "callout", anchor, { zone, title, source: ad.S.source, data: { text, note, icon } }, fillS(ad.S.alt.callout, { text }));
}
function answerCard(ad: Ad, page: string, o: { q?: string; title: string; name: string; value: string; where: string; line?: string; zone: Zone; family: string }) {
  const sv = splitValue(o.value);
  const valueText = `${o.value}${o.where ? ` ${o.where}` : ""}${o.line ? `; ${o.line}` : ""}`;
  return makeCard(page, ad.lang, "answer", "answer", "hero", { zone: o.zone, data: { name: o.name, big: sv.big, unit: sv.unit, isWord: sv.isWord, where: o.where, line: o.line, family: o.family, seed: page } },
    fillS(ad.S.alt.answer, { q: o.q ?? o.title, value: valueText }));
}
const zoneOfWhere = (w: string): Zone => (/freez|gefrier|congel/i.test(w) ? "freezer" : /pantry|vorrat|despensa|placard|ambient|zimmer|room/i.test(w) ? "pantry" : "fridge");

/* ---------------------------------------------------------------- matrices and bar lists for hubs */
type Row = { name: string; counter: string; fridge: string; freezer: string; fridgeDays: number | null; freezerDays: number | null; pantryDays: number | null; pantry: string; rank: number };
function matrixCard(ad: Ad, page: string, anchor: string, title: string, rows: Row[], cols: ("counter" | "fridge" | "freezer")[], sub?: string) {
  const C = { counter: { zone: "pantry", icon: "counter", label: ad.S.counter }, fridge: { zone: "fridge", label: ad.S.fridge }, freezer: { zone: "freezer", label: ad.S.freezer } };
  const r6 = rows.slice(0, 5);
  if (r6.length < 2) return null;
  const data = { cols: cols.map((c) => C[c]), rows: r6.map((r) => ({ name: r.name, cells: cols.map((c) => ({ value: r[c], isText: !hasDigit(r[c]) })) })), foodWidth: cols.length === 1 ? 55 : 34 };
  return makeCard(page, ad.lang, "matrix", "matrix", anchor, { zone: "fridge", title, sub: sub ?? ad.S.hubSub, source: ad.S.source, data },
    fillS(ad.S.alt.matrix, { title, list: r6.map((r) => `${r.name}: ${cols.map((c) => `${C[c].label} ${r[c]}`).join(", ")}`).join("; ") }));
}
function barsCard(ad: Ad, page: string, anchor: string, title: string, rows: Row[], zone: "fridge" | "freezer" | "pantry", sub?: string) {
  const key = zone === "fridge" ? "fridgeDays" : zone === "freezer" ? "freezerDays" : "pantryDays";
  const val = zone === "fridge" ? "fridge" : zone === "freezer" ? "freezer" : "pantry";
  const r6 = rows.filter((r) => r[key] != null).slice(0, 5);
  if (r6.length < 2) return null;
  const data = { rows: r6.map((r) => ({ zone, icon: false, label: r.name, bars: [{ days: r[key], text: r[val] }] })), legend: null, foodLabels: true };
  return makeCard(page, ad.lang, "shelf-life", "shelf-life", anchor, { zone, title, sub: sub ?? ad.S.hubSub, source: ad.S.source, data },
    fillS(ad.S.alt.bars, { title, list: r6.map((r) => `${r.name} ${r[val]}`).join(", ") }));
}
function hubRowsEN(foods: Food[]): Row[] {
  return foods.map((f) => {
    const op = f.states.find((s) => s.key === "opened") ?? f.states[0];
    const c0 = cellsFor(f, f.states[0], 0);
    const cOp = cellsFor(f, op, f.states.indexOf(op));
    const fzi = f.states.findIndex((s) => s.freezer);
    const fz = fzi >= 0 ? cellsFor(f, f.states[fzi], fzi).freezer.value : c0.freezer.value;
    return { name: f.name, counter: c0.pantry.value, fridge: cOp.fridge.value, freezer: fz, pantry: c0.pantry.value, fridgeDays: days(op.fridge), freezerDays: days(f.states.map((s) => s.freezer).find(Boolean)), pantryDays: days(f.states[0].pantry), rank: f.rank };
  });
}
function hubRowsL(L: Locale, foods: Food[]): Row[] {
  return foods.map((f) => {
    const c = cellsL(L, f, f.states[0], 0);
    const s = f.states[0];
    return { name: ft(L, f).n, counter: c.pantry.value, fridge: c.fridge.value, freezer: c.freezer.value, pantry: c.pantry.value, fridgeDays: days(s.fridge), freezerDays: days(s.freezer), pantryDays: days(s.pantry), rank: f.rank };
  });
}
function hubSet(ad: Ad, page: string, label: string, rows: Row[], anchors: [string, string, string]) {
  const byRank = rows.slice().sort((a, b) => a.rank - b.rank);
  const nFridge = rows.filter((r) => r.fridgeDays != null).length;
  const cards: (Card | null)[] = [matrixCard(ad, page, anchors[0], fillS(ad.S.hubTopTitle, { cat: label }), byRank, ["counter", "fridge", "freezer"])];
  if (nFridge >= 2) cards.push(barsCard(ad, page, anchors[1], fillS(ad.S.hubShortTitle, { cat: label }), rows.slice().sort((a, b) => (a.fridgeDays ?? 1e9) - (b.fridgeDays ?? 1e9) || a.rank - b.rank), "fridge"));
  else cards.push(barsCard(ad, page, anchors[1], fillS(ad.S.hubPantryTitle, { cat: label }), rows.slice().sort((a, b) => (b.pantryDays ?? -1) - (a.pantryDays ?? -1) || a.rank - b.rank), "pantry"));
  const fz = barsCard(ad, page, anchors[2], fillS(ad.S.hubLongTitle, { cat: label }), rows.slice().sort((a, b) => (b.freezerDays ?? -1) - (a.freezerDays ?? -1) || a.rank - b.rank), "freezer");
  cards.push(fz ?? barsCard(ad, page, anchors[2], fillS(ad.S.hubPantryTitle, { cat: label }), rows.slice().sort((a, b) => (b.pantryDays ?? -1) - (a.pantryDays ?? -1) || a.rank - b.rank), "pantry"));
  // Small hubs: if a chart could not be drawn, fall back to a second matrix (different columns).
  const out = cards.filter((c): c is Card => !!c);
  if (out.length < 3) { const m = matrixCard(ad, page, anchors[2], fillS(ad.S.hubShortTitle, { cat: label }), rows.slice().sort((a, b) => (a.fridgeDays ?? 1e9) - (b.fridgeDays ?? 1e9)), ["fridge", "freezer"]); if (m) out.push(m); }
  return out;
}
const majorityZone = (rows: Row[]): Zone => {
  const fr = rows.filter((r) => r.fridgeDays != null).length;
  const pa = rows.filter((r) => r.pantryDays != null && r.pantryDays >= 30).length;
  return pa > fr ? "pantry" : "fridge";
};

/* ---------------------------------------------------------------- English food page */
export function figsFood(f: Food): PageFigs {
  const path = url.food(f);
  const ad = EN;
  const name = lc(f);
  const hd = headline(f);
  const fz = freezerFacts(f);
  const where = hd.where.toLowerCase();
  const zone = zoneOfWhere(where);
  const h1 = `How Long ${does(f)} ${titleCase(f.name)} Last?`;
  const line = zone !== "freezer" && isNum(fz) ? fillS(ENF.heroFreezer, { d: fmt(fz)! }) : f.perishable ? fillS(ENF.heroCounter, { d: "2 hours" }) : undefined;
  const cards: (Card | null)[] = [answerCard(ad, path, { q: `how long ${does(f).toLowerCase()} ${name} last?`, title: h1, name: f.name, value: cap1(hd.value), where, line, zone, family: familyOf(f) })];
  cards.push(shelfCard(ad, path, f, "methods"));
  const s0 = f.states[0];
  const c0 = cellsFor(f, s0, 0);
  const fzi = f.states.findIndex((s) => s.freezer);
  const fzVal = fzi >= 0 ? cellsFor(f, f.states[fzi], fzi).freezer.value : c0.freezer.value;
  if (s0.fridge || isNum(fz)) cards.push(tempCard(ad, path, f, "where", { fridge: s0.fridge ? c0.fridge.value : null, freezer: isNum(fz) ? fzVal : null }));
  cards.push(signsCard(ad, path, f, "bad", signsFor(f).map((s) => [s.title, s.text]), signsFor(f).map((s) => s.title), "Nothing ticked? Good sign. Still check how long it has been stored: the bacteria that cause food poisoning are invisible."));
  const fv = freezeVerdict(f);
  if (fv.tone !== "no" && freezerFacts(f)) { const st = freezeStepsFor(f); cards.push(stepsCard(ad, path, "freeze", fillS(ENF.freezeTitle, { n: name }), st, st, "freezer")); }
  if (f.perishable) cards.push(calloutCard(ad, path, "leftout", sentence1(leftOutFor(f).text), undefined, ENF.calloutTitle));
  if (f.states.length > 1) cards.push(versusStates(ad, path, f, f.states.some((s) => s.key === "opened") ? "dates" : "qa"));
  const tips = storeTipsFor(f);
  cards.push(stepsCard(ad, path, "store", fillS(ENF.storeTitle, { n: name }), tips, tips, "fridge"));
  return pageFigs(path, "en", limit(cards));
}
const limit = (cards: (Card | null)[]) => { const c = cards.filter((x): x is Card => !!x); return [c[0], ...c.slice(1, 7)]; };

/* ---------------------------------------------------------------- English variant pages */
export function figsVariant(f: Food, v: Exclude<Variant, "food">): PageFigs {
  const path = url[v](f);
  const ad = EN;
  const name = lc(f);
  const Name = titleCase(f.name);
  const fz = freezerFacts(f);
  const s0 = f.states[0];
  const c0 = cellsFor(f, s0, 0);
  const fzi = f.states.findIndex((s) => s.freezer);
  const fzVal = fzi >= 0 ? cellsFor(f, f.states[fzi], fzi).freezer.value : c0.freezer.value;
  const fam = familyOf(f);
  const cards: (Card | null)[] = [];
  if (v === "freeze") {
    const fv = freezeVerdict(f);
    const h1 = `Can You Freeze ${Name}?`;
    cards.push(isNum(fz)
      ? answerCard(ad, path, { title: h1, name: h1, value: fmt(fz)!, where: ENF.where.freezer, line: fv.label, zone: "freezer", family: fam })
      : answerCard(ad, path, { title: h1, name: h1, value: fz ? fmt(fz)! : "Not listed", where: "", line: fv.tone === "no" ? undefined : fv.label, zone: "freezer", family: fam }));
    if (fv.tone !== "no") {
      const st = freezeStepsFor(f);
      cards.push(stepsCard(ad, path, "how-freeze", fillS(ENF.freezeTitle, { n: name }), st, st, "freezer"));
      const th = thawVariantFor(f);
      cards.push(stepsCard(ad, path, "how-thaw", fillS(ENX.thawTitle, { n: name }), th.map(([t, d]) => `${t}: ${d}`), th.map(([t, d]) => `${t} ${d}`), "freezer", 3));
    }
    cards.push(versusFridgeFreezer(ad, path, f, "vs-compare", c0.fridge.value, fzVal));
    if (isNum(fz)) cards.push(tempCard(ad, path, f, "freeze-science", { freezer: fzVal, fridge: s0.fridge ? c0.fridge.value : null }));
    else if (s0.fridge) cards.push(tempCard(ad, path, f, "where", { fridge: c0.fridge.value }));
    cards.push(shelfCard(ad, path, f, "methods"));
  } else if (v === "bad") {
    const hd = headline(f);
    const h1 = `${does(f)} ${Name} Go Bad?`;
    const where = hd.where.toLowerCase();
    cards.push(answerCard(ad, path, { title: h1, name: h1, value: cap1(hd.value), where, line: isNum(fz) && zoneOfWhere(where) !== "freezer" ? fillS(ENF.heroFreezer, { d: fmt(fz)! }) : undefined, zone: zoneOfWhere(where), family: fam }));
    cards.push(signsCard(ad, path, f, "how-tell", signsFor(f).map((s) => [s.title, s.text]), signsFor(f).map((s) => s.title), "Nothing ticked? Good sign. Still check how long it has been stored: the bacteria that cause food poisoning are invisible."));
    if (f.states.length > 1) cards.push(versusStates(ad, path, f, "past-date"));
    const tips = storeTipsFor(f).slice(0, 3);
    cards.push(stepsCard(ad, path, "keep-fresh", fillS(ENX.keepTitle, { n: name }), tips, tips, "fridge", 3));
    cards.push(shelfCard(ad, path, f, "methods"));
    if (s0.fridge || isNum(fz)) cards.push(tempCard(ad, path, f, "where", { fridge: s0.fridge ? c0.fridge.value : null, freezer: isNum(fz) ? fzVal : null }));
  } else {
    const h1 = `${Name} Left Out Overnight: Is It Safe?`;
    cards.push(answerCard(ad, path, { title: h1, name: h1, value: "2 hours", where: ENF.where.counter, line: "1 hour above 90°F (32°C)", zone: "pantry", family: fam }));
    cards.push(calloutCard(ad, path, "verdict", sentence1(leftOutFor(f).text), undefined, ENF.calloutTitle));
    cards.push(tempCard(ad, path, f, "by-temp", { danger: true, fridge: s0.fridge ? c0.fridge.value : null }));
    const tips = storeTipsFor(f).slice(0, 3);
    cards.push(stepsCard(ad, path, "store-safely", fillS(ENX.storeSafeTitle, { n: name }), tips, tips, "fridge", 3));
    cards.push(shelfCard(ad, path, f, "methods"));
  }
  return pageFigs(path, "en", limit(cards));
}

/* ---------------------------------------------------------------- localized food page */
export function figsLFood(L: Locale, f: Food): PageFigs {
  const path = lurl.food(L, f);
  const ad = adFor(L);
  const S = L.s;
  const T = ft(L, f);
  const g = groupOf(f);
  const { h1 } = foodCopy(L, f);
  const hd = headlineL(L, f);
  const fz = freezerFacts(f);
  const zone = hd.where === S.food.inPantry ? "pantry" : "fridge";
  const line = isNum(fz) ? fillS(S.fig.heroFreezer, { d: fmtL(L, fz)! }) : f.perishable ? fillS(S.fig.heroCounter, { d: S.vals["2 hours"] }) : undefined;
  const cards: (Card | null)[] = [answerCard(ad, path, { title: h1, name: T.n, value: hd.d, where: hd.where, line, zone, family: familyOf(f) })];
  cards.push(shelfCard(ad, path, f, "methods"));
  const signs = S.signs[g] as [string, string][];
  const W = widgetsFor(L);
  cards.push(signsCard(ad, path, f, "bad", signs, SIGNS[g].map(([t]) => t), W ? W.checklist.ok : null));
  const z = freezeL(L, f);
  if (z.steps.length) cards.push(stepsCard(ad, path, "freeze", fillS(S.fig.freezeTitle, { n: T.n }), z.steps, FREEZE_STEPS[g], "freezer"));
  cards.push(stepsCard(ad, path, "store", fillS(S.fig.storeTitle, { n: T.n }), S.store[g] as string[], STORE[g], "fridge"));
  const s0 = f.states[0];
  const c0 = cellsL(L, f, s0, 0);
  if (f.perishable) cards.splice(3, 0, calloutCard(ad, path, "leftout", sentence1(leftOutL(L, f).text), undefined, S.fig.calloutTitle));
  if (s0.fridge || isNum(s0.freezer)) cards.push(tempCard(ad, path, f, "store", { fridge: s0.fridge ? c0.fridge.value : null, freezer: isNum(s0.freezer) ? c0.freezer.value : null }));
  if (f.states.length > 1) cards.push(versusStates(ad, path, f, "methods"));
  return pageFigs(path, L.code, limit(cards));
}

/* ---------------------------------------------------------------- hubs */
export function figsHub(catSlug: string, subSlug?: string): PageFigs {
  const cat = getCategory(catSlug);
  const sub = subSlug ? cat.subcategories.find((s) => s.slug === subSlug)! : undefined;
  const path = sub ? url.sub(cat.slug, sub.slug) : url.category(cat.slug);
  const label = sub ? sub.name : cat.name;
  const foods = foodsIn(cat.slug, sub?.slug);
  const rows = hubRowsEN(foods);
  const h1 = `${label} Storage Times`;
  const hero = answerCard(EN, path, { title: h1, name: h1, value: `${foods.length} ${ENF.foods}`, where: "", line: undefined, zone: majorityZone(rows), family: CATEGORY_FAMILY[cat.slug] ?? "grains" });
  return pageFigs(path, "en", [hero, ...hubSet(EN, path, label.toLowerCase(), rows, ["table", "table", "table"])]);
}
export function figsLHub(L: Locale, catSlug: string): PageFigs {
  const path = lurl.hub(L, catSlug);
  const ad = adFor(L);
  const catName = L.s.categories[catSlug];
  const foods = foodsIn(catSlug).filter((f) => hasT(L, f));
  const rows = hubRowsL(L, foods);
  const h1 = fill(L.s.hub.h1, { cat: catName });
  const hero = answerCard(ad, path, { title: h1, name: h1, value: `${foods.length} ${L.s.fig.foods}`, where: "", zone: majorityZone(rows), family: CATEGORY_FAMILY[catSlug] ?? "grains" });
  return pageFigs(path, L.code, [hero, ...hubSet(ad, path, catName, rows, ["table", "table", "table"])]);
}

/** A–Z question hubs. */
export function figsQHub(kind: "freeze" | "bad" | "leftOut"): PageFigs {
  const ad = EN;
  if (kind === "freeze") {
    const path = "/can-you-freeze/";
    const foods = FOODS.filter(hasFreezePage);
    const rows = hubRowsEN(foods);
    const hero = answerCard(ad, path, { title: "Can you freeze it?", name: "Can you freeze it?", value: `${foods.length} ${ENF.foods}`, where: "", zone: "freezer", family: "leftovers" });
    const byRank = rows.slice().sort((a, b) => a.rank - b.rank);
    return pageFigs(path, "en", [hero,
      barsCard(ad, path, "list", fillS(ENF.hubTopTitle, { cat: "freezer times" }), byRank, "freezer")!,
      barsCard(ad, path, "list", fillS(ENF.hubLongTitle, { cat: "all foods" }), rows.slice().sort((a, b) => (b.freezerDays ?? -1) - (a.freezerDays ?? -1) || a.rank - b.rank), "freezer")!,
      barsCard(ad, path, "list", "Shortest freezer times: all foods", rows.slice().sort((a, b) => (a.freezerDays ?? 1e9) - (b.freezerDays ?? 1e9) || a.rank - b.rank), "freezer")!,
    ]);
  }
  if (kind === "bad") {
    const path = "/does-it-go-bad/";
    const rows = FOODS.map((f) => ({ ...hubRowsEN([f])[0], fridge: primaryFridge(f), fridgeDays: days(f.states[0].fridge) }));
    const hero = answerCard(ad, path, { title: "Does it go bad?", name: "Does it go bad?", value: `${FOODS.length} ${ENF.foods}`, where: "", zone: "fridge", family: "dairy" });
    const fr = rows.filter((r) => r.fridgeDays != null);
    return pageFigs(path, "en", [hero,
      matrixCard(ad, path, "list", fillS(ENF.hubTopTitle, { cat: "fridge times" }), fr.slice().sort((a, b) => a.rank - b.rank), ["fridge"])!,
      barsCard(ad, path, "list", fillS(ENF.hubShortTitle, { cat: "all foods" }), fr.slice().sort((a, b) => a.fridgeDays! - b.fridgeDays! || a.rank - b.rank), "fridge")!,
      barsCard(ad, path, "list", "Longest fridge times: all foods", fr.slice().sort((a, b) => b.fridgeDays! - a.fridgeDays! || a.rank - b.rank), "fridge")!,
    ]);
  }
  const path = "/left-out-overnight/";
  const n = FOODS.filter(hasLeftOutPage).length;
  const hero = answerCard(ad, path, { title: "Left out overnight", name: "Left out overnight", value: "2 hours", where: ENF.where.counter, line: `${n} perishable foods, one rule`, zone: "pantry", family: "leftovers" });
  return pageFigs(path, "en", [hero,
    calloutCard(ad, path, "rule", "Perishable food is safe at room temperature for 2 hours, or 1 hour above 90°F (32°C).", "Overnight is always too long.", ENF.calloutTitle),
    makeCard(path, "en", "versus", "versus", "rule", { zone: "pantry", title: "Below vs above 90°F (32°C)", sub: ENF.room, source: SOURCE_EN, data: { cols: [{ name: "Up to 90°F (32°C)", rows: [{ zone: "pantry", icon: "counter", label: ENF.counter, value: "2 hours" }] }, { name: "Above 90°F (32°C)", rows: [{ zone: "danger", label: ENF.counter, value: "1 hour" }] }] } },
      "Side-by-side comparison: perishable food is safe for 2 hours at room temperature up to 90°F (32°C), and 1 hour above 90°F (32°C)."),
    stepsCard(ad, path, "rule", "Left out overnight", ["Perishable food is safe at room temperature for 2 hours, or 1 hour above 90°F (32°C).", "Overnight is always too long.", "Each page explains why for that food and how long it keeps once refrigerated."], ["__clock", "__cross", "__fridge"], "pantry", 3)!,
  ]);
}

/* ---------------------------------------------------------------- homes, indexes, guides */
const POPULAR_EN = ["eggs", "cooked-rice", "raw-chicken", "milk", "hard-cheese", "bread", "ground-beef", "pizza", "avocado", "bananas", "lettuce", "tomatoes", "fresh-salsa", "butter", "cooked-pasta", "shrimp", "bacon", "soup", "red-wine", "cooked-chicken"];
const POPULAR_L = ["eggs", "cooked-rice", "raw-chicken", "milk", "hard-cheese", "bread", "ground-beef", "pizza", "avocado", "bananas", "butter", "cooked-pasta", "shrimp", "bacon", "soup", "cooked-chicken"];
function categoryBars(ad: Ad, page: string, anchor: string, title: string, counts: { name: string; n: number }[]) {
  const top = counts.slice().sort((a, b) => b.n - a.n).slice(0, 6);
  const data = { rows: top.map((c) => ({ zone: "fridge", icon: false, label: c.name, bars: [{ days: c.n, text: `${c.n} ${ad.S.foods}` }] })), legend: null, foodLabels: true };
  return makeCard(page, ad.lang, "shelf-life", "shelf-life", anchor, { zone: "accent", title, sub: undefined, source: ad.S.source, data },
    fillS(ad.S.alt.bars, { title, list: top.map((c) => `${c.name} ${c.n}`).join(", ") }));
}
export function figsHome(L?: Locale): PageFigs {
  const ad = L ? adFor(L) : EN;
  const path = L ? lurl.home(L) : "/";
  const foods = L ? FOODS.filter((f) => hasT(L, f)) : FOODS;
  const h1 = L ? L.s.home.h1 : "How Long Does Food Last?";
  const hero = answerCard(ad, path, { title: h1, name: h1, value: `${foods.length} ${ad.S.foods}`, where: "", zone: "fridge", family: "leftovers" });
  const popular = (L ? POPULAR_L : POPULAR_EN).map((s) => FOODS.find((f) => f.slug === s)!).filter((f) => f && (!L || hasT(L, f)));
  const rows = popular.map((f) => {
    const c = L ? cellsL(L, f, f.states[0], 0) : cellsFor(f, f.states[0], 0);
    return { name: L ? ft(L, f).n : f.name, fridge: c.fridge.value, fridgeDays: days(f.states[0].fridge), counter: c.pantry.value, freezer: c.freezer.value, pantry: c.pantry.value, freezerDays: null, pantryDays: null, rank: f.rank } as Row;
  });
  const counts = CATEGORIES.map((c) => ({ name: L ? L.s.categories[c.slug] : c.name, n: L ? FOODS.filter((f) => f.category === c.slug && hasT(L, f)).length : c.count }));
  const cats = categoryBars(ad, path, "categories", L ? L.s.home.categories : ENX.categoriesTitle, counts);
  const cards: (Card | null)[] = [hero, cats];
  if (L) {
    cards.push(barsCard(ad, path, "popular", ad.S.popularTitle, rows.filter((r) => r.fridgeDays != null).slice(0, 6), "fridge", L.s.home.popular));
    cards.push(barsCard(ad, path, "popular", ad.S.popularTitle, rows.filter((r) => r.fridgeDays != null).slice(6, 12), "fridge", L.s.home.popular));
  } else {
    cards.push(calloutCard(ad, path, "faq", "Perishable food left out longer than 2 hours, or 1 hour above 90°F / 32°C, should be discarded.", undefined, ENF.calloutTitle));
    cards.push(tempCard(ad, path, null, "faq", { fridge: null, freezer: null, nameForAlt: "food", title: "Fridge and freezer temperatures", sub: "Food kept frozen at 0°F / -18°C stays safe indefinitely" }));
  }
  return pageFigs(path, L ? L.code : "en", limit(cards));
}
export function figsFoodsIndex(L?: Locale): PageFigs {
  const ad = L ? adFor(L) : EN;
  const path = L ? lurl.hubIndex(L) : "/foods/";
  const foods = L ? FOODS.filter((f) => hasT(L, f)) : FOODS;
  const title = L ? L.s.ui.foods : "All foods";
  const hero = answerCard(ad, path, { title, name: title, value: `${foods.length} ${ad.S.foods}`, where: "", line: L ? undefined : `${CATEGORIES.length} ${ad.S.categories}`, zone: "pantry", family: "grains" });
  const counts = CATEGORIES.map((c) => ({ name: L ? L.s.categories[c.slug] : c.name, n: L ? FOODS.filter((f) => f.category === c.slug && hasT(L, f)).length : c.count }));
  const sorted = counts.slice().sort((a, b) => b.n - a.n);
  const mk = (from: number, anchor: string) => {
    const top = sorted.slice(from, from + 5);
    const t = L ? L.s.home.categories : ENX.categoriesTitle;
    const data = { rows: top.map((c) => ({ zone: "fridge", icon: false, label: c.name, bars: [{ days: c.n, text: `${c.n} ${ad.S.foods}` }] })), legend: null, foodLabels: true };
    return makeCard(path, ad.lang, "shelf-life", "shelf-life", anchor, { zone: "accent", title: t, source: ad.S.source, data }, fillS(ad.S.alt.bars, { title: t, list: top.map((c) => `${c.name} ${c.n}`).join(", ") }));
  };
  return pageFigs(path, L ? L.code : "en", [hero, mk(0, "categories"), mk(5, "categories"), mk(10, "categories")]);
}
export function figsMethod(L?: Locale): PageFigs {
  const ad = L ? adFor(L) : EN;
  const path = L ? lurl.method(L) : "/methodology/";
  if (!L) {
    const hero = answerCard(ad, path, { title: "How we verify our numbers", name: "How we verify our numbers", value: `v${META.version}`, where: "", line: "USDA FoodKeeper data version", zone: "accent", family: "grains" });
    return pageFigs(path, "en", [hero,
      stepsCard(ad, path, "process", "How we turn the data into a page", ["Import", "Name", "Apply the 2-hour rule", "Write around the numbers"], ["__calendar", "__look", "__clock", "__check"], "accent")!,
      tempCard(ad, path, null, "meaning", { fridge: null, freezer: null, nameForAlt: "food", title: "What the numbers mean", sub: "Fridge times assume 40°F (4°C) or colder" })!,
      calloutCard(ad, path, "process", "Discard perishable food after 2 hours at room temperature, or 1 hour above 90°F (32°C).", undefined, ENF.calloutTitle),
    ]);
  }
  const M = L.s.method;
  const hero = answerCard(ad, path, { title: M.h1, name: M.h1, value: L.s.vals["2 hours"], where: ad.S.where.counter, zone: "pantry", family: "grains" });
  return pageFigs(path, L.code, [hero,
    stepsCard(ad, path, "method", M.h1, [sentence1(M.p1), sentence1(M.p2), sentence1(M.p3)], ["__calendar", "__look", "__clock"], "accent", 3)!,
    tempCard(ad, path, null, "method", { freezer: null, nameForAlt: M.h1, title: ad.S.freezer, sub: sentence1(M.p3.split(/;\s*/)[1] ?? M.p3) })!,
    calloutCard(ad, path, "method", sentence1(M.p3), undefined, ad.S.calloutTitle),
  ]);
}

/** Tools and the about page (English only). Every value and sentence is printed in that page's own copy. */
export function figsGuide(path: string): PageFigs | null {
  const ad = EN;
  const A = (title: string, value: string, where: string, zone: Zone, family: string, line?: string) => answerCard(ad, path, { title, name: title, value, where, line, zone, family });
  const temp = (anchor: string, title: string, sub: string, o: { fridge?: null; freezer?: null; danger?: boolean }) => tempCard(ad, path, null, anchor, { ...o, nameForAlt: "food", title, sub })!;
  const steps = (anchor: string, title: string, items: string[], icons: string[], zone: Zone) => stepsCard(ad, path, anchor, title, items, icons.map((i) => `__${i}`), zone, 6)!;
  const say = (anchor: string, text: string, title: string, zone: Zone = "danger", icon = "clock") => calloutCard(ad, path, anchor, text, undefined, title, zone, icon);
  switch (path) {
    case "/about/":
      return pageFigs(path, "en", [A("About Gunther Heller", `${FOODS.length} ${ENF.foods}`, "", "accent", "leftovers", "Counter, fridge and freezer, opened and unopened"),
        steps("what", "What we do", ["Counter, fridge and freezer, opened and unopened", "The answer at the top of every page", "No sign-ups and no app."], ["check", "check", "fridge"], "accent"),
        steps("data", "Where the data comes from", ["USDA FoodKeeper", "FSIS food-safety guidance", "How we verify our numbers"], ["calendar", "check", "look"], "accent"),
        say("contact", "A person replies within one business day.", "Contact", "accent", "clock")]);
    case "/tools/":
      return pageFigs(path, "en", [A("Food storage calculators", "Five", "quick tools", "accent", "leftovers", "Built on USDA FoodKeeper and FSIS guidance"),
        steps("tools", "Food storage calculators", TOOLS.slice(0, 3).map((t) => t.blurb), ["calendar", "freezer", "thaw"], "accent"),
        steps("tools", "More calculators", TOOLS.slice(3, 5).concat(TOOLS.slice(0, 1)).map((t) => t.blurb), ["clock", "calendar", "calendar"], "accent"),
        steps("hubs", "Question hubs", ["Can you freeze it? A–Z", "Does it go bad? A–Z", "Food left out overnight A–Z"], ["freezer", "look", "clock"], "accent")]);
    case "/tools/left-out-checker/":
      return pageFigs(path, "en", [A("Left-out checker", "2 hours", ENF.where.counter, "pantry", "leftovers", "1 hour above 90°F (32°C)"),
        say("why", "Perishable food should not sit between 40°F and 140°F for more than 2 hours, or 1 hour when it is above 90°F (32°C).", ENF.calloutTitle),
        temp("why", "Why 2 hours?", "FSIS calls this the danger zone", { danger: true }),
        steps("why", "Why 2 hours?", ["Bacteria double quickly between 40°F and 140°F (4–60°C).", "Two hours is the limit before numbers or toxins can reach unsafe levels.", "In hot weather, the limit is one hour."], ["thermometer", "clock", "heat"], "danger")]);
    case "/tools/thaw-time-calculator/":
      return pageFigs(path, "en", [A("Thaw time calculator", "24 hours", "per 5 lb in the fridge", "fridge", "poultry", "30 minutes per pound in cold water"),
        steps("ways", "The three safe ways to thaw", ["In the refrigerator. Slowest and safest.", "In cold water. Change the water every 30 minutes and cook immediately.", "In the microwave. Use the defrost setting and cook immediately."], ["fridge", "thaw", "clock"], "freezer"),
        temp("ways", "In the refrigerator", "Food stays at 40°F (4°C) or below", { fridge: null }),
        say("ways", "The outside reaches the danger zone (40–140°F) while the centre is still frozen.", "Can I thaw meat on the counter? No.")]);
    case "/tools/freezer-time-calculator/":
      return pageFigs(path, "en", [A("Freezer time calculator", "0°F", "(-18°C) or colder", "freezer", "leftovers", "Quality, not safety"),
        say("quality", "Food kept constantly at 0°F (-18°C) is safe indefinitely.", "Quality, not safety", "freezer", "freezer"),
        temp("quality", "What temperature should my freezer be?", "0°F (-18°C) or colder", { freezer: null }),
        steps("tips", "Getting the most from your freezer", ["Wrap tightly and squeeze out air to prevent freezer burn.", "Freeze flat in bags for fast freezing and thawing.", "Label everything with the name and date."], ["bag", "freezer", "calendar"], "freezer")]);
    case "/tools/leftover-calculator/":
      return pageFigs(path, "en", [A("Leftover calculator", "3–4 days", "at 40°F (4°C) or below", "fridge", "leftovers", "Most cooked leftovers"),
        steps("rules", "The leftover rules that always apply", ["Refrigerate within 2 hours of cooking (1 hour above 90°F).", "Use shallow containers so food cools quickly.", "Reheat to 165°F (74°C). If in doubt, throw it out."], ["clock", "container", "thermometer"], "fridge"),
        temp("how", "How the calculator works", "The high end is the outer limit if your fridge holds 40°F (4°C) or colder", { fridge: null }),
        say("rules", "Refrigerate within 2 hours of cooking (1 hour above 90°F).", "The leftover rules that always apply")]);
    case "/tools/date-decoder/":
      return pageFigs(path, "en", [A("Best-by date decoder", "Best-by", "", "accent", "condiments", "When quality is best. Not a safety date."),
        steps("labels", "The four common labels", ["Best if used by: when quality is best. Not a safety date.", "Use by: the last recommended day for peak quality.", "Sell by: for the store's stock rotation.", "Freeze by: freeze before this day to keep quality."], ["calendar", "calendar", "calendar", "freezer"], "accent"),
        say("labels", "In the US, only infant formula must carry a use-by date under federal rules.", "Which date labels are required by law?", "accent", "calendar"),
        say("labels", "A Julian date code is a pack date written as the day of the year (001–365).", "What is a Julian date code?", "accent", "calendar")]);
  }
  return null;
}

/* ---------------------------------------------------------------- registry */
export function allPageFigs(): PageFigs[] {
  const out: PageFigs[] = [];
  for (const f of FOODS) {
    out.push(figsFood(f));
    out.push(figsVariant(f, "bad"));
    if (hasFreezePage(f)) out.push(figsVariant(f, "freeze"));
    if (hasLeftOutPage(f)) out.push(figsVariant(f, "leftOut"));
  }
  for (const c of CATEGORIES) { out.push(figsHub(c.slug)); for (const s of c.subcategories) out.push(figsHub(c.slug, s.slug)); }
  out.push(figsQHub("freeze"), figsQHub("bad"), figsQHub("leftOut"));
  out.push(figsHome(), figsFoodsIndex(), figsMethod());
  for (const p of ["/about/", "/tools/", ...TOOLS.map((t) => `/tools/${t.slug}/`)]) { const g = figsGuide(p); if (g) out.push(g); }
  for (const L of LOCALES) {
    out.push(figsHome(L), figsFoodsIndex(L), figsMethod(L));
    for (const c of CATEGORIES) out.push(figsLHub(L, c.slug));
    for (const f of FOODS) if (hasT(L, f)) out.push(figsLFood(L, f));
  }
  return out;
}
export { contentFor };

/* ---------------------------------------------------------------- lookup by page path (templates, sitemap) */
let byPath: Map<string, PageFigs> | null = null;
export function figsFor(path: string): PageFigs | null {
  if (!byPath) byPath = new Map(allPageFigs().map((p) => [p.path, p]));
  return byPath.get(path) ?? null;
}
