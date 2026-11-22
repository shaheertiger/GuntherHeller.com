import { NFOODS, NCATS, RANKINGS, HUB_CHAINS, nurl, byDemand, chainOf } from "./nutrition";
import { REVIEWER, personUrl } from "./people";
import { abs } from "./site";
import { lastmodOf } from "./lastmod";

/**
 * Sitemaps list every built, indexable page with the date its own content last changed (src/lib/lastmod.ts), never
 * a site-wide date. The index lists each sitemap with the newest date of the pages in it.
 */
const foods = [...NFOODS].filter((f) => !chainOf(f)).sort(byDemand).map((f) => nurl.food(f));
const CHUNK = 5000;
export const SECTIONS: Record<string, () => string[]> = {
  pages: () => [
    "/", "/food/", ...NCATS.map((c) => nurl.cat(c.slug)), ...RANKINGS.map((r) => nurl.rank(r)),
    "/methodology/", "/about/", "/editorial-policy/", "/contact/", personUrl(REVIEWER), "/privacy/", "/terms/",
  ],
  restaurants: () => [nurl.restaurants(), ...HUB_CHAINS.map((c) => nurl.chain(c)), ...[...NFOODS].filter((f) => chainOf(f)).sort(byDemand).map((f) => nurl.food(f))],
  ...Object.fromEntries(Array.from({ length: Math.ceil(foods.length / CHUNK) }, (_, i) => [`foods-${i + 1}`, () => foods.slice(i * CHUNK, (i + 1) * CHUNK)])),
};

const esc = (s: string) => s.replace(/&/g, "&amp;");
export const urlset = (paths: string[]) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths
    .map((p) => `<url><loc>${esc(abs(p))}</loc><lastmod>${lastmodOf(p)}</lastmod></url>`)
    .join("\n")}\n</urlset>\n`;

const newestOf = (paths: string[]) => paths.map(lastmodOf).reduce((a, b) => (b > a ? b : a), "");
export const index = () =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Object.entries(SECTIONS)
    .map(([s, f]) => `<sitemap><loc>${abs(`/sitemap-${s}.xml`)}</loc><lastmod>${newestOf(f())}</lastmod></sitemap>`)
    .join("\n")}\n</sitemapindex>\n`;

/** Flat list of every indexable URL (checks). */
export const allPaths = () => Object.values(SECTIONS).flatMap((f) => f());
