#!/usr/bin/env node
/** Markdown summary of how data/foods.json changed versus git HEAD (used in the sync PR body). */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
const before = JSON.parse(execSync("git show HEAD:data/foods.json", { encoding: "utf8", maxBuffer: 64e6 }));
const after = JSON.parse(readFileSync(new URL("../data/foods.json", import.meta.url), "utf8"));
const key = (f) => String(f.id);
const b = new Map(before.foods.map((f) => [key(f), f]));
const a = new Map(after.foods.map((f) => [key(f), f]));
const added = [...a.keys()].filter((k) => !b.has(k)).map((k) => a.get(k));
const removed = [...b.keys()].filter((k) => !a.has(k)).map((k) => b.get(k));
const changed = [...a.keys()].filter((k) => b.has(k) && JSON.stringify(a.get(k).states) !== JSON.stringify(b.get(k).states)).map((k) => a.get(k));
const out = [
  `## USDA FoodKeeper sync`,
  `FoodKeeper v${before.meta.version} (${before.meta.modified}) → v${after.meta.version} (${after.meta.modified}); sha256 \`${after.meta.sha256.slice(0, 12)}…\`.`,
  `- ${added.length} added, ${removed.length} removed, ${changed.length} with changed storage times.`,
  ...(added.length ? ["", "### Added", ...added.slice(0, 50).map((f) => `- ${f.name} (\`${f.slug}\`) — new FoodKeeper names get an auto name; add a clean one in data/overrides.json`)] : []),
  ...(removed.length ? ["", "### Removed (pages will 404 — add redirects in vercel.json)", ...removed.map((f) => `- ${f.name} (\`/how-long-does-${f.slug}-last/\`)`)] : []),
  ...(changed.length ? ["", "### Changed numbers", ...changed.slice(0, 80).map((f) => `- ${f.name}`)] : []),
  "",
  "After merging, bump `SITE.verifiedISO` / `verifiedLabel` in `src/lib/site.ts`; that drives \"last verified\" and sitemap lastmod.",
];
console.log(out.join("\n"));
