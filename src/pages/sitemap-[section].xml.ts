import type { APIRoute } from "astro";
import { SECTIONS, urlset } from "../lib/sitemap";
export function getStaticPaths() {
  return Object.keys(SECTIONS).map((section) => ({ params: { section } }));
}
export const GET: APIRoute = ({ params }) =>
  new Response(urlset(SECTIONS[params.section!]()), { headers: { "content-type": "application/xml" } });
