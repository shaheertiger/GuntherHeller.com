#!/usr/bin/env node
/**
 * Post-build checks on dist/ (runs after `astro build`; fails the build on errors).
 *
 * Site-wide
 *  - every internal link points at a built page or file, with a trailing slash; no indexable page is an orphan
 *  - every indexable page has a unique <title>, a description, a canonical and valid JSON-LD
 *
 * /calories/ pages
 *  - no title, H1 or H2 mentions shelf life ("last", "expire", "go bad", "fridge", "shelf life"); no storage section
 *  - calories for at least one real serving and for 100 g, equal to the data (data/*.json); a food may show 100 g
 *    only when USDA lists no household measure for it
 *  - no empty sections and no table row with only zeros or dashes
 *  - Article (datePublished/dateModified = data/lastmod.json), BreadcrumbList and FAQPage; no stray
 *    NutritionInformation (only valid inside Recipe or MenuItem)
 *  - 5 pages match USDA FoodData Central (seo/usda-spotcheck.json, fetched by scripts/usda-spotcheck.mjs)
 *
 * Sitemaps
 *  - list every /calories/ page, the hubs and trust pages, and nothing noindex; every URL has a lastmod; the
 *    lastmods are not all one date; each index entry's lastmod is the newest date in that sitemap
 *
 * URLs
 *  - every URL that existed on main (seo/urls-main.txt) is still built, or returns 410 by the rules in
 *    src/lib/gone.mjs (a deliberate removal). None returns a new 404 or 301.
 *  - every old redirect (data/old-redirects.json) still 301s to a built page, or 410s because its page was removed
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { makeResolver, GONE_FOOD_PAGES, GONE_PREFIXES, GONE_FILES } from "../src/lib/gone.mjs";
import { builtSlugs } from "../src/lib/built.mjs";

const ROOT = new URL("../", import.meta.url);
const json = (p) => JSON.parse(readFileSync(new URL(p, ROOT), "utf8"));
// With the Vercel adapter, prerendered pages land in dist/client/.
const DIST = new URL(existsSync(new URL("dist/client/", ROOT)) ? "dist/client/" : "dist/", ROOT).pathname;
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const files = walk(DIST);
const pages = files.filter((f) => f.endsWith(".html"));
const errors = [];
const err = (m) => errors.push(m);
const titles = new Map();
const relOf = (file) => "/" + relative(DIST, file).replace(/index\.html$/, "");
const htmlOf = new Map(pages.map((f) => [relOf(f), readFileSync(f, "utf8")]));
const isNoindex = (html) => /name="robots" content="noindex/.test(html);

const exists = (href) => {
  const p = decodeURI(href.split(/[?#]/)[0]);
  if (p === "/") return true;
  const f = join(DIST, p);
  return existsSync(f) && (statSync(f).isFile() || existsSync(join(f, "index.html")));
};
const text = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>/g, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&#x27;/g, "'").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
const wordsIn = (html) => (text((html.match(/<main[\s\S]*?<\/main>/) ?? [html])[0]).match(/[\p{L}\p{N}][\p{L}\p{N}'’–-]*/gu) ?? []).length;

/* ---------------------------------------------------------------- site-wide */
const inbound = new Map();
for (const [rel, html] of htmlOf) {
  for (const [, href] of html.replace(/<script[\s\S]*?<\/script>/g, "").matchAll(/href="(\/[^"]*)"/g)) {
    if (href.startsWith("//")) continue;
    const target = href.split(/[?#]/)[0];
    if (target !== rel) inbound.set(target, (inbound.get(target) ?? 0) + 1);
    if (!exists(href)) err(`${rel}: broken link ${href}`);
    else if (!/\.[a-z0-9]+$/i.test(target) && !target.endsWith("/")) err(`${rel}: link without trailing slash ${href}`);
  }
  if (isNoindex(html) || rel === "/404.html") continue;
  const title = html.match(/<title>(.*?)<\/title>/)?.[1];
  if (!title) err(`${rel}: missing title`);
  else if (titles.has(title)) err(`${rel}: duplicate title with ${titles.get(title)}`);
  else titles.set(title, rel);
  if (!html.match(/name="description" content="([^"]*)"/)?.[1]) err(`${rel}: missing description`);
  if (!/rel="canonical" href="https:\/\/www\.guntherheller\.com\//.test(html)) err(`${rel}: missing canonical`);
  if (!html.includes("application/ld+json")) err(`${rel}: missing JSON-LD`);
  for (const m of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) { try { JSON.parse(m[1]); } catch { err(`${rel}: invalid JSON-LD`); } }
}

/* ---------------------------------------------------------------- /calories/ pages */
const FOODS = new Map(["data/nutrition.json", "data/branded.json", "data/restaurant-foods.json"].flatMap((p) => json(p).foods).map((f) => [f.slug, f]));
const LASTMOD = json("data/lastmod.json");
const DEEP = json("data/deep-pages.json");
const deepSeen = [];
const BANNED = /\blasts?\b|expire|go(es)? bad|fridge|shelf[- ]life/i;
// Same rules as servings() in src/lib/nutrition.ts: a household measure counts if it has a weight, starts with a
// number and is not one nobody uses at home.
const ODD_SERVING = /school|linear inch|guide amount|as purchased|recipe|batch|\bpan\b/i;
const hasHouseholdServing = (f) => f.p.some(([l, g, nw]) => !nw && g && !ODD_SERVING.test(l) && /^[\d½¼¾⅓⅔.\/]+\s/.test(l.replace(/\s*\(.*\)\s*/g, " ").replace(/,.*$/, "").trim()) && !/\bg$/.test(l.replace(/\s*\(.*\)\s*/g, " ").replace(/,.*$/, "").trim()));
const ZEROISH = /^(0|0\.0+)?\s*(g|mg|µg|kcal|%)?$|^[–—-]$|^<?0(\.0+)?\s*(g|mg|µg)$/;
const calPages = [...htmlOf.keys()].filter((p) => /^\/calories\/[^/]+\/$/.test(p));
let onlyHundred = [], words = [];
for (const rel of calPages) {
  const html = htmlOf.get(rel);
  const slug = rel.split("/")[2];
  const f = FOODS.get(slug);
  if (!f) { err(`${rel}: no data entry for ${slug}`); continue; }
  if (isNoindex(html)) err(`${rel}: /calories/ page is noindex`);
  words.push(wordsIn(html));
  const main = (html.match(/<main[\s\S]*?<\/main>/) ?? [html])[0];

  // Headings stay on topic.
  const heads = [["title", html.match(/<title>(.*?)<\/title>/)?.[1] ?? ""], ...[...main.matchAll(/<(h1|h2)[^>]*>([\s\S]*?)<\/\1>/g)].map((m) => [m[1], text(m[2])])];
  for (const [tag, t] of heads) if (BANNED.test(t)) err(`${rel}: ${tag} mentions shelf life: "${t}"`);
  if (/id="storage"|FoodKeeper/.test(main)) err(`${rel}: still carries storage content`);

  // Calories by serving, from the data.
  const table = main.match(/<table class="dtable serv-table">([\s\S]*?)<\/table>/)?.[1];
  if (!table) { err(`${rel}: no serving table`); continue; }
  // A row may name its own record (data-slug, data-g): deep pages show several USDA records side by side. Each row
  // is checked against the record it names; rows without one belong to the page's own record.
  const rows = [...table.matchAll(/<tr([^>]*)><th scope="row">([\s\S]*?)<\/th><td class="num"><b>(\d+)<\/b><\/td>/g)].map((m) => {
    const rs = m[1].match(/data-slug="([^"]+)"/)?.[1], g = m[1].match(/data-g="([\d.]+)"/)?.[1];
    return { label: text(m[2]), kcal: +m[3], rec: rs ? FOODS.get(rs) : f, g: g ? +g : null, named: !!rs };
  });
  for (const r of rows) if (!r.rec) err(`${rel}: serving "${r.label}" names an unknown record`);
  if (f.ps) {
    // A chain-guide item with values per serving only (no weight): one row, the guide's serving, no 100 g row.
    if (rows.length !== 1 || rows[0].label === "100 g" || rows[0].kcal !== Math.round(f.v.kcal)) err(`${rel}: per-serving item should show one serving row with ${Math.round(f.v.kcal)} kcal`);
    if (/\b100 g\b/.test(text(main))) err(`${rel}: per-serving item mentions 100 g`);
  }
  const hundred = rows.find((r) => r.label === "100 g");
  if (f.ps) {} else if (!hundred) err(`${rel}: no 100 g row`);
  else if (hundred.rec && hundred.kcal !== Math.round(hundred.rec.v.kcal)) err(`${rel}: 100 g shows ${hundred.kcal} kcal, data (${hundred.rec.slug}) has ${hundred.rec.v.kcal}`);
  const real = rows.filter((r) => r.label !== "100 g" && !f.ps && r.rec);
  for (const r of real) {
    const g = r.g ?? +r.label.match(/\(([\d.]+) g\)$/)?.[1];
    if (!g) { err(`${rel}: serving "${r.label}" has no weight`); continue; }
    if (g !== 100 || !r.named) {
      const portion = r.rec.p.find(([, w, nw]) => !nw && Math.abs(w - g) < 0.051);
      if (!portion) err(`${rel}: serving "${r.label}" (${g} g) is not a USDA measure of ${r.rec.slug}`);
    }
    if (Math.abs(r.kcal - (r.rec.v.kcal * g) / 100) > 0.5) err(`${rel}: "${r.label}" shows ${r.kcal} kcal, ${r.rec.slug} gives ${((r.rec.v.kcal * g) / 100).toFixed(1)}`);
  }
  if (!real.length && !f.ps) { if (hasHouseholdServing(f)) err(`${rel}: data has a household serving but the page shows 100 g only`); else onlyHundred.push(slug); }

  // The 10 deep pages: the first sentence is the answer (a number and "calories"). No word cap (owner, 24 Nov 2026).
  const deep = slug in DEEP.pages;
  const n = wordsIn(html);
  if (deep) {
    deepSeen.push(slug);
    const first = text(main.match(/<p class="food-answer">([\s\S]*?)<\/p>/)?.[1] ?? "").split(/(?<=\.)\s/)[0];
    if (!/\d/.test(first) || !/\bcalories\b/.test(first)) err(`${rel}: first sentence does not give the calories: "${first}"`);
  }

  // No empty sections, no rows of zeros or dashes.
  for (const m of main.matchAll(/<section[^>]*>([\s\S]*?)<\/section>/g)) {
    const body = m[1].replace(/<h2[\s\S]*?<\/h2>/, "");
    if (!/<(tr|li|p)\b/.test(body) || !text(body)) err(`${rel}: empty section ${m[0].match(/aria-labelledby="([^"]+)"/)?.[1] ?? ""}`);
  }
  // A zero-calorie food's serving rows are allowed to read 0: that is the answer to the page's question.
  for (const m of (f.v.kcal === 0 ? main.replace(/<table class="dtable serv-table">[\s\S]*?<\/table>/, "") : main).matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cells = [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => text(c[1]));
    if (cells.length && cells.every((c) => ZEROISH.test(c))) err(`${rel}: row with only zeros or dashes: ${text(m[1]).slice(0, 60)}`);
  }

  // Structured data.
  const graph = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].flatMap((m) => { try { const j = JSON.parse(m[1]); return j["@graph"] ?? [j]; } catch { return []; } });
  const art = graph.find((x) => x["@type"] === "Article");
  const d = LASTMOD.foods[slug];
  if (!art) err(`${rel}: no Article JSON-LD`);
  else if (!d || art.datePublished !== d.published || art.dateModified !== d.modified) err(`${rel}: Article dates ${art.datePublished}/${art.dateModified} differ from data/lastmod.json`);
  for (const t of ["BreadcrumbList", "FAQPage"]) if (!graph.some((x) => x["@type"] === t)) err(`${rel}: no ${t} JSON-LD`);
  if (graph.some((x) => x["@type"] === "NutritionInformation")) err(`${rel}: top-level NutritionInformation (only valid inside Recipe/MenuItem)`);
}
words.sort((a, b) => a - b);
for (const rel of calPages) if (wordsIn(htmlOf.get(rel)) < 120) err(`${rel}: under 120 words: broken page?`);

// USDA spot-check: the page's 100 g row against FoodData Central itself.
const SPOT = json("seo/usda-spotcheck.json");
const fmtN = (x) => { if (x === 0) return "0"; const a = Math.abs(x); const n = a >= 10 ? Math.round(x).toString() : a >= 0.1 ? (+x.toFixed(1)).toString() : (+x.toFixed(2)).toString(); return n === "0" ? "<0.1" : n; };
for (const [slug, s] of Object.entries(SPOT.foods)) {
  const html = htmlOf.get(`/calories/${slug}/`);
  if (!html) { err(`spot-check: /calories/${slug}/ not built`); continue; }
  const row = html.match(/<tr[^>]*><th scope="row">100 g<\/th>([\s\S]*?)<\/tr>/)?.[1];
  const head = html.match(/<table class="dtable serv-table">[\s\S]*?<thead>([\s\S]*?)<\/thead>/)?.[1] ?? "";
  if (!row) { err(`spot-check ${slug}: no 100 g row`); continue; }
  const cols = [...head.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((m) => text(m[1]).toLowerCase()).slice(1);
  const vals = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => text(m[1]));
  const got = Object.fromEntries(cols.map((c, i) => [c, vals[i]]));
  if (Math.abs(+got.calories - s.per100g.kcal) > 1) err(`spot-check ${slug}: ${got.calories} kcal per 100 g, USDA FDC ${s.fdcId} has ${s.per100g.kcal}`);
  for (const k of ["protein", "carbs", "fat"]) {
    if (s.per100g[k] == null) continue;
    const want = `${fmtN(s.per100g[k])} g`;
    if (got[k] !== want) err(`spot-check ${slug}: ${k} ${got[k]} per 100 g, USDA FDC ${s.fdcId} has ${want}`);
  }
}

/* ---------------------------------------------------------------- sitemaps */
const listed = new Map(); // path → lastmod
const idx = readFileSync(join(DIST, "sitemap.xml"), "utf8");
for (const [, loc, mod] of idx.matchAll(/<sitemap><loc>https:\/\/www\.guntherheller\.com(\/[^<]+)<\/loc><lastmod>([^<]+)<\/lastmod><\/sitemap>/g)) {
  const xml = readFileSync(join(DIST, loc), "utf8");
  if ((xml.match(/<url>/g) ?? []).length > 50000) err(`${loc}: over sitemap limits`);
  let newest = "";
  for (const m of xml.matchAll(/<url><loc>https:\/\/www\.guntherheller\.com([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?<\/url>/g)) {
    const [, p, lm] = m;
    if (!lm) err(`${loc}: ${p} has no lastmod`);
    listed.set(p, lm);
    if (lm > newest) newest = lm;
    if (!exists(p)) err(`${loc}: lists missing page ${p}`);
    else if (htmlOf.has(p) && isNoindex(htmlOf.get(p))) err(`${loc}: lists noindex page ${p}`);
  }
  if (mod !== newest) err(`sitemap.xml: ${loc} lastmod ${mod}, newest page in it is ${newest}`);
}
if ((idx.match(/<sitemap>/g) ?? []).length !== (idx.match(/<lastmod>/g) ?? []).length) err("sitemap.xml: an entry has no lastmod");
for (const [rel, html] of htmlOf) if (rel !== "/404.html" && !isNoindex(html) && !listed.has(rel)) err(`${rel}: indexable page missing from sitemaps`);
for (const p of ["/", "/food/", "/restaurants/", "/about/", "/methodology/", "/editorial-policy/", "/contact/", "/authors/karman-meyer/"]) if (!listed.has(p)) err(`sitemaps: ${p} missing`);
const distinct = new Set(listed.values());
if (distinct.size < 2) err(`sitemaps: every URL has the same lastmod (${[...distinct][0]})`);
let orphans = 0;
for (const p of listed.keys()) if (p !== "/" && !inbound.get(p)) { orphans++; if (orphans <= 10) err(`${p}: orphan page (no internal links point to it)`); }

for (const f of ["favicon.ico", "favicon.svg", "favicon-96x96.png", "apple-touch-icon.png", "site.webmanifest", "web-app-manifest-512x512.png", "robots.txt", "ads.txt", "sitemap.xml", "og.png", "404.html", "nutrition-index.json"])
  if (!existsSync(join(DIST, f))) err(`missing ${f}`);

/* ---------------------------------------------------------------- URLs from main, old redirects */
const MAP = json("data/old-redirects.json");
// The live set as the on-demand route builds it (proven foods + every /food/ page not removed). The route does not
// know restaurant items; that is safe as long as no old redirect points at one (checked below).
const proven = new Set(Object.keys(json("data/proven.json").foods).map((s) => `/calories/${s}/`));
const live = { has: (p) => (p.startsWith("/calories/") ? proven.has(p) : !GONE_FOOD_PAGES.includes(p)) };
// Built food pages = src/lib/built.mjs, exactly.
const BUILT = new Set([...builtSlugs({ nutrition: json("data/nutrition.json"), branded: json("data/branded.json"), restaurant: json("data/restaurant-foods.json"), demand: json("data/demand.json"), chains: json("data/chains.json"), proven: json("data/proven.json") })].map((s) => `/calories/${s}/`));
for (const p of BUILT) if (!htmlOf.has(p)) err(`${p}: should have a page (src/lib/built.mjs) but was not built`);
for (const p of calPages) if (!BUILT.has(p)) err(`${p}: built but src/lib/built.mjs does not give it a page`);
for (const [src, dest] of Object.entries(json("data/old-redirects.json"))) { const d = dest.split("#")[0]; if (d.startsWith("/calories/") && BUILT.has(d) && !proven.has(d)) err(`data/old-redirects.json: ${src} points at ${d}, which the on-demand route does not know is live`); }
for (const p of GONE_FOOD_PAGES) if (htmlOf.has(p)) err(`${p}: listed as removed in src/lib/gone.mjs but still built`);
const resolve = makeResolver(MAP, live);
const builtPath = (p) => htmlOf.has(p) || (p !== "/" && existsSync(join(DIST, p)) && statSync(join(DIST, p)).isFile());
const mainUrls = readFileSync(new URL("seo/urls-main.txt", ROOT), "utf8").trim().split("\n");
const removed = {};
for (const p of mainUrls) {
  if (builtPath(p)) continue;
  const r = resolve(p);
  if (r.status !== 410) { err(`${p}: existed on main, now returns ${r.status}${r.location ? ` → ${r.location}` : ""}`); continue; }
  const k = GONE_FILES.includes(p) ? "removed sitemaps" : GONE_FOOD_PAGES.includes(p) ? "removed /food/ categories" : GONE_PREFIXES.find((x) => p.startsWith(x)) + "*";
  removed[k] = (removed[k] ?? 0) + 1;
}
let r301 = 0, r410 = 0;
for (const [src, dest] of Object.entries(MAP)) {
  if (builtPath(src) && src !== "/") err(`data/old-redirects.json: ${src} is also a built page`);
  const r = resolve(src);
  if (r.status === 301) { r301++; if (!builtPath(dest.split("#")[0])) err(`data/old-redirects.json: ${src} 301s to missing ${dest}`); }
  else { r410++; if (builtPath(dest.split("#")[0])) err(`data/old-redirects.json: ${src} returns 410 but ${dest} is built`); }
}

/* ---------------------------------------------------------------- report */
const css = files.filter((f) => f.endsWith(".css")).reduce((n, f) => n + statSync(f).size, 0);
if (css > 60 * 1024) err("CSS over the 60 KB budget");
const reviewedData = json("data/reviewed.json");
for (const [rel, html] of htmlOf) if ((/(Reviewed|Checked) by <a/.test(html) || /"reviewedBy"/.test(html)) && !(reviewedData.pages[rel] ?? reviewedData.site)) err(`${rel}: shows a review that data/reviewed.json does not list`);
// A review date shown on a page must not be earlier than the page's content date ("Updated").
for (const [rel, html] of htmlOf) {
  const shown = html.match(/data-reviewed="([\d-]+)"/)?.[1], updated = html.match(/Updated <time datetime="([\d-]+)"/)?.[1];
  if (shown && updated && shown < updated) err(`${rel}: review date ${shown} is earlier than its content date ${updated}`);
  if (/Checked by <a/.test(html) && !reviewedData.pages[rel]) err(`${rel}: "Checked by" without a per-page review in data/reviewed.json`);
}
for (const s of Object.keys(DEEP.pages)) if (!deepSeen.includes(s)) err(`data/deep-pages.json: /calories/${s}/ was not built as a deep page`);

console.log(`check-build: ${pages.length} pages, ${titles.size} unique titles, ${listed.size} sitemap URLs (${distinct.size} distinct lastmod dates), ${calPages.length} calorie pages (words min ${words[0]}, median ${words[words.length >> 1]})`);
console.log(`check-build: ${onlyHundred.length} calorie pages show 100 g only because USDA lists no household measure${onlyHundred.length ? `: ${onlyHundred.join(", ")}` : ""}`);
console.log(`check-build: of ${mainUrls.length} URLs on main, ${mainUrls.filter(builtPath).length} still built; 410 Gone: ${JSON.stringify(removed)}`);
console.log(`check-build: old redirects: ${r301} still 301, ${r410} now 410 (their page was removed)`);
console.log(`check-build: USDA spot-check (${Object.keys(SPOT.foods).join(", ")}) against FDC data fetched ${SPOT.fetched}`);
if (errors.length) {
  errors.slice(0, 40).forEach((e) => console.error("error:", e));
  console.error(`check-build: ${errors.length} error(s)`);
  process.exit(1);
}
console.log("check-build: ok");
