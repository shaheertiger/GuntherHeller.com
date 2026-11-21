/**
 * What a URL with no built page returns. Shared by the on-demand route (src/pages/[...path].ts) and the post-build
 * check (scripts/check-build.mjs), so the check tests the same rules the site serves.
 *
 *   - an old URL in data/old-redirects.json whose page still exists → 301 there (unchanged)
 *   - an old URL whose destination page was removed                 → 410 (one hop, instead of 301 → 410)
 *   - a removed page: /calories/*, /tools/*, /restaurants/*, /brands/*,
 *     /food/{category}/ pages with no foods left, removed sitemaps     → 410 Gone
 *   - anything else                                                  → 301 to the home page (unchanged)
 *
 * Static pages always win over the on-demand route, so a path only reaches these rules when it has no page.
 *
 * @param {Record<string, string>} map   data/old-redirects.json
 * @param {Set<string>} live             paths that are still built: /calories/{proven slug}/ and the kept /food/ pages
 */
export const GONE_PREFIXES = ["/calories/", "/tools/", "/restaurants/", "/brands/"];
/**
 * /food/ category pages removed: alcohol and fast-food restaurants (none of their foods has proven impressions), beef
 * and pork (owner's decision: they competed with /calories/beef/ and /calories/pork/).
 */
export const GONE_FOOD_PAGES = ["/food/alcohol/", "/food/fast-food-restaurants/", "/food/beef/", "/food/pork/"];
/** Sitemaps of removed sections. */
export const GONE_FILES = ["/sitemap-restaurants.xml", "/sitemap-brands.xml"];

export function makeResolver(map, live) {
  const isLive = (dest) => {
    const p = dest.split("#")[0];
    if (p.startsWith("/calories/") || (p.startsWith("/food/") && p !== "/food/")) return live.has(p);
    return true;
  };
  return (pathname) => {
    if (GONE_FILES.includes(pathname)) return { status: 410 };
    let p = pathname.endsWith("/") ? pathname : pathname + "/";
    let dest = map[p];
    if (!dest) try { dest = map[decodeURIComponent(p)]; } catch {}
    if (dest) return isLive(dest) ? { status: 301, location: dest } : { status: 410 };
    if (GONE_PREFIXES.some((x) => p.startsWith(x)) || GONE_FOOD_PAGES.includes(p)) return { status: 410 };
    return { status: 301, location: "/" };
  };
}
