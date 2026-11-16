#!/usr/bin/env node
/**
 * Post-build checks on dist/ (runs after `astro build`; fails the build on errors):
 *  - every internal link points at a built page or file, with a trailing slash
 *  - every indexable page has a unique <title>, a description, a canonical and valid JSON-LD
 *  - sitemaps list exactly the indexable pages
 *  - /calories/ pages carry at least 350 words; /calories/cooked-rice/ has its numbers, storage section and schema
 *  - every api/_redirects.js destination is a built page
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const DIST = new URL("../dist/", import.meta.url).pathname;
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const files = walk(DIST);
const pages = files.filter((f) => f.endsWith(".html"));
const errors = [];
const warn = [];
const titles = new Map();
const relOf = (file) => "/" + relative(DIST, file).replace(/index\.html$/, "");

const exists = (href) => {
  const p = decodeURI(href.split(/[?#]/)[0]);
  if (p === "/") return true;
  const f = join(DIST, p);
  return existsSync(f) && (statSync(f).isFile() || existsSync(join(f, "index.html")));
};

const MIN_WORDS = 350; // EatThisMuch food pages run ~550 words, mostly table labels.
const wordsIn = (html) => {
  const main = (html.match(/<main[\s\S]*?<\/main>/) ?? [html])[0].replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>/g, "");
  return (main.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").match(/[\p{L}\p{N}][\p{L}\p{N}'’–-]*/gu) ?? []).length;
};
let thin = 0, minSeen = Infinity;
const inbound = new Map(); // page → number of other pages linking to it (orphan check)

for (const file of pages) {
  const html = readFileSync(file, "utf8");
  const rel = relOf(file);
  const noindex = /name="robots" content="noindex/.test(html);
  for (const [, href] of html.replace(/<script[\s\S]*?<\/script>/g, "").matchAll(/href="(\/[^"]*)"/g)) {
    if (href.startsWith("//")) continue;
    const target = href.split(/[?#]/)[0];
    if (target !== rel) inbound.set(target, (inbound.get(target) ?? 0) + 1);
    if (!exists(href)) errors.push(`${rel}: broken link ${href}`);
    else if (!/\.[a-z0-9]+$/i.test(href.split(/[?#]/)[0]) && !href.split(/[?#]/)[0].endsWith("/")) errors.push(`${rel}: link without trailing slash ${href}`);
  }
  if (noindex || rel === "/404.html") continue;
  const title = html.match(/<title>(.*?)<\/title>/)?.[1];
  const desc = html.match(/name="description" content="([^"]*)"/)?.[1] ?? "";
  if (!title) errors.push(`${rel}: missing title`);
  else if (titles.has(title)) errors.push(`${rel}: duplicate title with ${titles.get(title)}`);
  else titles.set(title, rel);
  if (!desc) errors.push(`${rel}: missing description`);
  if (!/rel="canonical" href="https:\/\/www\.guntherheller\.com\//.test(html)) errors.push(`${rel}: missing canonical`);
  if (!html.includes("application/ld+json")) errors.push(`${rel}: missing JSON-LD`);
  for (const m of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) {
    try { JSON.parse(m[1]); } catch { errors.push(`${rel}: invalid JSON-LD`); }
  }
  if (rel.startsWith("/calories/")) {
    const n = wordsIn(html);
    minSeen = Math.min(minSeen, n);
    if (n < MIN_WORDS) { thin++; if (thin <= 10) errors.push(`${rel}: only ${n} words (min ${MIN_WORDS})`); }
  }
}
if (thin > 10) errors.push(`…${thin - 10} more pages under ${MIN_WORDS} words`);

// Sitemaps: every listed URL is a built, indexable page; every indexable page is listed.
const listed = new Set();
const idx = readFileSync(join(DIST, "sitemap.xml"), "utf8");
for (const [, loc] of idx.matchAll(/<loc>https:\/\/www\.guntherheller\.com(\/[^<]+)<\/loc>/g)) {
  const xml = readFileSync(join(DIST, loc), "utf8");
  const n = (xml.match(/<url>/g) ?? []).length;
  if (n > 50000 || xml.length > 50 * 1024 * 1024) errors.push(`${loc}: over sitemap limits`);
  for (const [, p] of xml.matchAll(/<loc>https:\/\/www\.guntherheller\.com([^<]+)<\/loc>/g)) {
    listed.add(p);
    if (!exists(p)) errors.push(`${loc}: lists missing page ${p}`);
  }
}
for (const file of pages) {
  const rel = relOf(file);
  const html = readFileSync(file, "utf8");
  if (rel === "/404.html" || /name="robots" content="noindex/.test(html)) continue;
  if (!listed.has(rel)) errors.push(`${rel}: indexable page missing from sitemaps`);
}
for (const f of ["favicon.ico", "favicon.svg", "favicon-96x96.png", "apple-touch-icon.png", "site.webmanifest", "web-app-manifest-512x512.png", "robots.txt", "ads.txt", "sitemap.xml", "og.png", "404.html", "search-index.json", "nutrition-index.json"])
  if (!existsSync(join(DIST, f))) errors.push(`missing ${f}`);

// Interlinking: every indexable page is linked from at least one other page (no orphans).
let orphans = 0;
for (const p of listed) if (p !== "/" && !inbound.get(p)) { orphans++; if (orphans <= 10) errors.push(`${p}: orphan page (no internal links point to it)`); }
const counts = [...listed].map((p) => inbound.get(p) ?? 0).sort((a, b) => a - b);
console.log(`check-build: inbound internal links per page — min ${counts[0]}, median ${counts[counts.length >> 1]}, max ${counts.at(-1)}`);

// Acceptance test: cooked rice (nutrition + FoodKeeper storage on one page).
const rice = readFileSync(join(DIST, "calories/cooked-rice/index.html"), "utf8");
if (!/<title>Cooked Rice Nutrition Facts \(\d+ Calories per [^<]+\)<\/title>/.test(rice)) errors.push("cooked rice: unexpected title");
for (const t of ["Nutrition Facts", "Vitamins and minerals", "How long does cooked rice last?", "4–6 days", "2,000-calorie diet"]) if (!rice.includes(t)) errors.push(`cooked rice: "${t}" missing`);
for (const t of ['"NutritionInformation"', '"BreadcrumbList"', '"FAQPage"', '"Organization"']) if (!rice.includes(t)) errors.push(`cooked rice: JSON-LD ${t} missing`);

// Every 301 in api/_redirects.js lands on a built page (the catch-all handles everything else).
const redirects = Object.entries((await import(new URL("../api/_redirects.js", import.meta.url))).default).map(([source, destination]) => ({ source, destination }));
for (const r of redirects) {
  if (!exists(r.destination)) errors.push(`api/_redirects.js: ${r.source} → missing ${r.destination}`);
  if (exists(r.source) && r.source !== "/") errors.push(`api/_redirects.js: ${r.source} is also a built page`);
}

const css = files.filter((f) => f.endsWith(".css")).reduce((n, f) => n + statSync(f).size, 0);
const inlineCss = 0;
console.log(`check-build: ${pages.length} pages, ${titles.size} unique titles, ${listed.size} sitemap URLs, ${redirects.length} redirects, shortest food page ${minSeen} words, CSS ${(Math.max(css, inlineCss) / 1024).toFixed(1)} KB`);
if (Math.max(css, inlineCss) > 60 * 1024) errors.push("CSS over the 60 KB budget");
warn.slice(0, 10).forEach((w) => console.warn("warn:", w));
if (errors.length) {
  errors.slice(0, 40).forEach((e) => console.error("error:", e));
  console.error(`check-build: ${errors.length} error(s)`);
  process.exit(1);
}
console.log("check-build: ok");
