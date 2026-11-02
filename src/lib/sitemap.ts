import { FOODS, CATEGORIES, url, hasFreezePage, hasLeftOutPage } from "./data";
import { TOOLS } from "./tools";
import { SITE, abs } from "./site";

/** lastmod is the date the numbers were last verified — it changes only when data changes. */
const lastmod = SITE.verifiedISO;
export const SECTIONS = {
  foods: () => FOODS.map((f) => url.food(f)),
  questions: () => FOODS.flatMap((f) => [url.bad(f), ...(hasFreezePage(f) ? [url.freeze(f)] : []), ...(hasLeftOutPage(f) ? [url.leftOut(f)] : [])]),
  hubs: () => [
    "/", "/foods/", ...CATEGORIES.flatMap((c) => [url.category(c.slug), ...c.subcategories.map((s) => url.sub(c.slug, s.slug))]),
    "/can-you-freeze/", "/does-it-go-bad/", "/left-out-overnight/", "/tools/", ...TOOLS.map((t) => `/tools/${t.slug}/`),
    "/methodology/", "/about/", "/privacy/", "/terms/",
  ],
};
export type Section = keyof typeof SECTIONS;

export const urlset = (paths: string[]) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths
    .map((p) => `<url><loc>${abs(p)}</loc><lastmod>${lastmod}</lastmod></url>`)
    .join("\n")}\n</urlset>\n`;

export const index = () =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${(Object.keys(SECTIONS) as Section[])
    .map((s) => `<sitemap><loc>${abs(`/sitemap-${s}.xml`)}</loc><lastmod>${lastmod}</lastmod></sitemap>`)
    .join("\n")}\n</sitemapindex>\n`;
