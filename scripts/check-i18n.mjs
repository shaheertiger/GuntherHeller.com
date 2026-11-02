#!/usr/bin/env node
/**
 * Validates translations against data/i18n/en.json and data/i18n/foods.source.json.
 *   node scripts/check-i18n.mjs es      (or de, fr, pt-br; no argument = all)
 * Checks: same keys and array shapes as en.json, same {placeholders} in every string,
 * every food translated with n/q/o/p/s, slugs well-formed and unique per language.
 */
import { readFileSync, existsSync } from "node:fs";
const dir = new URL("../data/i18n/", import.meta.url);
const read = (f) => JSON.parse(readFileSync(new URL(f, dir), "utf8"));
const en = read("en.json");
const src = read("foods.source.json");
const LANGS = process.argv[2] ? [process.argv[2]] : ["es", "de", "fr", "pt-br"];
const ph = (s) => [...s.matchAll(/\{[a-zA-Z]+\}/g)].map((m) => m[0]).sort().join(",");
const SKIP = new Set(["_doc", "lang", "htmlLang", "langName", "locale"]);
let failed = false;

for (const lang of LANGS) {
  const errs = [];
  const sf = `${lang}.json`, ff = `foods.${lang}.json`;
  if (!existsSync(new URL(sf, dir))) errs.push(`missing ${sf}`);
  if (!existsSync(new URL(ff, dir))) errs.push(`missing ${ff}`);
  if (!errs.length) {
    const tr = read(sf);
    const walk = (a, b, path) => {
      if (typeof a === "string") {
        if (typeof b !== "string" || !b.trim()) return errs.push(`${path}: missing or empty`);
        if (ph(a) !== ph(b)) errs.push(`${path}: placeholders ${ph(b) || "(none)"} ≠ ${ph(a) || "(none)"}`);
        if (/°F/.test(b) && !/°C/.test(b)) errs.push(`${path}: Fahrenheit without Celsius`);
        return;
      }
      if (Array.isArray(a)) {
        if (!Array.isArray(b) || b.length !== a.length) return errs.push(`${path}: expected array of ${a.length}`);
        return a.forEach((x, i) => walk(x, b[i], `${path}[${i}]`));
      }
      if (typeof b !== "object" || b === null || Array.isArray(b)) return errs.push(`${path}: expected object`);
      for (const k of Object.keys(a)) if (!SKIP.has(k)) walk(a[k], b[k], path ? `${path}.${k}` : k);
      for (const k of Object.keys(b)) if (!(k in a)) errs.push(`${path ? path + "." : ""}${k}: unknown key`);
    };
    walk(en, tr, "");
    for (const k of ["lang", "htmlLang", "langName", "locale"]) if (!tr[k]) errs.push(`${k}: missing`);

    const foods = read(ff);
    const slugs = new Map();
    for (const f of src) {
      const t = foods[f.slug];
      if (!t) { errs.push(`food ${f.slug}: missing`); continue; }
      for (const k of ["n", "q", "o", "s"]) if (typeof t[k] !== "string" || !t[k].trim()) errs.push(`food ${f.slug}: "${k}" missing`);
      if (typeof t.p !== "boolean") errs.push(`food ${f.slug}: "p" must be true/false`);
      if (t.s && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(t.s)) errs.push(`food ${f.slug}: bad slug "${t.s}" (lowercase ascii, hyphens)`);
      if (t.s && slugs.has(t.s)) errs.push(`food ${f.slug}: slug "${t.s}" duplicates ${slugs.get(t.s)}`);
      if (t.s) slugs.set(t.s, f.slug);
    }
    for (const k of Object.keys(foods)) if (!src.some((f) => f.slug === k)) errs.push(`food ${k}: not in source`);
  }
  if (errs.length) {
    failed = true;
    console.log(`✗ ${lang}: ${errs.length} problem(s)`);
    errs.slice(0, 60).forEach((e) => console.log("  -", e));
  } else console.log(`✓ ${lang}: ok`);
}
process.exit(failed ? 1 : 0);
