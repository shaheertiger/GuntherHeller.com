import type { APIRoute } from "astro";
import { SECTIONS, urlset, type Section } from "../lib/sitemap";
export function getStaticPaths() {
  return Object.keys(SECTIONS).map((section) => ({ params: { section } }));
}
export const GET: APIRoute = ({ params }) =>
  new Response(urlset(SECTIONS[params.section as Section]()), { headers: { "content-type": "application/xml" } });
