#!/usr/bin/env node
/**
 * Renders every page's figures (src/figures/cards.ts) to public/img/fig/<lang>/<page>-<card>-1200x675.webp
 * plus a 720×405 variant, with Playwright at deviceScaleFactor 2, WebP quality 86.
 *
 *   npm run figures                     # render figures whose data or design changed (hash check)
 *   npm run figures -- --force          # re-render everything
 *   npm run figures -- --only /de/      # only pages whose path starts with /de/
 *   npm run figures -- --specimen       # docs/figures-specimen.png (+ -360.png): one of every card type
 *   npm run figures -- --check          # exit 1 if any figure is stale or missing (no rendering)
 *
 *   npm run figures -- --upload         # CI: render what the Blob store lacks and upload it (needs BLOB_READ_WRITE_TOKEN)
 *   npm run figures -- --check --remote # report figures the Blob store does not have yet
 *
 * Storage: the images are not committed. Production serves /img/fig/* from the Vercel Blob store
 * (vercel.json rewrite to FIG_ORIGIN/fig/*), filled by .github/workflows/figures.yml. Locally they
 * are written to public/img/fig/ (git-ignored) for dev, preview and screenshots.
 * Skipping: each card's hash = its spec + system.css + html.mjs + icons.mjs + font files. The manifest
 * (public/img/fig/manifest.json locally, fig/manifest.json in Blob) maps image path → hash.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { cpus } from "node:os";
import { createRequire } from "node:module";
import sharp from "sharp";
import { loadCards } from "./lib/load-cards.mjs";
import { cardHtml, FIT_SCRIPT } from "../src/figures/html.mjs";
import { FONTS, CSS, cardHash, FIG_ORIGIN } from "./lib/figlib.mjs";

const ROOT = new URL("../", import.meta.url).pathname;
const OUT = join(ROOT, "public");
const FIGDIR = join(OUT, "img/fig");
const MANIFEST = join(FIGDIR, "manifest.json");
const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const opt = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };

const doc = (body, extraCss = "") => `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/system.css"><style>${extraCss}</style></head><body>${body}</body></html>`;

async function launch() {
  const { chromium } = await import("playwright");
  try { return await chromium.launch(); } catch (e) {
    try { return await chromium.launch({ channel: "chrome" }); } catch {
      console.error("figures: no Chromium available. Run `npx playwright install chromium`, or run `npm run figures` locally and commit public/img/fig.");
      throw e;
    }
  }
}
function route(page) {
  return page.route("http://fig.local/**", (route) => {
    const p = new URL(route.request().url()).pathname;
    if (p === "/system.css") return route.fulfill({ body: CSS, contentType: "text/css" });
    if (p.startsWith("/fonts/fig/")) return route.fulfill({ body: readFileSync(require.resolve(FONTS[p.slice(11)])), contentType: "font/woff2" });
    return route.fulfill({ body: doc(""), contentType: "text/html" });
  });
}
async function newPage(browser, width = 1200, height = 675) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await route(page);
  await page.goto("http://fig.local/blank");
  await page.evaluate(() => document.fonts.ready);
  return page;
}

/** Render one card; returns { png, numbers, fit }. */
async function renderCard(page, spec) {
  await page.evaluate((html) => { document.body.innerHTML = html; }, cardHtml(spec));
  await page.evaluate(() => document.fonts.ready);
  const fit = await page.evaluate(FIT_SCRIPT);
  const numbers = await page.evaluate(() => {
    const fig = document.querySelector(".fig").cloneNode(true);
    fig.querySelectorAll(".step-no, .mark, svg").forEach((e) => e.remove());
    return [...new Set((fig.textContent.match(/\d+/g) ?? []).map((n) => String(Number(n))))];
  });
  const png = await page.locator(".fig").screenshot({ type: "png" });
  return { png, numbers, fit };
}
const encode = async (png) => ({
  big: await sharp(png).resize(1200, 675).webp({ quality: 86, effort: 4 }).toBuffer(),
  small: await sharp(png).resize(720, 405).webp({ quality: 86, effort: 4 }).toBuffer(),
});

/* ---------------------------------------------------------------- specimen */
async function specimen(mod) {
  const pick = (path) => mod.allPageFigs().find((p) => p.path === path);
  const rice = pick("/how-long-does-cooked-rice-last/");
  const want = [
    ["answer (hero, EN food)", rice.hero],
    ["answer (hero, DE food)", pick("/de/haltbarkeit-gekochter-reis/").hero],
    ["answer (hero, can-you-freeze)", pick("/can-you-freeze-ground-beef/").hero],
    ["answer (hero, hub)", pick("/foods/dairy-eggs/").hero],
    ["shelf-life (paired)", rice.figures.find((c) => c.type === "shelf-life")],
    ["shelf-life (opened vs unopened)", pick("/how-long-does-mayonnaise-last/")?.figures.find((c) => c.type === "shelf-life") ?? rice.figures[0]],
    ["temperature", rice.figures.find((c) => c.type === "temperature")],
    ["temperature (danger zone, left out)", pick("/cooked-rice-left-out-overnight/").figures.find((c) => c.type === "temperature")],
    ["steps (3)", rice.figures.find((c) => c.type === "steps")],
    ["steps (DE, longest words)", pick("/de/haltbarkeit-gekochter-reis/").figures.find((c) => c.id === "steps-2")],
    ["steps (4)", pick("/how-long-does-milk-last/").figures.find((c) => c.id.startsWith("steps") && c.spec.data.steps.length === 4) ?? rice.figures.find((c) => c.type === "steps")],
    ["signs", pick("/how-long-does-raw-chicken-last/").figures.find((c) => c.type === "signs")],
    ["signs (DE)", pick("/de/haltbarkeit-gekochter-reis/").figures.find((c) => c.type === "signs")],
    ["versus (states)", rice.figures.find((c) => c.type === "versus")],
    ["versus (fridge vs freezer)", pick("/can-you-freeze-ground-beef/").figures.find((c) => c.type === "versus")],
    ["matrix (hub)", pick("/foods/dairy-eggs/").figures.find((c) => c.type === "matrix")],
    ["shelf-life (hub ranking)", pick("/foods/dairy-eggs/").figures.find((c) => c.type === "shelf-life")],
    ["callout", pick("/how-long-does-raw-chicken-last/").figures.find((c) => c.type === "callout")],
  ].filter(([, c]) => c);
  const browser = await launch();
  const page = await newPage(browser);
  const shots = [];
  for (const [label, c] of want) {
    const r = await renderCard(page, c.spec);
    shots.push({ label, c, data: r.png.toString("base64"), fit: r.fit });
    if (!r.fit.ok) console.warn(`specimen: ${label}: ${r.fit.problems.join("; ")}`);
  }
  const html = (w) => doc(`<main style="padding:48px;display:grid;grid-template-columns:repeat(${w > 800 ? 2 : 1},1fr);gap:40px 32px;max-width:${w}px;font-family:var(--f-sans)">
<h1 style="grid-column:1/-1;font:560 48px/1.1 var(--f-serif)">Figure specimen <span style="font:500 20px var(--f-sans);color:var(--muted)">guntherheller.com, ${shots.length} cards, rendered 1200×675 @2x</span></h1>
${shots.map((s) => `<figure style="margin:0"><img src="data:image/png;base64,${s.data}" style="width:100%;height:auto;display:block;border:1px solid var(--rule);border-radius:8px"><figcaption style="font-size:15px;color:var(--muted);margin-top:8px">${s.label} · min font ${s.fit.minFont}px${s.fit.ok ? "" : " · ⚠ " + s.fit.problems.join("; ")}</figcaption></figure>`).join("")}</main>`, "body{background:#fff}");
  const sp = await (await browser.newContext({ viewport: { width: 2000, height: 1000 }, deviceScaleFactor: 1 })).newPage();
  await route(sp); await sp.goto("http://fig.local/blank"); await sp.setContent(html(2000).replace('href="/system.css"', 'href="http://fig.local/system.css"'));
  await sp.evaluate(() => document.fonts.ready);
  mkdirSync(join(ROOT, "docs"), { recursive: true });
  await sp.screenshot({ path: join(ROOT, "docs/figures-specimen.png"), fullPage: true });
  const m = await (await browser.newContext({ viewport: { width: 360, height: 800 }, deviceScaleFactor: 2 })).newPage();
  await route(m); await m.goto("http://fig.local/blank"); await m.setContent(html(360).replace('href="/system.css"', 'href="http://fig.local/system.css"').replace("padding:48px", "padding:16px"));
  await m.screenshot({ path: join(ROOT, "docs/figures-specimen-360.png"), fullPage: true });
  await browser.close();
  console.log(`specimen: docs/figures-specimen.png (${shots.length} cards) and docs/figures-specimen-360.png`);
}

/* ---------------------------------------------------------------- main */
const { mod, close } = await loadCards();
try {
  if (flag("--specimen")) { await specimen(mod); }
  else {
    const only = opt("--only");
    const pages = mod.allPageFigs().filter((p) => !only || p.path.startsWith(only));
    const cards = pages.flatMap((p) => [p.hero, ...p.figures].map((c) => ({ page: p.path, c, h: cardHash(c) })));
    const remote = flag("--upload") || flag("--remote");
    let manifest = {};
    if (remote) {
      const r = await fetch(`${FIG_ORIGIN}/fig/manifest.json`, { cache: "no-store" });
      manifest = r.ok ? await r.json() : {};
      console.log(`figures: remote manifest has ${Object.keys(manifest).length} images`);
    } else if (existsSync(MANIFEST)) manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
    const blob = flag("--upload") ? await import("@vercel/blob") : null;
    if (blob && !process.env.BLOB_READ_WRITE_TOKEN) throw new Error("--upload needs BLOB_READ_WRITE_TOKEN");
    const putOpts = { access: "public", addRandomSuffix: false, allowOverwrite: true, contentType: "image/webp", cacheControlMaxAge: 86400 };
    const upload = async (src, body) => {
      const res = await blob.put(src.replace(/^\/img\//, ""), body, putOpts);
      if (!res.url.startsWith(FIG_ORIGIN)) throw new Error(`Blob served ${res.url}, but FIG_ORIGIN / vercel.json point at ${FIG_ORIGIN}. Update scripts/lib/figlib.mjs and vercel.json.`);
    };
    const stale = cards.filter(({ c, h }) => flag("--force") || manifest[c.src]?.h !== h || (!remote && (!existsSync(join(OUT, c.src)) || !existsSync(join(OUT, c.src720)))));
    console.log(`figures: ${pages.length} pages, ${cards.length} figures, ${stale.length} to render`);
    if (flag("--check")) { if (stale.length) { console.error(`figures: ${stale.length} stale or missing, e.g. ${stale.slice(0, 5).map((s) => s.c.src).join(", ")}. Run npm run figures.`); process.exitCode = 1; } }
    else if (stale.length) {
      const browser = await launch();
      const n = Math.max(1, Math.min(Number(process.env.FIG_WORKERS ?? cpus().length + 1), 6));
      const pagesP = await Promise.all(Array.from({ length: n }, () => newPage(browser)));
      let done = 0, i = 0;
      const problems = [];
      const t0 = Date.now();
      const json = () => JSON.stringify(Object.fromEntries(Object.entries(manifest).sort()), null, 0).replace(/},"/g, '},\n"') + "\n";
      let saving = Promise.resolve();
      const save = () => (saving = saving.then(async () => {
        if (blob) await blob.put("fig/manifest.json", json(), { ...putOpts, contentType: "application/json", cacheControlMaxAge: 60 });
        else { mkdirSync(FIGDIR, { recursive: true }); writeFileSync(MANIFEST, json()); }
      }));
      await Promise.all(pagesP.map(async (pg0) => {
        let pg = pg0, used = 0;
        while (i < stale.length) {
          // Recycle the browser context now and then: long runs otherwise slow down as Chromium accumulates state.
          if (++used % 300 === 0) { await pg.context().close(); pg = await newPage(browser); }
          const job = stale[i++];
          const { c, h, page } = job;
          let r;
          try { r = await renderCard(pg, c.spec); } catch (e) { problems.push(`${page} ${c.id}: ${e.message}`); continue; }
          if (!r.fit.ok) problems.push(`${page} ${c.id}: ${r.fit.problems.join("; ")}`);
          const { big, small } = await encode(r.png);
          if (blob) { await upload(c.src, big); await upload(c.src720, small); }
          else {
            mkdirSync(dirname(join(OUT, c.src)), { recursive: true });
            writeFileSync(join(OUT, c.src), big);
            writeFileSync(join(OUT, c.src720), small);
          }
          manifest[c.src] = { h, f: r.fit.minFont };
          if (++done % 250 === 0) { save(); const rate = done / ((Date.now() - t0) / 1000); console.log(`  ${done}/${stale.length}  ${rate.toFixed(1)}/s  ~${Math.round((stale.length - done) / rate / 60)} min left`); }
        }
      }));
      await browser.close();
      // Prune images no page uses any more (full runs only).
      if (!only && !blob) {
        const live = new Set(cards.flatMap(({ c }) => [c.src, c.src720]));
        for (const k of Object.keys(manifest)) if (!live.has(k)) delete manifest[k];
        for (const lang of readdirSync(FIGDIR).filter((d) => !d.includes("."))) for (const f of readdirSync(join(FIGDIR, lang))) if (!live.has(`/img/fig/${lang}/${f}`)) unlinkSync(join(FIGDIR, lang, f));
      }
      await save();
      await saving;
      mkdirSync(FIGDIR, { recursive: true });
      writeFileSync(join(FIGDIR, "problems.txt"), problems.join("\n") + (problems.length ? "\n" : ""));
      console.log(`figures: rendered ${done} in ${Math.round((Date.now() - t0) / 1000)} s; ${problems.length} layout problems${problems.length ? " (public/img/fig/problems.txt)" : ""}`);
      problems.slice(0, 15).forEach((p) => console.warn("  " + p));
      if (problems.length && flag("--strict")) process.exitCode = 1;
    }
  }
} finally { await close(); }
