import { NFOODS, NCATS, RANKINGS, nurl } from "./nutrition";
import { TOOLS } from "./tools";
import { abs } from "./site";

/** lastmod is the date the data was last rebuilt. */
const lastmod = "2026-11-16";

const foods = NFOODS.map((f) => nurl.food(f));
const CHUNK = 5000;
export const SECTIONS: Record<string, () => string[]> = {
  pages: () => ["/", "/food/", ...NCATS.map((c) => nurl.cat(c.slug)), ...RANKINGS.map((r) => nurl.rank(r)), "/tools/", ...TOOLS.map((t) => `/tools/${t.slug}/`), "/methodology/", "/about/", "/privacy/", "/terms/"],
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
