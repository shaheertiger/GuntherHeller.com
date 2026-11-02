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
- [ ] Vercel → Domains: add `guntherheller.com` and `www.guntherheller.com` (www redirects to apex via `vercel.json`).
- [ ] Google Search Console: add a **Domain** property for `guntherheller.com` and verify with the DNS TXT record
      (or a URL-prefix property: set `PUBLIC_GOOGLE_SITE_VERIFICATION` in Vercel env vars and redeploy — the home page then carries the meta tag).
- [ ] Search Console → Sitemaps: submit `https://guntherheller.com/sitemap.xml` (an index of foods, questions, hubs, es, de, fr, pt-br).
- [ ] Bing Webmaster Tools: *Import from Google Search Console* (or set `PUBLIC_BING_SITE_VERIFICATION`), submit the same sitemap.
- [ ] After every deploy that adds or changes pages: `npm run build && npm run indexnow` (Bing, Yandex, Naver, Seznam).
- [ ] Request indexing for the top 50 URLs: `node -e 'const d=require("./data/foods.json");d.foods.slice(0,50).forEach(f=>console.log("https://guntherheller.com/how-long-does-"+f.slug+"-last/"))'`
- [ ] Ads: replace the `.ad-slot` placeholders (`src/components/AdSlot.astro`) with the network's tags; keep the fixed sizes so CLS stays 0, and add a consent banner before personalised ads in the EU/UK.

## What crawlers get
- `/sitemap.xml` → index of `/sitemap-{foods,questions,hubs,es,de,fr,pt-br}.xml`, each URL with `lastmod`
  and its hreflang alternates (`xhtml:link`). The build fails if a sitemap lists a missing page or misses an indexable one.
- `/robots.txt` → allows search and AI answer engines, blocks `/search/` and utm duplicates, points at the sitemap.
- Favicons: `/favicon.ico` (16/32/48), `/favicon.svg`, `/favicon-96x96.png`, `/apple-touch-icon.png`, `/site.webmanifest`
  (192/512 PNG). Regenerate with `npm run favicons`.
- IndexNow key: `/3bd059f3c9c14a02d8bc66cb837d6ea2.txt` (public by design).
