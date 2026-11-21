import type { APIRoute } from "astro";
import { NFOODS, commonServing, kcalIn } from "../lib/nutrition";

/** Site search index: [slug, name, calories per common serving, serving label, storage food?]. */
export const GET: APIRoute = () => {
  const rows = NFOODS.map((f) => {
    const s = commonServing(f);
    return [f.slug, f.name, kcalIn(f, s.grams), s.label, f.storage ? 1 : 0];
  });
  return new Response(JSON.stringify(rows), { headers: { "content-type": "application/json" } });
};
