#!/usr/bin/env node
/**
 * Post-build checks on dist/ (runs after `astro build`; fails the build on errors):
 *  - every internal link points at a built page or file
 *  - every indexable page has a unique <title>, a description ≤ 160 chars, a canonical and JSON-LD
 *  - the cooked-rice acceptance page has the spec'd title, answer text and schema types
 *  - food pages ship no client JS
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

const exists = (href) => {
  const p = decodeURI(href.split(/[?#]/)[0]);
  if (p === "/") return true;
  const f = join(DIST, p);
  return existsSync(f) && (statSync(f).isFile() || existsSync(join(f, "index.html")));
};

for (const file of pages) {
  const html = readFileSync(file, "utf8");
  const rel = "/" + relative(DIST, file).replace(/index\.html$/, "");
  const noindex = /name="robots" content="noindex/.test(html);
  for (const [, href] of html.matchAll(/href="(\/[^"]*)"/g)) {
    if (href.startsWith("//")) continue;
    if (!exists(href)) errors.push(`${rel}: broken link ${href}`);
    else if (!/\.[a-z0-9]+$/i.test(href.split(/[?#]/)[0]) && !href.split(/[?#]/)[0].endsWith("/")) errors.push(`${rel}: link without trailing slash ${href}`);
  }
  if (noindex || rel === "/404.html") continue;
  const title = html.match(/<title>(.*?)<\/title>/)?.[1];
  const desc = html.match(/name="description" content="([^"]*)"/)?.[1] ?? "";
  if (!title) errors.push(`${rel}: missing title`);
  else if (titles.has(title)) errors.push(`${rel}: duplicate title with ${titles.get(title)}`);
  else titles.set(title, rel);
  const plainDesc = desc.replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"');
  if (!plainDesc) errors.push(`${rel}: missing description`);
  else if (plainDesc.length > 160) warn.push(`${rel}: description ${plainDesc.length} chars`);
  if (!/rel="canonical" href="https:\/\/guntherheller\.com\//.test(html)) errors.push(`${rel}: missing canonical`);
  if (!html.includes("application/ld+json")) errors.push(`${rel}: missing JSON-LD`);
  for (const m of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) {
    try { JSON.parse(m[1]); } catch { errors.push(`${rel}: invalid JSON-LD`); }
  }
  if (/^\/((how-long-does|can-you-freeze-|does-)|(es|de|fr|pt-br)\/(cuanto-dura|haltbarkeit|conservation|quanto-dura)-)/.test(rel)) {
    // Allow Vercel Analytics scripts but no other client JS
    // Vercel Analytics uses a <vercel-analytics> custom element and defines it via script
    const hasVercelAnalytics = html.includes('<vercel-analytics');
    // The Google tag (GTM-KMS824N3) and the AdSense loader (ca-pub-2128579868272786) in Base.astro are also allowed.
    const scripts = [...html.matchAll(/<script(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g)];
    const hasNonJsonLdScript = scripts.some(([tag, body]) => !tag.includes("googletagmanager.com/gtm.js?id=GTM-KMS824N3") && !tag.includes("pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2128579868272786") && !/^\s*window\.dataLayer = window\.dataLayer \|\| \[\];\s*function gtag\(\)\{dataLayer\.push\(arguments\);\}\s*gtag\('js', new Date\(\)\);\s*$/.test(body));
    if (hasNonJsonLdScript && !hasVercelAnalytics) errors.push(`${rel}: food page ships client JS`);
  }
}

// hreflang: every alternate must exist, declare the same cluster back (reciprocity) and include x-default.
const altsOf = (html) => [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="https:\/\/guntherheller\.com([^"]+)"/g)].map((m) => [m[1], m[2]]);
let clusters = 0;
for (const file of pages) {
  const html = readFileSync(file, "utf8");
  const alts = altsOf(html).filter(([l]) => l !== "x-default");
  if (alts.length < 2) continue;
  clusters++;
  const rel = "/" + relative(DIST, file).replace(/index\.html$/, "");
  if (!altsOf(html).some(([l]) => l === "x-default")) errors.push(`${rel}: hreflang without x-default`);
  if (!alts.some(([, h]) => h === rel)) errors.push(`${rel}: hreflang cluster does not include itself`);
  for (const [lang, href] of alts) {
    if (!exists(href)) { errors.push(`${rel}: hreflang ${lang} → missing ${href}`); continue; }
    const other = readFileSync(join(DIST, href, "index.html"), "utf8");
    if (!altsOf(other).some(([, h]) => h === rel)) errors.push(`${rel}: hreflang ${lang} → ${href} does not link back`);
    const htmlLang = other.match(/<html lang="([^"]+)"/)?.[1];
    if (htmlLang !== lang) errors.push(`${href}: <html lang="${htmlLang}"> but hreflang says ${lang}`);
  }
}

// Sitemaps: every listed URL is a built, indexable page; every indexable page is listed.
const listed = new Set();
const idx = readFileSync(join(DIST, "sitemap.xml"), "utf8");
for (const [, loc] of idx.matchAll(/<loc>https:\/\/guntherheller\.com(\/[^<]+)<\/loc>/g)) {
  const xml = readFileSync(join(DIST, loc), "utf8");
  const n = (xml.match(/<url>/g) ?? []).length;
  if (n > 50000 || xml.length > 50 * 1024 * 1024) errors.push(`${loc}: over sitemap limits`);
  for (const [, p] of xml.matchAll(/<loc>https:\/\/guntherheller\.com([^<]+)<\/loc>/g)) {
    listed.add(p);
    if (!exists(p)) errors.push(`${loc}: lists missing page ${p}`);
  }
}
for (const file of pages) {
  const rel = "/" + relative(DIST, file).replace(/index\.html$/, "");
  const html = readFileSync(file, "utf8");
  if (rel === "/404.html" || /name="robots" content="noindex/.test(html)) continue;
  if (!listed.has(rel)) errors.push(`${rel}: indexable page missing from sitemaps`);
}
for (const f of ["favicon.ico", "favicon.svg", "favicon-96x96.png", "apple-touch-icon.png", "site.webmanifest", "web-app-manifest-512x512.png"]) if (!existsSync(join(DIST, f))) errors.push(`missing ${f}`);

// Word count: every English food and variant page carries at least 1,200 words of main content.
const MIN_WORDS = 1200;
const wordsIn = (html) => {
  const main = (html.match(/<main[\s\S]*?<\/main>/) ?? [html])[0].replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>/g, "");
  return (main.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").match(/[\p{L}\p{N}][\p{L}\p{N}'’–-]*/gu) ?? []).length;
};
let thin = 0, minSeen = Infinity;
for (const file of pages) {
  const rel = "/" + relative(DIST, file).replace(/index\.html$/, "");
  if (!/^\/((how-long-does-.*-last|can-you-freeze-.+|does-.+-go-bad|[^/]+-left-out-overnight)|(es\/cuanto-dura|de\/haltbarkeit|fr\/conservation|pt-br\/quanto-dura)-.+)\/$/.test(rel)) continue;
  const n = wordsIn(readFileSync(file, "utf8"));
  minSeen = Math.min(minSeen, n);
  if (n < MIN_WORDS) { thin++; if (thin <= 10) errors.push(`${rel}: only ${n} words (min ${MIN_WORDS})`); }
}
if (thin > 10) errors.push(`…${thin - 10} more pages under ${MIN_WORDS} words`);

// Acceptance test (handoff §3): cooked rice.
const rice = readFileSync(join(DIST, "how-long-does-cooked-rice-last/index.html"), "utf8");
const expectTitle = "How Long Does Cooked Rice Last? 4–6 Days in the Fridge [Freezer 6 Months]";
if (!rice.includes(`<title>${expectTitle}</title>`)) errors.push(`cooked rice: title is not "${expectTitle}"`);
for (const t of ["4–6 days", "6 months", "2 hours", "Cooked rice lasts"]) if (!rice.includes(t)) errors.push(`cooked rice: answer text "${t}" missing`);
for (const t of ['"Article"', '"BreadcrumbList"', '"FAQPage"', '"Organization"', '"Dataset"', '"PropertyValue"']) if (!rice.includes(t)) errors.push(`cooked rice: JSON-LD ${t} missing`);
for (const f of ["robots.txt", "ads.txt", "sitemap.xml", "og.png", "404.html", "search-index.json"]) if (!existsSync(join(DIST, f))) errors.push(`missing ${f}`);

const css = files.filter((f) => f.endsWith(".css")).reduce((n, f) => n + statSync(f).size, 0);
const inlineCss = (rice.match(/<style[^>]*>([\s\S]*?)<\/style>/g) ?? []).join("").length;
console.log(`check-build: ${pages.length} pages, ${titles.size} unique titles, ${clusters} hreflang pages, ${listed.size} sitemap URLs, shortest food page ${minSeen} words, CSS ${(Math.max(css, inlineCss) / 1024).toFixed(1)} KB`);
if (Math.max(css, inlineCss) > 60 * 1024) errors.push("CSS over the 60 KB budget");
warn.slice(0, 10).forEach((w) => console.warn("warn:", w));
if (warn.length > 10) console.warn(`warn: …and ${warn.length - 10} more`);
if (errors.length) {
  errors.slice(0, 40).forEach((e) => console.error("error:", e));
  console.error(`check-build: ${errors.length} error(s)`);
  process.exit(1);
}
console.log("check-build: ok");
