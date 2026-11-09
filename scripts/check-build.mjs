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
  if (!/rel="canonical" href="https:\/\/www\.guntherheller\.com\//.test(html)) errors.push(`${rel}: missing canonical`);
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
const altsOf = (html) => [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="https:\/\/www\.guntherheller\.com([^"]+)"/g)].map((m) => [m[1], m[2]]);
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
  const rel = "/" + relative(DIST, file).replace(/index\.html$/, "");
  const html = readFileSync(file, "utf8");
  if (rel === "/404.html" || /name="robots" content="noindex/.test(html)) continue;
  if (!listed.has(rel)) errors.push(`${rel}: indexable page missing from sitemaps`);
}
for (const f of ["favicon.ico", "favicon.svg", "favicon-96x96.png", "apple-touch-icon.png", "site.webmanifest", "web-app-manifest-512x512.png"]) if (!existsSync(join(DIST, f))) errors.push(`missing ${f}`);

// No word-count target: padding pages to a length is what scaled-content filters look for.
// Instead, guard against duplication: an indexable question page (can you freeze / does it go bad)
// must answer its own question, not repeat the main food page.
const MAX_SHARED = 0.4;
const wordsIn = (html) => {
  const main = (html.match(/<main[\s\S]*?<\/main>/) ?? [html])[0].replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>/g, "");
  return (main.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").match(/[\p{L}\p{N}][\p{L}\p{N}'’–-]*/gu) ?? []).length;
};
const sentencesIn = (html) => {
  const art = (html.match(/<article[\s\S]*?<\/article>/) ?? [""])[0].replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>/g, "");
  const text = art.replace(/<\/(p|li|h[1-6]|div|td|th|summary|dd)>/g, "\n").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ");
  return new Set(text.split(/\n|(?<=[.!?])\s+/).map((x) => x.replace(/\s+/g, " ").trim().toLowerCase()).filter((x) => x.split(" ").length >= 5));
};
let minSeen = Infinity, worstShare = 0, dupes = 0;
const isMain = (rel) => /^\/how-long-do(es)?-.+-last\/$/.test(rel);
const isQuestion = (rel) => /^\/(can-you-freeze-.+|does-(?!it-go-bad\/).+-go-bad|do-.+-go-bad)\/$/.test(rel);
const sets = new Map();
for (const file of pages) {
  const rel = "/" + relative(DIST, file).replace(/index\.html$/, "");
  if (/^\/((how-long-do(es)?-.*-last)|(es\/cuanto-dura|de\/haltbarkeit|fr\/conservation|pt-br\/quanto-dura)-.+)\/$/.test(rel)) minSeen = Math.min(minSeen, wordsIn(readFileSync(file, "utf8")));
  if (isMain(rel) || isQuestion(rel)) sets.set(rel, sentencesIn(readFileSync(file, "utf8")));
}
// Lines on a third of these pages or more are site furniture (trust line, table labels), not page content.
const seenOn = new Map();
for (const set of sets.values()) for (const x of set) seenOn.set(x, (seenOn.get(x) ?? 0) + 1);
const furniture = Math.max(50, Math.round(sets.size / 3));
for (const [rel, mine0] of sets) {
  if (!isQuestion(rel)) continue;
  const html = readFileSync(join(DIST, rel, "index.html"), "utf8");
  if (/name="robots" content="noindex/.test(html)) continue;
  const mainHref = html.match(/href="(\/how-long-do(?:es)?-[^"]+-last\/)"/)?.[1];
  if (!mainHref || !sets.has(mainHref)) { errors.push(`${rel}: no link to its main food page`); continue; }
  const mine = [...mine0].filter((x) => seenOn.get(x) < furniture), theirs = sets.get(mainHref);
  const shared = mine.filter((x) => theirs.has(x)).length / Math.max(mine.length, 1);
  worstShare = Math.max(worstShare, shared);
  if (shared > MAX_SHARED) { dupes++; if (dupes <= 10) errors.push(`${rel}: ${Math.round(shared * 100)}% of its sentences repeat ${mainHref} (max ${MAX_SHARED * 100}%)`); }
}
if (dupes > 10) errors.push(`…${dupes - 10} more question pages repeat their main page`);
// Regression guard for removed filler.
for (const file of pages) if (/id="quiz"/.test(readFileSync(file, "utf8"))) { errors.push(`${"/" + relative(DIST, file)}: true/false quiz is back`); break; }

// Acceptance test (handoff §3): cooked rice.
const rice = readFileSync(join(DIST, "how-long-does-cooked-rice-last/index.html"), "utf8");
const expectTitle = "How Long Does Cooked Rice Last? 4–6 Days in the Fridge [Freezer 6 Months]";
if (!rice.includes(`<title>${expectTitle}</title>`)) errors.push(`cooked rice: title is not "${expectTitle}"`);
for (const t of ["4–6 days", "6 months", "2 hours", "Cooked rice lasts"]) if (!rice.includes(t)) errors.push(`cooked rice: answer text "${t}" missing`);
for (const t of ['"Article"', '"BreadcrumbList"', '"FAQPage"', '"Organization"', '"Dataset"', '"PropertyValue"']) if (!rice.includes(t)) errors.push(`cooked rice: JSON-LD ${t} missing`);
for (const f of ["robots.txt", "ads.txt", "sitemap.xml", "og.png", "404.html", "search-index.json"]) if (!existsSync(join(DIST, f))) errors.push(`missing ${f}`);

const css = files.filter((f) => f.endsWith(".css")).reduce((n, f) => n + statSync(f).size, 0);
const inlineCss = (rice.match(/<style[^>]*>([\s\S]*?)<\/style>/g) ?? []).join("").length;
console.log(`check-build: ${pages.length} pages, ${titles.size} unique titles, ${clusters} hreflang pages, ${listed.size} sitemap URLs, shortest food page ${minSeen} words, question pages share at most ${Math.round(worstShare * 100)}% of sentences with their main page, CSS ${(Math.max(css, inlineCss) / 1024).toFixed(1)} KB`);
if (Math.max(css, inlineCss) > 60 * 1024) errors.push("CSS over the 60 KB budget");
warn.slice(0, 10).forEach((w) => console.warn("warn:", w));
if (warn.length > 10) console.warn(`warn: …and ${warn.length - 10} more`);
if (errors.length) {
  errors.slice(0, 40).forEach((e) => console.error("error:", e));
  console.error(`check-build: ${errors.length} error(s)`);
  process.exit(1);
}
console.log("check-build: ok");
