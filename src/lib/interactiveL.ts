/**
 * Localized data for the interactive widgets (data/i18n/widgets.{lang}.json, validated by
 * scripts/check-widgets.mjs). Same verdict logic as src/lib/interactive.ts.
 */
import { type Food, isNum } from "./data";
import { groupOf, zoneFor } from "./content";
import { range } from "./viz";
import { type Locale, fmtL, fill, sub, pick, ft, freezeL, unitSep } from "./i18n";
import { lfFor } from "./longformL";
import type { Opt, Quiz } from "./interactive";

const files = import.meta.glob<any>("../../data/i18n/widgets.*.json", { eager: true, import: "default" });
export const widgetsFor = (L: Locale): any | null => files[`../../data/i18n/widgets.${L.code}.json`] ?? null;

const pickTimes = (cands: number[], min: number, max: number) =>
  [...cands.filter((d) => d < min).slice(-2), ...cands.filter((d) => d >= min && d <= max).slice(0, 1), ...cands.filter((d) => d > max).slice(0, 2)].slice(0, 5);

function label(L: Locale, days: number): string {
  const U = L.s.units as Record<string, [string, string]>;
  const n = (k: number, u: string) => `${k}${unitSep(L)}${k === 1 ? U[u][0] : U[u][1]}`;
  if (days >= 365 && days % 365 === 0) return n(days / 365, "year");
  if (days >= 30 && days % 30 === 0) return n(days / 30, "month");
  if (days >= 7 && days % 7 === 0) return n(days / 7, "week");
  return n(days, "day");
}

export function widgetsL(L: Locale, f: Food) {
  const W = widgetsFor(L);
  if (!W) return null;
  const T = ft(L, f);
  const U = L.s.units as Record<string, [string, string]>;
  const s = f.states[0];

  // Counter / pantry
  let counter: { ask: string; note: string; options: Opt[] } | null = null;
  if (f.perishable) {
    const C = W.counter;
    counter = {
      ask: C.ask, note: C.note,
      options: [
        { label: `30 ${W.min}`, tone: "fresh", head: C.h30, text: C.t30 },
        { label: `1${unitSep(L)}${U.hour[0]}`, tone: "fresh", head: C.h60, text: C.t60 },
        { label: `2${unitSep(L)}${U.hour[1]}`, tone: "edge", head: C.h120, text: C.t120 },
        { label: `4${unitSep(L)}${U.hour[1]}`, tone: "toss", head: C.h240, text: C.t240 },
        { label: W.overnight, tone: "toss", head: C.hNight, text: C.tNight },
      ],
    };
  } else {
    const pst = f.states.find((x) => x.pantry && isNum(x.pantry));
    const r = range(pst?.pantry);
    if (r) {
      const picks = pickTimes([7, 30, 90, 180, 365, 730, 1095, 1825], r[0], r[1]);
      const p = fmtL(L, pst!.pantry)!;
      const P = W.pantry;
      if (picks.length >= 3) counter = {
        ask: P.ask, note: P.note,
        options: picks.map((d) => d < r[0] ? { label: label(L, d), tone: "fresh", head: P.hFresh, text: sub(P.tFresh, { p }) }
          : d <= r[1] ? { label: label(L, d), tone: "edge", head: P.hEdge, text: sub(P.tEdge, { p }) }
          : { label: label(L, d), tone: "edge", head: P.hPast, text: sub(P.tPast, { p }) }),
      };
    }
  }

  // Freezer
  let freezer: { ask: string; note: string; options: Opt[] } | null = null;
  const fz = f.states.map((x) => x.freezer).find((d) => d && isNum(d));
  const rz = range(fz);
  if (rz) {
    const picks = pickTimes([30, 60, 90, 180, 270, 365, 540, 730], rz[0], rz[1]);
    const d = fmtL(L, fz)!;
    const Z = W.freezer;
    if (picks.length >= 3) freezer = {
      ask: Z.ask, note: Z.note,
      options: picks.map((x) => x < rz[0] ? { label: label(L, x), tone: "fresh", head: Z.hFresh, text: sub(Z.tFresh, { d }) }
        : x <= rz[1] ? { label: label(L, x), tone: "edge", head: Z.hEdge, text: sub(Z.tEdge, { d }) }
        : { label: label(L, x), tone: "edge", head: Z.hPast, text: sub(Z.tPast, { m: String(Math.round(x / 30)) }) }),
    };
  }

  // Checklist (signs already translated in {lang}.json)
  const checklist = (L.s.signs[groupOf(f)] as [string, string][]).map(([title, text]) => ({ title, text }));

  // Quiz
  const Q = W.quiz;
  const quiz: Quiz[] = [];
  const fr = s.fridge && isNum(s.fridge) ? fmtL(L, s.fridge)! : null;
  if (fr) quiz.push({ q: fill(pick(Q.q1, T.p), { d: fr }, T), answer: !f.perishable, why: sub(f.perishable ? Q.a1Perishable : Q.a1Other, { d: fr }) });
  quiz.push({ q: fill(Q.q2, {}, T), answer: false, why: Q.a2 });
  const v = freezeL(L, f);
  quiz.push({ q: fill(pick(Q.q3, T.p), {}, T), answer: v.tone === "yes", why: sub(v.tone === "yes" ? Q.a3Yes : v.tone === "no" ? Q.a3No : Q.a3Partly, { detail: v.detail }) });
  const zone = zoneFor(f).zone;
  const why = lfFor(L)?.zones?.[zone] ?? "";
  quiz.push({ q: fill(Q.q4, {}, T), answer: zone === "door", why: zone === "door" ? Q.a4Yes : sub(Q.a4No, { why }) });
  if (f.perishable) quiz.push({ q: fill(pick(Q.q5Perishable, T.p), {}, T), answer: false, why: Q.a5Perishable });
  else quiz.push({ q: fill(pick(Q.q5Shelf, T.p), {}, T), answer: false, why: s.pantry && isNum(s.pantry) ? sub(Q.a5Shelf, { p: fmtL(L, s.pantry)! }) : Q.a5ShelfNoPantry });

  return {
    W, counter, freezer, checklist, quiz: quiz.slice(0, 5),
    hCheck: fill(W.hCheck, {}, T), hQuiz: fill(Q.h, {}, T),
    quizLabels: { t: Q.t, f: Q.f, right: Q.right, wrong: Q.wrong },
  };
}
