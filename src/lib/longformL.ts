/**
 * Localized long-form sections (data/i18n/lf.{lang}.json, validated by scripts/check-lf.mjs).
 * Mirrors src/lib/longform.ts for the translated food pages. Numbers come from the same data.
 */
import { type Food, isNum } from "./data";
import { groupOf, zoneFor, freezeVerdict } from "./content";
import { type Locale, cellsL, fmtL, fill, sub, pick, ft, joinList } from "./i18n";

const files = import.meta.glob<any>("../../data/i18n/lf.*.json", { eager: true, import: "default" });
export const lfFor = (L: Locale): any | null => files[`../../data/i18n/lf.${L.code}.json`] ?? null;

export function longL(L: Locale, f: Food) {
  const X = lfFor(L);
  if (!X) return null;
  const T = ft(L, f);
  const g = X.groups[groupOf(f)] ?? X.groups.dry;
  const s = f.states[0];
  const c = cellsL(L, f, s, 0);
  const zone = zoneFor(f).zone;
  const why = X.zones[zone];

  // About
  const facts: string[] = [];
  const notes: string[] = [];
  if (s.fridge) isNum(s.fridge) ? facts.push(sub(L.s.food.phFridge, { d: c.fridge.value })) : notes.push(X.intro.fridgeUseBy);
  if (s.pantry) isNum(s.pantry) ? facts.push(sub(L.s.food.phPantry, { d: c.pantry.value })) : s.pantry.text === "Until ripe" ? facts.push(X.intro.ripe) : s.pantry.text === "Indefinitely" ? facts.push(X.intro.indefinitely) : null;
  const fz = f.states.map((x) => x.freezer).find(Boolean);
  if (fz) isNum(fz) ? facts.push(sub(L.s.food.phFreezer, { d: fmtL(L, fz)! })) : fz.text === "Not recommended" ? notes.push(X.intro.notFreeze) : null;
  const intro = [
    sub(X.intro.category, { cat: L.s.categories[f.category] }),
    f.fkName ? sub(X.intro.source, { fk: f.fkName }) : "",
    facts.length ? fill(pick(X.intro.keeps, T.p), { list: joinList(L, facts) }, T) : "",
    ...notes,
    f.perishable ? X.intro.perishable : X.intro.notPerishable,
    sub(X.intro.where, { why }),
  ].filter(Boolean).join(" ");

  // Question by question
  const qa: [string, string][] = [];
  if (s.fridge) qa.push([fill(pick(X.qa.fridgeQ, T.p), {}, T), fill(X.qa.fridgeA, { d: c.fridge.value })]);
  qa.push([fill(pick(X.qa.freezerQ, T.p), {}, T), fz && isNum(fz) ? fill(X.qa.freezerA, { d: fmtL(L, fz)! }) : X.qa.freezerNo]);
  qa.push([fill(pick(X.qa.roomQ, T.p), {}, T), f.perishable ? X.qa.roomPerishable : s.pantry && isNum(s.pantry) ? fill(X.qa.roomPantry, { d: c.pantry.value }) : X.qa.roomFridgeOnly]);
  const op = f.states.find((x) => x.key === "opened");
  if (op?.fridge) qa.push([fill(pick(X.qa.openedQ, T.p), {}, T), fill(X.qa.openedA, { d: cellsL(L, f, op, f.states.indexOf(op)).fridge.value })]);
  const un = f.states.find((x) => x.key === "unopened");
  if (un && (un.pantry || un.fridge)) { const cu = cellsL(L, f, un, f.states.indexOf(un)); qa.push([fill(pick(X.qa.unopenedQ, T.p), {}, T), fill(X.qa.unopenedA, { d: un.pantry && isNum(un.pantry) ? cu.pantry.value : cu.fridge.value })]); }

  // Extra FAQ
  const v = freezeVerdict(f);
  const faq: [string, string][] = [
    [fill(X.faq.tempQ, {}, T), fill(X.faq.tempA, { d: c.fridge.value })],
    [fill(X.faq.containerQ, {}, T), fill(X.faq.containerA, { container: g.container })],
    [fill(X.faq.doorQ, {}, T), zone === "door" ? X.faq.doorYes : zone === "pantry" || zone === "freezer" ? fill(X.faq.doorOther, { why }) : fill(X.faq.doorNo, { why })],
    [fill(X.faq.refreezeQ, {}, T), v.tone === "no" ? X.faq.refreezeNo : X.faq.refreezeYes],
    [fill(X.faq.killQ, {}, T), X.faq.killA],
    [fill(X.faq.smellQ, {}, T), f.perishable ? fill(X.faq.smellPerishable, { d: c.fridge.value }) : X.faq.smellOther],
  ];

  return {
    X, T,
    h: { about: fill(X.h.about, {}, T), why: fill(pick(X.h.why, T.p), {}, T), mistakes: X.h.mistakes, buying: X.h.buying, useUp: X.h.useUp, qa: X.h.qa, dates: X.h.dates },
    about: [intro, g.about], spoil: g.spoil, mistakes: g.mistakes as string[], buying: g.buying as string[], useUp: g.useUp as string[],
    qa, faq,
    dates: [X.dates[0], fill(X.dates[1], { d: c.fridge.value })],
  };
}
