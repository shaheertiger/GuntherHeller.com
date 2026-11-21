#!/usr/bin/env node
/**
 * data/proven.json: the foods Google has shown this site for, from a Search Console Performance export.
 *
 *   node scripts/build-proven.mjs path/to/Pages.csv "2026-11-01..2026-11-21"
 *
 * Every page in the export (any host, any language, old shelf-life URLs included) is mapped to its food through
 * data/old-redirects.json (or directly, for /calories/ URLs). The site builds a /calories/ page only for these
 * foods (src/lib/nutrition.ts); every other food URL returns 410 Gone (src/lib/gone.mjs).
 *
 * The Search Console UI exports the top 1,000 pages only (by clicks, then impressions), so a food whose pages had
 * no click and fewer impressions than the last row is not "proven" by this file. Re-run with a fuller export (or the API) to widen it.
 */
import { readFileSync, writeFileSync } from "node:fs";

const [csv, range = ""] = process.argv.slice(2);
if (!csv) { console.error("usage: node scripts/build-proven.mjs Pages.csv [date-range]"); process.exit(1); }
const MAP = JSON.parse(readFileSync(new URL("../data/old-redirects.json", import.meta.url), "utf8"));
const slugs = new Set(["nutrition.json", "branded.json", "restaurant-foods.json"].flatMap((f) => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), "utf8")).foods.map((x) => x.slug)));

const rows = readFileSync(csv, "utf8").trim().split("\n").slice(1).map((l) => {
  const m = l.match(/^"?(.*?)"?,(\d+),(\d+),([^,]*),([^,]*)$/);
  return m && { url: m[1], clicks: +m[2], impressions: +m[3] };
}).filter(Boolean);

const foods = {}, unmapped = [];
for (const r of rows) {
  let p = decodeURIComponent(new URL(r.url).pathname);
  if (!p.endsWith("/")) p += "/";
  const dest = MAP[p] ?? (p.startsWith("/calories/") ? p : null);
  const slug = dest?.match(/^\/calories\/([^/#]+)\//)?.[1];
  if (!slug || !slugs.has(slug)) { unmapped.push({ path: p, impressions: r.impressions }); continue; }
  const f = (foods[slug] ??= { clicks: 0, impressions: 0, pages: 0 });
  f.clicks += r.clicks; f.impressions += r.impressions; f.pages++;
}
const sorted = Object.fromEntries(Object.entries(foods).sort((a, b) => b[1].impressions - a[1].impressions || a[0].localeCompare(b[0])));
// The export is the top 1,000 pages by clicks, then impressions: every page with a click is in it, and zero-click
// pages only down to the impressions of the last row.
const cutoff = Math.min(...rows.filter((r) => !r.clicks).map((r) => r.impressions));
writeFileSync(new URL("../data/proven.json", import.meta.url), JSON.stringify({
  note: "Foods with Google impressions in a Search Console Performance export (top 1,000 pages). Built by scripts/build-proven.mjs; only these foods get a /calories/ page.",
  source: `Search Console Performance export, web search, ${range || "date range not given"}; ${rows.length} pages, zero-click pages included down to ${cutoff} impressions`,
  unmapped,
  foods: sorted,
}, null, 1) + "\n");
console.log(`proven: ${Object.keys(sorted).length} foods from ${rows.length} pages (zero-click cut-off ${cutoff} impressions); ${unmapped.length} pages without a food`);
