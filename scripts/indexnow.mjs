#!/usr/bin/env node
/**
 * Submits URLs to IndexNow (Bing, Yandex, Naver, Seznam, Yep share submissions).
 *   npm run indexnow              # every URL in the built sitemaps (run after deploy)
 *   npm run indexnow -- /es/ /how-long-does-eggs-last/   # specific paths
 * The key file public/3bd059f3c9c14a02d8bc66cb837d6ea2.txt must be live at https://guntherheller.com/3bd059f3c9c14a02d8bc66cb837d6ea2.txt first.
 * Google does not use IndexNow: submit https://guntherheller.com/sitemap.xml in Search Console.
 */
import { readFileSync } from "node:fs";
const HOST = "guntherheller.com";
const KEY = "3bd059f3c9c14a02d8bc66cb837d6ea2";
const DIST = new URL("../dist/", import.meta.url);
let urls = process.argv.slice(2).map((p) => `https://${HOST}${p}`);
if (!urls.length) {
  const idx = readFileSync(new URL("sitemap.xml", DIST), "utf8");
  for (const [, loc] of idx.matchAll(/<loc>https:\/\/guntherheller\.com\/([^<]+)<\/loc>/g)) {
    const xml = readFileSync(new URL(loc, DIST), "utf8");
    for (const [, u] of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) urls.push(u);
  }
}
for (let i = 0; i < urls.length; i += 10000) {
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urls.slice(i, i + 10000) }),
  });
  console.log(`IndexNow: ${Math.min(10000, urls.length - i)} URLs → HTTP ${res.status}`);
}
