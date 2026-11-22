/**
 * Real dates per page (data/lastmod.json, built from git history by scripts/build-lastmod.mjs). Used for the sitemap
 * <lastmod>, Article datePublished/dateModified and the byline's "Updated" date. Template changes never move them.
 */
import raw from "../../data/lastmod.json";
import { NFOODS, ncat, foodsInCat, ranked, RANKINGS, HUB_CHAINS, chainItems, chainOf, type NFood } from "./nutrition";

const DATA = raw as { pages: Record<string, string>; foods: Record<string, { published: string; modified: string }> };
const newest = (dates: string[]) => dates.reduce((a, b) => (b > a ? b : a), "");

export const foodDates = (f: { slug: string }) => {
  const d = DATA.foods[f.slug];
  if (!d) throw new Error(`data/lastmod.json has no dates for ${f.slug}: run node scripts/build-lastmod.mjs`);
  return d;
};
const foodsModified = (list: NFood[]) => newest(list.map((f) => foodDates(f).modified));

/** lastmod of any built, indexable path. */
export function lastmodOf(path: string): string {
  if (path.startsWith("/calories/")) return foodDates({ slug: path.split("/")[2] }).modified;
  if (DATA.pages[path]) return DATA.pages[path];
  if (path === "/" || path === "/food/") return foodsModified(NFOODS);
  if (path === "/restaurants/") return foodsModified(NFOODS.filter((f) => chainOf(f)));
  if (path.startsWith("/restaurants/")) return foodsModified(chainItems(HUB_CHAINS.find((c) => c.slug === path.split("/")[2])!));
  const slug = path.split("/")[2];
  const rank = RANKINGS.find((r) => r.slug === slug);
  if (rank) return foodsModified(ranked(rank));
  if (path.startsWith("/food/")) return foodsModified(foodsInCat(ncat(slug).slug));
  throw new Error(`no lastmod rule for ${path}`);
}
