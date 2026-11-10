import { FOODS, CATEGORIES, url, hasFreezePage, hasLeftOutPage } from "./data";
import { TOOLS } from "./tools";
import { SITE, abs } from "./site";
import { figsFor } from "../figures/cards";
import { LOCALES, lurl, foodAlternates, homeAlternates, hasT, hubAlternates, hubIndexAlternates, methodAlternates, type Alt } from "./i18n";

/** lastmod is the date the numbers were last verified — it changes only when data changes. */
const lastmod = SITE.verifiedISO;

export const SECTIONS: Record<string, () => string[]> = {
  foods: () => FOODS.map((f) => url.food(f)),
  questions: () => FOODS.flatMap((f) => [url.bad(f), ...(hasFreezePage(f) ? [url.freeze(f)] : []), ...(hasLeftOutPage(f) ? [url.leftOut(f)] : [])]),
  hubs: () => [
    "/", "/foods/", ...CATEGORIES.flatMap((c) => [url.category(c.slug), ...c.subcategories.map((s) => url.sub(c.slug, s.slug))]),
    "/can-you-freeze/", "/does-it-go-bad/", "/left-out-overnight/", "/tools/", ...TOOLS.map((t) => `/tools/${t.slug}/`),
    "/methodology/", "/about/", "/privacy/", "/terms/",
  ],
  ...Object.fromEntries(
    LOCALES.map((L) => [L.code, () => [lurl.home(L), lurl.hubIndex(L), lurl.method(L), ...CATEGORIES.map((c) => lurl.hub(L, c.slug)), ...FOODS.filter((f) => hasT(L, f)).map((f) => lurl.food(L, f))]]),
  ),
};

/** Every hreflang cluster, indexed by each member's path. */
let clusters: Map<string, Alt[]> | null = null;
/** A page's generated figures (hero first) for the image sitemap. */
function imagesOf(path: string): { loc: string; caption?: string }[] {
  const pf = figsFor(path);
  return pf ? [pf.hero, ...pf.figures].map((c) => ({ loc: c.src, caption: c.alt })) : [];
}
function clusterOf(path: string): Alt[] | undefined {
  if (!clusters) {
    clusters = new Map();
    const add = (alts: Alt[]) => { if (alts.length > 1) for (const a of alts) clusters!.set(a.href, alts); };
    FOODS.forEach((f) => add(foodAlternates(f)));
    CATEGORIES.forEach((c) => add(hubAlternates(c.slug)));
    add(homeAlternates()); add(hubIndexAlternates()); add(methodAlternates());
  }
  return clusters.get(path);
}

const esc = (s: string) => s.replace(/&/g, "&amp;");
export const urlset = (paths: string[]) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${paths
    .map((p) => {
      const alts = clusterOf(p);
      const links = alts ? [...alts.map((a) => `<xhtml:link rel="alternate" hreflang="${a.lang}" href="${esc(abs(a.href))}"/>`), `<xhtml:link rel="alternate" hreflang="x-default" href="${esc(abs(alts[0].href))}"/>`].join("") : "";
      const imgs = imagesOf(p).map((i) => `<image:image><image:loc>${esc(abs(i.loc))}</image:loc></image:image>`).join("");
      return `<url><loc>${esc(abs(p))}</loc><lastmod>${lastmod}</lastmod>${links}${imgs}</url>`;
    })
    .join("\n")}\n</urlset>\n`;

export const index = () =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Object.keys(SECTIONS)
    .map((s) => `<sitemap><loc>${abs(`/sitemap-${s}.xml`)}</loc><lastmod>${lastmod}</lastmod></sitemap>`)
    .join("\n")}\n</sitemapindex>\n`;

/** Flat list of every indexable URL (IndexNow submissions, checks). */
export const allPaths = () => Object.values(SECTIONS).flatMap((f) => f());
