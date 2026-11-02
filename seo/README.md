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
- [ ] Search Console: verify the domain property (DNS TXT), submit `https://guntherheller.com/sitemap.xml`.
- [ ] Request indexing for the top 50 URLs: `node -e 'const d=require("./data/foods.json");d.foods.slice(0,50).forEach(f=>console.log("https://guntherheller.com/how-long-does-"+f.slug+"-last/"))'`
- [ ] Bing Webmaster Tools: import from Search Console.
- [ ] Ads: replace the `.ad-slot` placeholders (`src/components/AdSlot.astro`) with the network's tags; keep the fixed sizes so CLS stays 0, and add a consent banner before personalised ads in the EU/UK.
