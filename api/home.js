/**
 * Catch-all: any URL that matches no page (and no entry in redirects.json) gets a permanent
 * redirect to the home page. vercel.json rewrites everything to this function; Vercel applies
 * rewrites only after the filesystem, so real pages, assets and sitemaps are never affected.
 */
export default {
  fetch() {
    return new Response(null, { status: 301, headers: { Location: "/", "Cache-Control": "public, max-age=3600" } });
  },
};
