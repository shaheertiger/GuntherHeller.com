import type { APIRoute } from "astro";
import { FOODS, cellsFor, days, isNum, type Dur, hasFreezePage, hasLeftOutPage } from "../lib/data";
import { freezeVerdict } from "../lib/content";

/** Compact index for the home widget, search page and calculators. */
const maxDays = (d: Dur | null) => (isNum(d) ? d.max * ({ hours: 1 / 24, days: 1, weeks: 7, months: 30, years: 365 } as const)[d.unit] : null);

export const GET: APIRoute = () => {
  const rows = FOODS.map((f) => {
    const s = f.states[0];
    const c = cellsFor(f, s, 0);
    const fz = f.states.map((x) => x.freezer).find(Boolean) ?? null;
    return {
      s: f.slug,
      n: f.name,
      k: [...f.keywords, ...f.aliases].join(" "),
      c: c.pantry.value,
      f: c.fridge.value,
      z: c.freezer.value,
      fd: days(s.fridge),
      fx: maxDays(s.fridge),
      zx: maxDays(fz),
      zd: days(fz),
      p: f.perishable ? 1 : 0,
      fv: freezeVerdict(f).tone,
      sl: s.label,
      r: f.rank,
      v: [hasFreezePage(f) ? 1 : 0, hasLeftOutPage(f) ? 1 : 0],
    };
  });
  return new Response(JSON.stringify(rows), { headers: { "content-type": "application/json" } });
};
