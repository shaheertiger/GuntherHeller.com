#!/usr/bin/env node
/**
 * Figure checks on dist/ (runs in `npm run build`, after astro build). Fails the build if any
 * indexable page:
 *  - has no hero figure directly under its H1 (before the first H2),
 *  - has fewer than 3 in-body figures,
 *  - has a figure without a full-sentence alt text,
 *  - shows a figure that is not registered for that page in src/figures/cards.ts,
 *  - shows a number in a figure that does not appear in the page's own text (outside figures).
 * Then reports how many figures the Blob store does not have yet (warning only: CI uploads them).
 * Pages with no figures by design: legal pages and the noindexed search/404.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { loadCards } from "./lib/load-cards.mjs";
import { cardNumbers, cardHash, FIG_ORIGIN } from "./lib/figlib.mjs";

const DIST = new URL("../dist/", import.meta.url).pathname;
const EXEMPT = new Set(["/privacy/", "/terms/"]);
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const pages = walk(DIST).filter((f) => f.endsWith(".html"));

const { mod, close } = await loadCards();
const registry = new Map(mod.allPageFigs().map((p) => [p.path, p]));
await close();

const errors = [];
const nums = (s) => new Set((s.match(/\d+/g) ?? []).map((n) => String(Number(n))));
const counts = {};
let checked = 0, figures = 0;
const wanted = [];
for (const file of pages) {
  const rel = "/" + relative(DIST, file).replace(/index\.html$/, "");
  const html = readFileSync(file, "utf8");
  if (rel === "/404.html" || /name="robots" content="noindex/.test(html) || EXEMPT.has(rel)) continue;
  checked++;
  const main = (html.match(/<main[\s\S]*?<\/main>/) ?? [""])[0];
  const pf = registry.get(rel);
  if (!pf) { errors.push(`${rel}: no figures registered in src/figures/cards.ts`); continue; }
  const figs = [...main.matchAll(/<figure class="fig-img([^"]*)" data-fig="([^"]+)">\s*<img([^>]*)>/g)].map((m) => ({ hero: m[1].includes("fig-hero"), id: m[2], img: m[3], at: m.index }));
  const hero = figs.find((f) => f.hero);
  const h1 = main.indexOf("</h1>"), h2 = main.indexOf("<h2");
  if (!hero) errors.push(`${rel}: no hero figure`);
  else if (hero.at < h1 || (h2 >= 0 && hero.at > h2)) errors.push(`${rel}: hero is not between the H1 and the first H2`);
  const body = figs.filter((f) => !f.hero);
  if (body.length < 3) errors.push(`${rel}: ${body.length} in-body figures (min 3)`);
  // Page text outside figures, scripts and inline SVG: the "page's data" a figure may repeat.
  const text = main.replace(/<figure[\s\S]*?<\/figure>/g, " ").replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>/g, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ");
  const pageNums = nums(text);
  const cards = new Map([pf.hero, ...pf.figures].map((c) => [c.src, c]));
  for (const f of figs) {
    figures++;
    const src = f.img.match(/src="([^"]+)"/)?.[1];
    const alt = f.img.match(/alt="([^"]*)"/)?.[1] ?? "";
    if (alt.trim().length < 20 || !/[.!?]["“”»]?$/.test(alt.trim())) errors.push(`${rel}: figure ${f.id} alt text is missing or not a sentence`);
    if (!/width="1200" height="675"/.test(f.img)) errors.push(`${rel}: figure ${f.id} without width/height`);
    const card = cards.get(src);
    if (!card) { errors.push(`${rel}: figure ${src} is not registered for this page`); continue; }
    wanted.push(card);
    const missing = cardNumbers(card.spec).filter((n) => !pageNums.has(n));
    if (missing.length) errors.push(`${rel}: figure ${f.id} shows ${missing.join(", ")}, not found in the page text`);
    const lang = src.split("/")[3];
    counts[lang] = (counts[lang] ?? 0) + 1;
  }
}

console.log(`check-figures: ${checked} pages, ${figures} figures (${Object.entries(counts).map(([l, n]) => `${l} ${n}`).join(", ")})`);
// Freshness of the Blob store (warning: the figures workflow uploads after merge).
try {
  const r = await fetch(`${FIG_ORIGIN}/fig/manifest.json`, { signal: AbortSignal.timeout(8000) });
  const m = r.ok ? await r.json() : {};
  const pending = wanted.filter((c) => m[c.src]?.h !== cardHash(c)).length;
  if (pending) console.warn(`warn: ${pending} figures are not in the Blob store yet (or are out of date); the "Figures" workflow renders and uploads them.`);
  else console.log("check-figures: Blob store is up to date");
} catch { console.warn("warn: could not reach the Blob store to check figure freshness"); }
if (errors.length) {
  errors.slice(0, 40).forEach((e) => console.error("error:", e));
  console.error(`check-figures: ${errors.length} error(s)`);
  process.exit(1);
}
console.log("check-figures: ok");
