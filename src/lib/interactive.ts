/**
 * Data for the CSS-only interactive widgets on food pages: freezer / counter / pantry
 * checkers and the true-or-false quiz. Every verdict is derived from the FoodKeeper numbers.
 */
import { type Food, isNum, fmt, lc, does, itThey, shelfStable } from "./data";
import { freezeVerdict, zoneFor, signsFor } from "./content";
import { range } from "./viz";

export type Opt = { label: string; tone: "fresh" | "edge" | "toss"; head: string; text: string };

const months = (d: number) => Math.round(d / 30);
const label = (days: number) =>
  days < 1 ? (days * 24 < 1 ? `${Math.round(days * 24 * 60)} min` : `${Math.round(days * 24)} ${Math.round(days * 24) === 1 ? "hour" : "hours"}`)
  : days >= 365 && days % 365 === 0 ? `${days / 365} ${days === 365 ? "year" : "years"}`
  : days >= 30 && days % 30 === 0 ? `${days / 30} ${days === 30 ? "month" : "months"}`
  : days >= 7 && days % 7 === 0 ? `${days / 7} ${days === 7 ? "week" : "weeks"}`
  : `${days} ${days === 1 ? "day" : "days"}`;

/** Freezer: frozen food stays safe, so the verdict is about quality. */
export function freezerChecks(f: Food): Opt[] | null {
  const fz = f.states.map((s) => s.freezer).find((d) => d && isNum(d));
  const r = range(fz);
  if (!r) return null;
  const [min, max] = r;
  const cands = [30, 60, 90, 180, 270, 365, 540, 730];
  const picks = [...cands.filter((d) => d < min).slice(-2), ...cands.filter((d) => d >= min && d <= max).slice(0, 1), ...cands.filter((d) => d > max).slice(0, 2)].slice(0, 5);
  if (picks.length < 3) return null;
  const name = lc(f);
  return picks.map((d) => d < min
    ? { label: label(d), tone: "fresh", head: "Best quality", text: `At -18°C (0°F), ${name} ${f.plural ? "are" : "is"} still within the ${fmt(fz)} quality window. Thaw in the fridge and use within a day or two.` }
    : d <= max
      ? { label: label(d), tone: "edge", head: "Use it soon", text: `Still safe, and at the end of its best-quality window. Use it in the next few weeks; texture and flavour fade after ${fmt(fz)}.` }
      : { label: label(d), tone: "edge", head: "Safe, but past its best", text: `Food kept frozen solid stays safe indefinitely, but after ${months(d)} months expect freezer burn and dull flavour. Fine for soups, sauces and baking; trim dry grey patches.` });
}

/** Counter: perishable foods follow the 2-hour rule; shelf-stable ones use their pantry time. */
export function counterChecks(f: Food): Opt[] | null {
  const name = lc(f);
  const them = itThey(f) === "they" ? "them" : "it";
  const p0 = f.states[0].pantry;
  if (isNum(p0) && p0.unit === "hours") {
    // FoodKeeper's own limit is stricter than the 2-hour rule (prepared baby formula: 1 hour).
    const lim = p0.max, limText = fmt(p0)!;
    return [
      { label: `${lim * 30} min`, tone: "fresh", head: "Use or refrigerate now", text: `Inside the ${limText} limit for ${name}. Use ${them} now or put ${them} straight in the fridge.` },
      { label: limText, tone: "edge", head: "At the limit", text: `${limText} is the USDA FoodKeeper limit for ${name}. If you are not sure exactly how long ${itThey(f)} ${f.plural ? "have" : "has"} been out, throw ${them} away.` },
      { label: `${lim * 2} hours`, tone: "toss", head: "Throw it out", text: `Past the ${limText} limit. Throw ${them} away; do not put ${them} back in the fridge.` },
      { label: "Overnight", tone: "toss", head: "Throw it out", text: `${f.name} left out overnight ${f.plural ? "are" : "is"} far past the ${limText} limit and must be thrown away.` },
    ];
  }
  if (f.perishable)
    return [
      { label: "30 min", tone: "fresh", head: "Refrigerate now", text: `Still inside the 2-hour limit. Put ${them} in the fridge straight away, in a shallow container so ${itThey(f)} ${f.plural ? "cool" : "cools"} quickly.` },
      { label: "1 hour", tone: "fresh", head: "Refrigerate now", text: `Fine at normal room temperature. On a hot day above 32°C (90°F), 1 hour is already the limit, so refrigerate ${them} immediately.` },
      { label: "2 hours", tone: "edge", head: "At the limit", text: `Two hours is the USDA cut-off. If it was warm, or you are not sure exactly how long, throw ${them} out.` },
      { label: "4 hours", tone: "toss", head: "Throw it out", text: `Past the 2-hour limit. Bacteria may have multiplied or produced toxins that reheating will not destroy.` },
      { label: "Overnight", tone: "toss", head: "Throw it out", text: `${f.name} left out overnight ${f.plural ? "have" : "has"} spent many hours in the danger zone (4–60°C / 40–140°F). It may look fine, but it is not safe.` },
    ];
  const r = range(f.states[0].pantry) ?? range(f.states.find((s) => s.pantry && isNum(s.pantry))?.pantry);
  if (!r) return null;
  const [min, max] = r;
  const cands = [7, 30, 90, 180, 365, 730, 1095, 1825];
  const picks = [...cands.filter((d) => d < min).slice(-2), ...cands.filter((d) => d >= min && d <= max).slice(0, 1), ...cands.filter((d) => d > max).slice(0, 2)].slice(0, 5);
  if (picks.length < 3) return null;
  const p = fmt(f.states.find((s) => s.pantry && isNum(s.pantry))!.pantry);
  return picks.map((d) => d < min
    ? { label: label(d), tone: "fresh", head: "Still good", text: `Well inside the ${p} pantry time for ${name}, as long as it has been kept ${shelfStable(f) ? "cool, dry and tightly closed" : "somewhere cool and dry"}.` }
    : d <= max
      ? { label: label(d), tone: "edge", head: "Use it soon", text: `Near the end of the ${p} pantry time. Check the smell and look before using; quality is starting to fade.` }
      : { label: label(d), tone: "edge", head: "Check before using", text: shelfStable(f) ? `Past the ${p} pantry time. Shelf-stable food usually loses quality rather than becoming unsafe: throw it out if you see mould, pests, damp clumps or an off smell.` : `Past the ${p} pantry time. Check closely for soft spots, mould or an off smell, and throw it out if you find any.` });
}

export type Quiz = { q: string; answer: boolean; why: string };
/** Five true-or-false statements per food, all answered from the data. */
export function quizFor(f: Food): Quiz[] {
  const name = lc(f);
  const Name = f.name;
  const s = f.states[0];
  const fr = s.fridge && isNum(s.fridge) ? fmt(s.fridge)! : null;
  const v = freezeVerdict(f);
  const zone = zoneFor(f).zone;
  const out: Quiz[] = [];
  if (fr) out.push({ q: `${Name} ${f.plural ? "are" : "is"} safe to eat after more than ${fr} in the fridge, as long as ${itThey(f)} ${f.plural ? "smell" : "smells"} fine.`, answer: !f.perishable, why: f.perishable ? `False. The bacteria that cause food poisoning rarely change the smell. Stick to the ${fr} window and throw out anything older.` : `Partly true. ${Name} ${f.plural ? "are" : "is"} not high-risk, so a little past ${fr} usually means lower quality, not danger. Check for mould and off smells first.` });
  out.push({ q: `Freezing ${name} kills the bacteria on ${itThey(f) === "they" ? "them" : "it"}.`, answer: false, why: "False. Freezing pauses bacteria; it does not kill them. They become active again as the food thaws, so thaw in the fridge and cook or reheat properly." });
  out.push({ q: `${Name} ${f.plural ? "freeze" : "freezes"} well.`, answer: v.tone === "yes", why: v.tone === "yes" ? `True. ${v.detail}` : v.tone === "no" ? `False. ${v.detail}` : `Only partly. ${v.detail}` });
  out.push({ q: `The fridge door is a good place for ${name}.`, answer: zone === "door", why: zone === "door" ? "True. The door is the warmest part of the fridge, but this food resists spoilage well enough to live there." : `False. The door warms up every time it opens. ${zoneFor(f).why}` });
  out.push(f.perishable
    ? { q: `${Name} left out overnight ${f.plural ? "are" : "is"} fine if you reheat ${itThey(f) === "they" ? "them" : "it"} well.`, answer: false, why: "False. Some bacteria make heat-stable toxins. Reheating kills bacteria but not those toxins, so food left out more than 2 hours should be thrown away." }
    : { q: `${Name} ${f.plural ? "need" : "needs"} to be refrigerated to stay safe.`, answer: false, why: s.pantry ? `False. ${Name} ${f.plural ? "are" : "is"} shelf-stable: ${fmt(s.pantry)!.toLowerCase()} in a cool, dry place. Refrigerating can extend quality for some foods, but it is not needed for safety.` : `Not for safety, but it keeps ${itThey(f) === "they" ? "them" : "it"} at best quality longer. Follow the storage times on this page.` });
  out.push({ q: `How long ${does(f).toLowerCase()} ${name} last? It depends only on the printed date.`, answer: false, why: "False. Count storage time from the day you buy, cook or open the food. The printed best-by date is about quality, and once a package is opened the clock changes." });
  return out.slice(0, 5);
}

/** Spoilage checklist entries (title + what to look for). */
export const checklistFor = (f: Food) => signsFor(f).map((s) => ({ title: s.title, text: s.text }));
