/**
 * Catch-all for every URL that matches no file. vercel.json rewrites /:path* here; Vercel applies
 * rewrites only after the filesystem, so real pages, assets and sitemaps never reach this function.
 *   - an old food-storage URL (seo/old-urls.json) → 301 to its new page (api/_redirects.js)
 *   - anything else                                → 301 to the home page
 */
import REDIRECTS from "./_redirects.js";

export default {
  fetch(request) {
    const url = new URL(request.url);
    let p = url.searchParams.get("p");
    p = p == null ? url.pathname : "/" + p.replace(/^\/+/, "");
    if (!p.endsWith("/")) p += "/";
    const dest = REDIRECTS[p] ?? REDIRECTS[decodeURIComponent(p)] ?? "/";
    return new Response(null, { status: 301, headers: { Location: dest, "Cache-Control": "public, max-age=86400" } });
  },
};
