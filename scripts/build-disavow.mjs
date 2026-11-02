#!/usr/bin/env node
/**
 * Builds a Google disavow file from a backlink export.
 *
 *   npm run disavow -- path/to/backlinks.csv
 *
 * Works with Ahrefs / Semrush / Search Console "Latest links" CSV exports: it looks for a
 * referring-URL (or domain) column and an anchor column by header name. Domains whose links
 * match the spam patterns below (the expired domain's Brazilian-dental and "SEO service"
 * anchor spam) are written to seo/disavow.txt; everything flagged is also listed in
 * seo/disavow-review.csv so a person can check it before uploading. Review before submitting:
 * disavowing good links hurts.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const SPAM = [
  /dent(al|ista|ário|ario|aria)|odonto|implante|ortodont|clareamento|aparelho dent|prótese|protese|lente(s)? de contato dental/i,
  /\bseo\b.*(servi[cç]o|service|agency|ag[eê]ncia|backlink|cheap|barato)|(comprar|buy) backlinks?|link ?building service|guest post service/i,
  /casino|cassino|apostas|betting|viagra|cialis|replica|escort|loan|empr[eé]stimo/i,
];
const KEEP = [/wikipedia\.org$/i, /\.gov$/i, /\.edu$/i, /reddit\.com$/i];

const file = process.argv[2];
if (!file || !existsSync(file)) {
  console.error("usage: npm run disavow -- <backlinks.csv>");
  process.exit(1);
}
const parse = (line) => {
  const out = []; let cur = ""; let q = false;
  for (const ch of line) {
    if (ch === '"') q = !q; else if ((ch === "," || ch === "\t") && !q) { out.push(cur); cur = ""; } else cur += ch;
  }
  return [...out, cur].map((s) => s.trim());
};
const lines = readFileSync(file, "utf8").replace(/^﻿/, "").split(/\r?\n/).filter(Boolean);
const head = parse(lines[0]).map((h) => h.toLowerCase());
const col = (re) => head.findIndex((h) => re.test(h));
const iUrl = col(/referring page url|source url|^url|linking page|referring url|source/);
const iDom = col(/domain/);
const iAnchor = col(/anchor/);
if (iUrl < 0 && iDom < 0) { console.error(`no URL/domain column in: ${head.join(", ")}`); process.exit(1); }

const domainOf = (s) => { try { return new URL(s.startsWith("http") ? s : `http://${s}`).hostname.replace(/^www\./, ""); } catch { return null; } };
const flagged = new Map();
for (const line of lines.slice(1)) {
  const c = parse(line);
  const d = domainOf(c[iDom >= 0 ? iDom : iUrl] ?? "");
  if (!d || KEEP.some((k) => k.test(d))) continue;
  const anchor = iAnchor >= 0 ? c[iAnchor] ?? "" : "";
  const hay = `${anchor} ${c[iUrl] ?? ""} ${d}`;
  const hit = SPAM.find((re) => re.test(hay));
  if (hit) flagged.set(d, [...(flagged.get(d) ?? []), anchor || c[iUrl]]);
}
const today = new Date().toISOString().slice(0, 10);
writeFileSync("seo/disavow.txt", `# guntherheller.com disavow — generated ${today} from ${file}\n# Spam inherited from the expired domain (dental / SEO-service / gambling anchors). Review before upload.\n${[...flagged.keys()].sort().map((d) => `domain:${d}`).join("\n")}\n`);
writeFileSync("seo/disavow-review.csv", `domain,examples\n${[...flagged].map(([d, a]) => `${d},"${a.slice(0, 3).join(" | ").replace(/"/g, "'")}"`).join("\n")}\n`);
console.log(`flagged ${flagged.size} domains → seo/disavow.txt (review seo/disavow-review.csv first)`);
