/**
 * The one on-demand route (Vercel function). Every page is prerendered, and static routes win over
 * this rest route, so only URLs with no page land here. The rules live in src/lib/gone.mjs:
 *   - an old food-storage URL (data/old-redirects.json) → 301 to its page, or 410 if that page was removed
 *   - a removed page (food without proven impressions, shelf-life tools, restaurants, brands) → 410 Gone
 *   - anything else → 301 to the home page
 */
import type { APIRoute } from "astro";
import OLD from "../../data/old-redirects.json";
import PROVEN from "../../data/proven.json";
import { makeResolver, GONE_FOOD_PAGES } from "../lib/gone.mjs";

export const prerender = false;
const proven = new Set(Object.keys((PROVEN as { foods: Record<string, unknown> }).foods).map((s) => `/calories/${s}/`));
const live = { has: (p: string) => (p.startsWith("/calories/") ? proven.has(p) : !GONE_FOOD_PAGES.includes(p)) } as Set<string>;
const resolve = makeResolver(OLD as Record<string, string>, live);

const GONE_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Page removed | Gunther Heller</title></head><body style="font:16px/1.5 system-ui,sans-serif;max-width:560px;margin:15vh auto;padding:0 16px"><h1>This page was removed</h1><p>We now publish nutrition facts only for the foods people look up most. <a href="/food/">Browse all foods</a> or <a href="/search/">search</a>.</p></body></html>`;

export const GET: APIRoute = ({ url }) => {
  const r = resolve(url.pathname);
  if (r.status === 410) return new Response(GONE_HTML, { status: 410, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=86400", "X-Robots-Tag": "noindex" } });
  return new Response(null, { status: 301, headers: { Location: r.location!, "Cache-Control": "public, max-age=86400" } });
};
export const HEAD = GET;
