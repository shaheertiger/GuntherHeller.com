#!/usr/bin/env node
/** Validates data/i18n/lf.{lang}.json against widgets.en.json: same keys, array shapes, {placeholders}, Celsius-first. */
import { readFileSync, existsSync } from "node:fs";
const dir = new URL("../data/i18n/", import.meta.url);
const en = JSON.parse(readFileSync(new URL("widgets.en.json", dir), "utf8"));
const ph = (s) => [...s.matchAll(/\{[a-zA-Z]+\}/g)].map((m) => m[0]).sort().join(",");
let failed = false;
for (const lang of process.argv[2] ? [process.argv[2]] : ["es", "de", "fr", "pt-br", "it", "nl"]) {
  const f = new URL(`widgets.${lang}.json`, dir);
  const errs = [];
  if (!existsSync(f)) errs.push("missing file");
  else {
    const tr = JSON.parse(readFileSync(f, "utf8"));
    const walk = (a, b, p) => {
      if (typeof a === "string") {
        if (typeof b !== "string" || !b.trim()) return errs.push(`${p}: missing`);
        if (ph(a) !== ph(b)) errs.push(`${p}: placeholders ${ph(b)} ≠ ${ph(a)}`);
        if (/°F/.test(b) && !/°C/.test(b)) errs.push(`${p}: Fahrenheit without Celsius`);
        return;
      }
      if (Array.isArray(a)) { if (!Array.isArray(b) || b.length !== a.length) return errs.push(`${p}: expected ${a.length} items`); return a.forEach((x, i) => walk(x, b[i], `${p}[${i}]`)); }
      if (!b || typeof b !== "object") return errs.push(`${p}: expected object`);
      for (const k of Object.keys(a)) if (k !== "_doc") walk(a[k], b[k], p ? `${p}.${k}` : k);
    };
    walk(en, tr, "");
  }
  if (errs.length) { failed = true; console.log(`✗ ${lang}: ${errs.length}`); errs.slice(0, 40).forEach((e) => console.log("  -", e)); } else console.log(`✓ ${lang}: ok`);
}
process.exit(failed ? 1 : 0);
