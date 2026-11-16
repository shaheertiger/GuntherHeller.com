import type { APIRoute } from "astro";
import { NFOODS, defaultServing, per } from "../lib/nutrition";

/** Site search index: [slug, name, calories per default serving, serving label, storage food?]. */
export const GET: APIRoute = () => {
  const rows = NFOODS.map((f) => {
    const s = defaultServing(f);
    return [f.slug, f.name, Math.round(per(f.v.kcal, s[1])), s[0], f.storage ? 1 : 0];
  });
  return new Response(JSON.stringify(rows), { headers: { "content-type": "application/json" } });
};
