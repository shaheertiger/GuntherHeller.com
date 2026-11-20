import { NFOODS, NCATS, RANKINGS, HUB_CHAINS, HUB_STORES, nurl, isIndexable, chainOf, byDemand } from "./nutrition";
import { TOOLS } from "./tools";
import { REVIEWER, personUrl } from "./people";
import { SITE, abs } from "./site";

/** lastmod: the date pages last changed in substance (SITE.updatedISO), not the build date. */
const lastmod = SITE.updatedISO;

// Only indexable food pages are listed (see isIndexable); the other USDA records are noindex.
const indexable = NFOODS.filter(isIndexable).sort(byDemand);
const foods = indexable.filter((f) => f.src !== "B" && !chainOf(f)).map((f) => nurl.food(f));
const CHUNK = 5000;
export const SECTIONS: Record<string, () => string[]> = {
  pages: () => [
    "/", "/food/", ...NCATS.map((c) => nurl.cat(c.slug)), ...RANKINGS.map((r) => nurl.rank(r)),
    nurl.restaurants(), nurl.stores(),
    "/tools/", ...TOOLS.map((t) => `/tools/${t.slug}/`),
    "/methodology/", "/about/", "/editorial-policy/", "/contact/", personUrl(REVIEWER), "/privacy/", "/terms/",
  ],
  restaurants: () => [...HUB_CHAINS.map((c) => nurl.chain(c)), ...indexable.filter((f) => chainOf(f)).map((f) => nurl.food(f))],
  brands: () => [...HUB_STORES.map((s) => nurl.store(s)), ...indexable.filter((f) => f.src === "B").map((f) => nurl.food(f))],
  ...Object.fromEntries(Array.from({ length: Math.ceil(foods.length / CHUNK) }, (_, i) => [`foods-${i + 1}`, () => foods.slice(i * CHUNK, (i + 1) * CHUNK)])),
};

const esc = (s: string) => s.replace(/&/g, "&amp;");
export const urlset = (paths: string[]) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths
    .map((p) => `<url><loc>${esc(abs(p))}</loc><lastmod>${lastmod}</lastmod></url>`)
    .join("\n")}\n</urlset>\n`;

export const index = () =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Object.keys(SECTIONS)
    .map((s) => `<sitemap><loc>${abs(`/sitemap-${s}.xml`)}</loc><lastmod>${lastmod}</lastmod></sitemap>`)
    .join("\n")}\n</sitemapindex>\n`;

/** Flat list of every indexable URL (IndexNow submissions, checks). */
export const allPaths = () => Object.values(SECTIONS).flatMap((f) => f());
