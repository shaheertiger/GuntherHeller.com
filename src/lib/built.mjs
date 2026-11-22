/**
 * Which foods get a /calories/ page. One rule, shared by src/lib/nutrition.ts (the pages), scripts/build-lastmod.mjs
 * and scripts/check-build.mjs, so they cannot disagree:
 *
 *   - foods with proven Google impressions (data/proven.json), and
 *   - restaurant menu items (owner's decision, Nov 2026): USDA records of a chain in data/chains.json, and items from
 *     a chain's own nutrition guide (data/restaurant-foods.json). Guide items that give per-serving values only (ps)
 *     are kept when people search for them (data/demand.json), as on main.
 *
 * Store-brand products (src "B") are never chain items; they get a page only when proven.
 */
export function chainSlugOf(f, chains) {
  if (f.src === "B") return null;
  if (f.chainSlug) return chains.some((c) => c.slug === f.chainSlug) ? f.chainSlug : null;
  return chains.find((c) => new RegExp(c.match, "i").test(f.desc))?.slug ?? null;
}

/** Restaurant-guide items worth a page (same filter as main): every item with a weight, per-serving ones only when searched. */
export const keepGuideItem = (f, demand) => !f.ps || (demand[f.slug]?.v ?? 0) > 0;

/**
 * @param {{ foods: object[] }} nutrition data/nutrition.json   @param {{ foods: object[] }} branded data/branded.json
 * @param {{ foods: object[] }} restaurant data/restaurant-foods.json   @param {{ foods: Record<string, {v:number}> }} demand
 * @param {{ chains: {slug:string, match:string}[] }} chains   @param {{ foods: Record<string, unknown> }} proven
 * @returns {Set<string>} slugs with a page
 */
export function builtSlugs({ nutrition, branded, restaurant, demand, chains, proven }) {
  const out = new Set();
  const all = [...nutrition.foods, ...branded.foods, ...restaurant.foods.filter((f) => keepGuideItem(f, demand.foods))];
  for (const f of all) if (f.slug in proven.foods || chainSlugOf(f, chains.chains)) out.add(f.slug);
  return out;
}
