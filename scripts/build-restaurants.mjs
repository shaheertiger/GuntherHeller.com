#!/usr/bin/env node
/**
 * data/restaurants/{chain}.json (scripts/extract-restaurants.py, from each chain's own nutrition guide)
 *   → data/restaurant-foods.json: one food record per menu item, in the same shape as data/nutrition.json foods
 *
 * src "R" = the chain's published values. Guides that give a serving weight (Arby's, Five Guys) become per-100 g
 * values like every other food. Guides that only name the serving (Dunkin': "1 Donut", "Medium") keep their
 * per-serving values with ps: true, and the site never shows a gram weight or per-100 g figure for them.
 * Which of the per-serving items get a page is decided by search demand (src/lib/nutrition.ts).
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const DIR = path.join(ROOT, "data/restaurants");
const slugify = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " and ").replace(/%/g, " percent ").replace(/['’]/g, "").split(/[^a-z0-9]+/).filter(Boolean).join("-");
const K = { kcal: "kcal", fat: "204", satFat: "606", transFat: "605", cholesterol: "601", sodium: "307", carbs: "205", fiber: "291", sugars: "269", protein: "203" };
const sig = (v) => (v === 0 ? 0 : +v.toPrecision(4));

/** Names as printed in a guide that mean little out of context. */
const RENAME = {
  "five-guys": {
    "Mini Five Guys Style": "Mini Fries (Five Guys Style)", "Little Five Guys Style": "Little Fries (Five Guys Style)",
    "Regular Five Guys Style": "Regular Fries (Five Guys Style)", "Large Five Guys Style": "Large Fries (Five Guys Style)",
    "Little Cajun Style": "Little Cajun Fries", "Regular Cajun Style": "Regular Cajun Fries", "Large Cajun Style": "Large Cajun Fries",
    "Vanilla Shake Base": "Vanilla Milkshake (base)", "Mini Vanilla Shake Base": "Mini Vanilla Milkshake (base)",
    "Chocolate": "Chocolate Shake Mix-in", "Oreo Crème": "Oreo Crème Shake Mix-in", "Peanut Butter": "Peanut Butter Shake Mix-in",
    "Salted Caramel": "Salted Caramel Shake Mix-in", "Banana Marinade": "Banana Shake Mix-in", "Blackberry Sauce": "Blackberry Shake Mix-in",
    "Reese's Peanut Butter Cup": "Reese's Peanut Butter Cup Shake Mix-in", "Whipped Cream": "Whipped Cream (shake topping)",
  },
};
const CAT = (name) => /\b(drink|tea|coffee|latte|brew|cappuccino|macchiato|espresso|refresher|lemonade|juice|milk\b|soda|coolatta|shake|frozen|chiller)\b/i.test(name) ? "beverages" : "fast-food-restaurants";

const foods = [];
const used = new Set();
for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith(".json")).sort()) {
  const d = JSON.parse(fs.readFileSync(path.join(DIR, file), "utf8"));
  const chain = d.chain;
  for (const [i, it] of d.items.entries()) {
    const name = RENAME[chain.slug]?.[it.name] ?? it.name;
    let slug = slugify(`${chain.name} ${name}`).slice(0, 80).replace(/-$/, "");
    if (used.has(slug)) slug = `${slug}-${i}`;
    used.add(slug);
    const ps = !it.g;
    const g = it.g ?? 100;
    const v = {};
    for (const [k, key] of Object.entries(K)) if (it[k] != null) v[key] = sig(ps ? it[k] : (it[k] * 100) / g);
    const label = ps ? (/^\d/.test(it.serving ?? "") ? it.serving.toLowerCase() : `1 ${(it.serving || "serving").toLowerCase()}`) : "1 serving";
    foods.push({
      id: 900000000 + foods.length, src: "R", chainSlug: chain.slug, desc: `${chain.name}, ${name}`, name: `${chain.name} ${name}`,
      cat: CAT(name), slug, p: [[label, g, ...(ps ? [1] : [])]], v, sim: [], ...(ps ? { ps: true } : {}),
      source: { name: d.source.name, url: d.source.url, date: d.source.date },
    });
  }
}
fs.writeFileSync(path.join(ROOT, "data/restaurant-foods.json"), JSON.stringify({ generated: new Date().toISOString().slice(0, 10), foods }));
const by = foods.reduce((m, f) => ((m[f.chainSlug] = (m[f.chainSlug] ?? 0) + 1), m), {});
console.log(`data/restaurant-foods.json: ${foods.length} menu items`, by);
