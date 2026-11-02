/**
 * Numbers behind the visual widgets (timeline, perishability scale, "still good?" checker).
 * Everything is derived from the FoodKeeper durations; no new facts are introduced.
 */
import { type Food, type Dur, isNum } from "./data";

const DAYS = { hours: 1 / 24, days: 1, weeks: 7, months: 30, years: 365 } as const;
export const range = (d: Dur | null | undefined): [number, number] | null => (isNum(d) ? [d.min * DAYS[d.unit], d.max * DAYS[d.unit]] : null);

/* ---------------------------------------------------------------- timeline (log scale, 1 hour → 2 years) */
const LO = Math.log(1 / 24), HI = Math.log(730);
export const pos = (days: number) => Math.max(0, Math.min(100, ((Math.log(Math.max(days, 1 / 24)) - LO) / (HI - LO)) * 100));
export const TICKS = [1 / 24, 1, 7, 30, 182, 365, 730];

export type Bar = { key: "pantry" | "fridge" | "freezer"; from: number; to: number; open: boolean };
export function timelineBars(f: Food): Bar[] {
  const s = f.states[0];
  const bars: Bar[] = [];
  const counter = range(s.pantry) ?? (f.perishable ? ([1 / 12, 1 / 12] as [number, number]) : null);
  if (counter) bars.push({ key: "pantry", from: 0, to: pos(counter[1]), open: false });
  const fr = range(s.fridge);
  if (fr) bars.push({ key: "fridge", from: 0, to: pos(fr[1]), open: false });
  const fz = range(s.freezer) ?? range(f.states.find((x) => x.freezer)?.freezer);
  if (fz) bars.push({ key: "freezer", from: 0, to: pos(fz[1]), open: fz[1] >= 365 });
  return bars.map((b) => ({ ...b, from: 0 }));
}

/* ---------------------------------------------------------------- perishability 1–4 */
/** 1 = use within days … 4 = keeps for many months. Based on the longest practical non-freezer window. */
export function perishLevel(f: Food): 1 | 2 | 3 | 4 {
  const s = f.states[0];
  const best = Math.max(range(s.fridge)?.[1] ?? 0, range(s.pantry)?.[1] ?? 0, f.perishable ? 0 : range(f.states[1]?.pantry)?.[1] ?? 0);
  if (best <= 5) return 1;
  if (best <= 21) return 2;
  if (best <= 180) return 3;
  return 4;
}

/* ---------------------------------------------------------------- "is it still good?" checker */
export type Check = { days: number; tone: "fresh" | "edge" | "toss"; left: [number, number] };
const CANDIDATES = [1, 2, 3, 4, 5, 7, 10, 14, 21, 30, 45, 60, 90, 120, 180, 270, 365, 540, 730];
export function checker(f: Food): Check[] | null {
  const r = range(f.states[0].fridge);
  if (!r) return null;
  const [min, max] = r;
  const below = CANDIDATES.filter((d) => d < min).slice(-2);
  const within = CANDIDATES.filter((d) => d >= min && d <= max);
  const mid = within.length ? [within[Math.floor(within.length / 2)]] : [];
  const above = CANDIDATES.filter((d) => d > max).slice(0, 2);
  const picks = [...below, ...mid, ...above].slice(0, 5);
  if (picks.length < 3) return null;
  return picks.map((d) => ({
    days: d,
    tone: d < min ? "fresh" : d <= max ? "edge" : "toss",
    left: [Math.max(0, Math.round(min - d)), Math.max(0, Math.round(max - d))],
  }));
}

/** Compact label for a day count, given unit words ([one, many] per unit). */
export function dayLabel(days: number, U: Record<string, [string, string]>): string {
  const pick = (n: number, u: string) => `${n} ${n === 1 ? U[u][0] : U[u][1]}`;
  if (days < 1) return pick(Math.round(days * 24), "hour");
  if (days >= 365 && days % 365 === 0) return pick(days / 365, "year");
  if (days >= 30 && days % 30 === 0) return pick(days / 30, "month");
  if (days >= 7 && days % 7 === 0) return pick(days / 7, "week");
  return pick(days, "day");
}

/** English copy for the widgets; localized pages pass their own from data/i18n/{lang}.json → viz. */
export const VIZ_EN = {
  quick: "Quick answer",
  glance: "Shelf life at a glance",
  glanceNote: "Bars show the longest recommended time for each place. Scale runs from 1 hour to 2 years.",
  ticks: ["1 hr", "1 day", "1 wk", "1 mo", "6 mo", "1 yr", "2 yr"],
  plus: "longer",
  perish: "How perishable is it?",
  levels: ["Use within days", "Keeps a week or two", "Keeps for months", "Keeps a long time"],
  levelNote: "Based on the longest fridge or pantry time.",
  check: "Is it still good?",
  checkAsk: "It's been in the fridge for…",
  checkHint: "Tap a time to check.",
  fresh: "Still good",
  edge: "Use it today",
  toss: "Throw it out",
  freshText: "About {a}–{b} more days in the fridge.",
  freshText1: "About {b} more days in the fridge.",
  edgeText: "It's inside the safe window but near the end. Eat it today or freeze it now.",
  tossText: "Past the recommended fridge time. Even if it looks and smells fine, throw it out.",
  checkNote: "Counted from the day it was cooked, opened or bought. Assumes a fridge at 4 °C (40 °F) or colder.",
  dangerZone: "Danger zone",
  dangerText: "Bacteria multiply fastest between 4 °C and 60 °C (40–140 °F).",
  safeCold: "Fridge",
  safeHot: "Hot holding",
  badges: { perishable: "Perishable", shelf: "Shelf-stable", freezes: "Freezes well", noFreeze: "Don't freeze", opened: "Changes once opened" },
  steps: "Step",
  eyebrows: { glance: "At a glance", methods: "Every method", signs: "Check before you eat", freeze: "Freezing", leftOut: "The 2-hour rule", dates: "Date labels", tips: "Storage tips", similar: "Keep exploring", faq: "Questions people ask" },
  tips: "Storage tips",
};
export type VizStrings = typeof VIZ_EN;
