# SEO operations

## Disavow (expired-domain cleanup)
guntherheller.com is an expired domain with ~2.7K referring domains, including Brazilian-dental
and "SEO service" anchor spam. Once the property is verified in Search Console:

1. Export backlinks (Search Console → Links → Export latest links, or Ahrefs/Semrush CSV with anchors).
2. `npm run disavow -- ~/Downloads/backlinks.csv`
3. Read `seo/disavow-review.csv`; delete any line for a real, relevant site from `seo/disavow.txt`.
4. Upload `seo/disavow.txt` at https://search.google.com/search-console/disavow-links.

No disavow file is committed yet because it must be built from the real export.

## Launch checklist
- [ ] Vercel: import the repo (framework auto-detected as Astro; `vercel.json` sets build, headers, trailing slashes).
- [ ] Vercel → Domains: `www.guntherheller.com` is the primary domain (no redirect); `guntherheller.com` redirects to it (308). Canonicals, hreflang and sitemaps all use the www host, so the domain setting must match. Do not add a host redirect in vercel.json as well: it loops.
- [ ] Google Search Console: add a **Domain** property for `guntherheller.com` and verify with the DNS TXT record
      (or a URL-prefix property: set `PUBLIC_GOOGLE_SITE_VERIFICATION` in Vercel env vars and redeploy — the home page then carries the meta tag).
- [ ] Search Console → Sitemaps: submit `https://www.guntherheller.com/sitemap.xml` (an index of foods, questions, hubs, es, de, fr, pt-br).
- [ ] Bing Webmaster Tools: *Import from Google Search Console* (or set `PUBLIC_BING_SITE_VERIFICATION`), submit the same sitemap.
- [ ] **Recovery (Nov 2026): do not ping IndexNow and do not mass-request indexing.** See `seo/recovery-2026-11.md`
      for the release and 4-week freeze plan. The sitemap's per-page lastmod (`data/lastmod.json`) tells crawlers what changed.
- [ ] Ads: replace the `.ad-slot` placeholders (`src/components/AdSlot.astro`) with the network's tags; keep the fixed sizes so CLS stays 0, and add a consent banner before personalised ads in the EU/UK.

## What crawlers get
- `/sitemap.xml` → index of `/sitemap-pages.xml` and `/sitemap-foods-1.xml`. Each URL's `lastmod` is the day its own
  data last changed (`node scripts/build-lastmod.mjs` → `data/lastmod.json`); each index entry carries the newest date
  in its sitemap. The build fails if a sitemap lists a missing or noindex page, misses an indexable one, or uses one
  date for everything.
- Foods with a page: `data/proven.json` (foods with Google impressions, `node scripts/build-proven.mjs Pages.csv`).
  Every other food URL, the shelf-life tools, restaurants and brands return 410 Gone (`src/lib/gone.mjs`).
- `/robots.txt` → allows search and AI answer engines, blocks `/search/` and utm duplicates, points at the sitemap.
- Favicons: `/favicon.ico` (16/32/48), `/favicon.svg`, `/favicon-96x96.png`, `/apple-touch-icon.png`, `/site.webmanifest`
  (192/512 PNG). Regenerate with `npm run favicons`.
- IndexNow key: `/3bd059f3c9c14a02d8bc66cb837d6ea2.txt` (public by design).
