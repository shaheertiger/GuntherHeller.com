#!/usr/bin/env node
/**
 * seo/usda-spotcheck.json: per-100 g calories, protein, carbs and fat for 5 foods, fetched straight from USDA
 * FoodData Central (not from our data files). scripts/check-build.mjs compares each built page's "100 g" row with
 * these numbers, so a bug in the import or the template that changes a number fails the build.
 *
 *   node scripts/usda-spotcheck.mjs        (needs network; re-run when you re-import USDA data)
 *
 * One food per dataset: FNDDS (eggs, cooked rice), Foundation Foods (cod), SR Legacy (barley), Branded (Thai red
 * curry paste). Uses FDC's public food-details endpoint, which needs no API key.
 */
import { writeFileSync } from "node:fs";

const FOODS = { eggs: 2707152, "cooked-rice": 2708402, cod: 2684444, barley: 170284, "thai-red-curry-paste": 2608324 };
// Energy in the same order as scripts/import-fdc.mjs: kcal (208), else Atwater specific (958), else Atwater general
// (957). FDC's web endpoint rounds energy to whole kcal, so check-build allows ±1 kcal.
const ENERGY = ["208", "958", "957"];
const out = {};
for (const [slug, id] of Object.entries(FOODS)) {
  const r = await fetch(`https://fdc.nal.usda.gov/portal-data/external/${id}`);
  if (!r.ok) throw new Error(`FDC ${id}: HTTP ${r.status}`);
  const j = await r.json();
  const v = {}, energy = {};
  for (const n of j.foodNutrients ?? []) {
    const num = n.nutrient?.number, amt = n.amount ?? n.value, unit = n.nutrient?.unitName ?? n.nutrient?.nutrientUnit?.name;
    if (num == null || amt == null) continue;
    if (ENERGY.includes(num) && unit?.toLowerCase() === "kcal") energy[num] ??= amt;
    if (["203", "204", "205"].includes(num) && v[num] == null) v[num] = amt;
  }
  v.kcal = ENERGY.map((k) => energy[k]).find((x) => x != null);
  out[slug] = { fdcId: id, description: j.description, per100g: { kcal: v.kcal, protein: v["203"], carbs: v["205"], fat: v["204"] } };
  console.log(slug, JSON.stringify(out[slug]));
}
writeFileSync(new URL("../seo/usda-spotcheck.json", import.meta.url), JSON.stringify({ fetched: new Date().toISOString().slice(0, 10), source: "https://fdc.nal.usda.gov/portal-data/external/{fdcId}", foods: out }, null, 1) + "\n");
