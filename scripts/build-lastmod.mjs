#!/usr/bin/env node
/**
 * data/lastmod.json: when each page's own content last changed, from git history (sitemap <lastmod>, Article
 * datePublished/dateModified, the "Updated" date in the byline). Layout and template changes do not count.
 *
 *   node scripts/build-lastmod.mjs      (run it in the commit that changes a food's data)
 *
 * Food pages (/calories/{slug}/): every commit that touched one of the data files below is read, and the food's own
 * entries are compared with the previous commit. published = the first commit with a nutrition entry for the food
 * (the day its /calories/ page appeared); modified = the last commit that changed any of its entries, never earlier
 * than published.
 *   - data/nutrition.json, data/branded.json, data/restaurant-foods.json  (the numbers; keyed by slug)
 *   - data/overrides.json content[storage slug], data/ask.json[storage slug]
 *   - data/reviewed.json pages["/calories/{slug}/"]                  (a page's own review; the site-wide date is not per page)
 * Other pages: the last commit that changed their source file (uncommitted edits count as today).
 * Hubs (/food/…, home) are not listed here: their lastmod is the newest date of the foods they list (src/lib/lastmod.ts).
 *
 * Commits are dated by author date in UTC.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { builtSlugs } from "../src/lib/built.mjs";

const git = (...a) => execFileSync("git", a, { encoding: "utf8", maxBuffer: 1 << 30 });
const FILES = ["data/nutrition.json", "data/branded.json", "data/restaurant-foods.json", "data/overrides.json", "data/ask.json", "data/reviewed.json"];
const commits = git("log", "--reverse", "--format=%H %aI", "--", ...FILES).trim().split("\n").map((l) => {
  const [h, iso] = l.split(" ");
  return { h, day: new Date(iso).toISOString().slice(0, 10) };
});

// A file that did not exist yet at that commit is simply absent.
const show = (h, f) => { try { return JSON.parse(execFileSync("git", ["show", `${h}:${f}`], { encoding: "utf8", maxBuffer: 1 << 30, stdio: ["ignore", "pipe", "ignore"] })); } catch { return null; } };
const prev = new Map(); // slug → serialized entries
const out = {};
function apply(day, read) {
  const nut = [read("data/nutrition.json"), read("data/branded.json"), read("data/restaurant-foods.json")].flatMap((x) => x?.foods ?? []);
  const over = read("data/overrides.json")?.content ?? {};
  const ask = read("data/ask.json") ?? {};
  const rev = read("data/reviewed.json")?.pages ?? {};
  for (const f of nut) {
    const key = JSON.stringify([f, f.storage ? over[f.storage] ?? null : null, f.storage ? ask[f.storage] ?? null : null, rev[`/calories/${f.slug}/`] ?? null]);
    const o = (out[f.slug] ??= { published: day, modified: day });
    if (prev.has(f.slug) && prev.get(f.slug) !== key) o.modified = day;
    prev.set(f.slug, key);
  }
}
for (const { h, day } of commits) {
  const changed = new Set(git("show", "--name-only", "--format=", h).trim().split("\n"));
  if (FILES.some((f) => changed.has(f))) apply(day, (f) => show(h, f));
}

// Uncommitted data edits count as today (run this script in the commit that makes them).
const dirty = new Set(git("status", "--porcelain").split("\n").map((l) => l.slice(3).trim()).filter(Boolean));
const today = new Date().toISOString().slice(0, 10);
if (FILES.some((f) => dirty.has(f))) apply(today, (f) => (existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null));

// Non-food pages: last change to any of the page's source files.
const fileDay = (f) => (dirty.has(f) ? today : new Date(git("log", "-1", "--format=%aI", "--", f).trim()).toISOString().slice(0, 10));
const filesDay = (fs) => fs.filter(existsSync).map(fileDay).sort().at(-1);
const PAGES = {
  "/methodology/": ["src/pages/methodology.astro"], "/about/": ["src/pages/about.astro"], "/editorial-policy/": ["src/pages/editorial-policy.astro"],
  "/contact/": ["src/pages/contact.astro"], "/authors/karman-meyer/": ["src/pages/authors/karman-meyer.astro", "src/lib/people.ts"],
  "/privacy/": ["src/pages/privacy.astro"], "/terms/": ["src/pages/terms.astro"],
};
const pages = Object.fromEntries(Object.entries(PAGES).map(([p, fs]) => [p, filesDay(fs)]));

// Only foods that get a page (src/lib/built.mjs).
const j = (f) => JSON.parse(readFileSync(f, "utf8"));
const built = builtSlugs({ nutrition: j("data/nutrition.json"), branded: j("data/branded.json"), restaurant: j("data/restaurant-foods.json"), demand: j("data/demand.json"), chains: j("data/chains.json"), proven: j("data/proven.json") });
const sorted = Object.fromEntries(Object.entries(out).filter(([s]) => built.has(s)).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(new URL("../data/lastmod.json", import.meta.url), JSON.stringify({ note: "Built by scripts/build-lastmod.mjs from git history; do not edit by hand.", pages, foods: sorted }) + "\n");
const days = {};
for (const v of Object.values(sorted)) days[v.modified] = (days[v.modified] ?? 0) + 1;
console.log(`lastmod: ${Object.keys(sorted).length} foods over ${commits.length} commits; modified dates:`, days, "pages:", pages);
