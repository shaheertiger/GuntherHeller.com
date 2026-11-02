import { index } from "../lib/sitemap";
export const GET = () => new Response(index(), { headers: { "content-type": "application/xml" } });
