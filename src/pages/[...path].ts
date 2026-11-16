/**
 * The one on-demand route (Vercel function). Every page is prerendered, and static routes win over
 * this rest route, so only URLs with no page land here:
 *   - an old food-storage URL (seo/old-urls.json) → 301 to its new page (data/old-redirects.json)
 *   - anything else                                → 301 to the home page
 */
import type { APIRoute } from "astro";
import OLD from "../../data/old-redirects.json";

export const prerender = false;
const MAP = OLD as Record<string, string>;

export const GET: APIRoute = ({ url }) => {
  let p = url.pathname;
  if (!p.endsWith("/")) p += "/";
  let dest = MAP[p];
  if (!dest) try { dest = MAP[decodeURIComponent(p)]; } catch {}
  return new Response(null, { status: 301, headers: { Location: dest ?? "/", "Cache-Control": "public, max-age=86400" } });
};
export const HEAD = GET;
