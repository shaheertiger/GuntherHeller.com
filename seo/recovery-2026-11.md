# guntherheller.com: November 2026 traffic loss, findings and recovery build

Written 21 Nov 2026. Data: the Search Console Performance export (web search, 1–21 Nov 2026) the owner downloaded,
the Bing Webmaster API, a live HTTP check of every old URL, and the git history. Raw exports are not committed; the
numbers below are copied from them.

## The short version

1. **The drop came before the core update.** Impressions fell from 81,741 on Nov 7 to 7,957 on Nov 8 and 110 on Nov 9.
   The November core update started on Nov 10. Whatever happened, it happened on Nov 8.
2. **The site never ranked for calories.** Every impression it ever earned came from the old shelf-life pages
   ("how long does X last", "does X go bad", "X left out overnight", and German/Spanish/French/Portuguese versions).
   Of the top 1,000 queries, 0 are about calories or nutrition. No /calories/, /food/, /restaurants/, /brands/ or
   /tools/ URL appears among the 1,000 pages in the export.
3. **Bing never ranked it either:** 0 clicks and 0 impressions on every day Bing reports (Nov 14–19), with 2,471 URLs in
   Bing's index.
4. **No manual action** (owner checked Security & Manual Actions on 21 Nov).
5. Most likely cause: an algorithmic spam demotion (scaled content / expired-domain signals) on a 5-day-old,
   re-registered expired domain, triggered hours after the site grew to 12 languages. See "Why" below.

What this PR does about it: it builds the site only around the foods Google actually showed it for (547 foods), as
one-topic calorie pages, deletes everything else with 410 Gone, and stops the churn. Nothing is deployed by this PR.

## 1. Daily clicks and impressions (Google, whole site)

| Date (PT) | Clicks | Impressions | Avg. position | What changed in git that day (EST) |
|---|---:|---:|---:|---|
| Nov 1–2 | 0 | 0 | – | Nov 2: site built, ES/DE/FR/PT-BR editions |
| Nov 3 | 1 | 541 | 8.4 | |
| Nov 4 | 35 | 14,090 | 10.2 | 1,200-word pages in every language; mascot |
| Nov 5 | 117 | 39,736 | 9.2 | GTM tag; +135 foods in 5 languages |
| Nov 6 | 214 | 62,055 | 8.9 | AdSense; +31 foods |
| **Nov 7** | **271** | **81,741** | 8.5 | 21:28 and 21:52: Italian, Dutch, Swedish, Norwegian, Danish, Finnish, Japanese |
| **Nov 8** | **38** | **7,957** | 9.1 | 00:16 link fixes, 00:55 +21 foods; 16:39 revert (#8); 23:39 apex → www host switch (#9) |
| Nov 9 | 1 | 110 | 19.6 | |
| Nov 10 | 0 | 111 | 22.7 | core update starts; generated figures on every page (#11) |
| Nov 11 | 1 | 101 | 25.5 | 209 pages cut (#13), localized titles, "PAA" questions |
| Nov 12–15 | 2 | 239 | 28–53 | |
| Nov 16 | 1 | 28 | 25.3 | rebuilt as a calories site, 6,561 old-URL 301s (#17–#20) |
| Nov 17–19 | 2 | 74 | 13–27 | |
| Nov 20 | 0 | 23 | 9.5 | restaurants and store brands (#21–#23) |
| Nov 21 | 0 | 7 | 4.1 | partial day |
| **Total** | **683** | **206,813** | | |

Search Console days are Pacific time. Nov 8 kept only ~10% of a normal day, so the fall started early on Nov 8 PT:
after the seven new languages (Nov 7 evening) and before the revert (Nov 8, 13:39 PT) and the host switch (Nov 8,
20:39 PT). The revert and the host switch made a bad day worse; they did not start it.

**Did it ever rank well?** For five days, yes: average position 8.5–10, 81K impressions a day, CTR 0.25–0.48%. That
is typical of a new site's first days. Then it fell to positions 20–50 and ~20 impressions a day, and stayed there.

## 2. By section (Google, Nov 1–21)

The export has per-page totals for the whole period, not per day, so this is the split of everything the site ever
earned. Every one of these URLs is an old shelf-life URL that now 301s to a /calories/ page.

| Section | Pages with impressions | Clicks | Impressions |
|---|---:|---:|---:|
| German (`/de/haltbarkeit-…`) | 293 | 228 | 34,384 |
| English "does X go bad" | 235 | 123 | 29,764 |
| English "X left out overnight" | 92 | 40 | 15,645 |
| Spanish (`/es/cuanto-dura-…`) | 127 | 70 | 15,054 |
| French | 140 | 142 | 5,971 |
| English "how long does X last" | 47 | 30 | 3,567 |
| Portuguese (`/pt-br/`) | 43 | 31 | 3,198 |
| English "can you freeze X" | 20 | 18 | 598 |
| Dutch, Japanese, `/foods/` hub | 3 | 3 | 11 |
| **/calories/, /food/, /restaurants/, /brands/, /tools/** | **0** | **0** | **0** |

Hosts: `guntherheller.com` (apex) 471 pages, 52,858 impressions; `www.guntherheller.com` 529 pages, 55,334.

Countries: United States 52,897 impressions (123 clicks), Germany 43,271 (166), France 13,723 (112), Brazil 12,199,
Mexico 11,929, Canada 8,147, United Kingdom 8,049. Devices: mobile 176,867 impressions at position 7.4, desktop
26,904 at 19.3.

**Pages earning impressions now:** the site gets ~20 impressions a day (Nov 16–21: 132 in total). The export is
sorted by clicks, then impressions: every page with a click is in it, and zero-click pages down to 89 impressions. No
/calories/ page is in it, so each one has had no click and fewer than 89 impressions; together they cannot have had
more than the 132 the whole site earned since Nov 16.

## 3. Top queries and pages

The first (and only) ranking period was Nov 3–8; the export's 21 days are effectively the last 28 days as well, so the
two lists are the same.

Top pages by impressions: `/cooked-pasta-left-out-overnight/` (700), `/ground-beef-left-out-overnight/` (579),
`/cut-fruit-left-out-overnight/` (575), `/de/haltbarkeit-suppe/` (553), `/cooked-rice-left-out-overnight/` (530),
`/de/haltbarkeit-leber/` (527), `/does-bagels-go-bad/` (518). Top pages by clicks: `/de/haltbarkeit-ente/` (5),
`/de/haltbarkeit-kaninchen/` (5), `/how-long-does-beef-tongue-last/` (5), `/de/haltbarkeit-leinsamen-geschrotet/` (4),
`/de/haltbarkeit-rote-currypaste/` (4).

Top queries by impressions: "how long are roasted pumpkin seeds good for" (132), "kann brauner zucker schlecht werden"
(73), "la crema de cacahuate se refrigera" (64), "wie lange halten karotten im kühlschrank" (37), "rice left out
overnight" (34). 1,000 queries carry only 9,297 of the 206,813 impressions: the rest is long tail Google anonymises.

17 queries name **conservation-sante.fr** (another site), which suggests Google was testing this domain on that
site's queries, a sign of how new and unsettled its rankings were.

## 4. Bing (Webmaster API)

| | Nov 14 | Nov 15 | Nov 16 | Nov 17 | Nov 18 | Nov 19 | Nov 20 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Clicks / impressions | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | – |
| URLs in index | – | 1,386 | 2,129 | 2,129 | 2,237 | 2,237 | 2,471 |
| Pages crawled that day | – | 521 | 176 | 45 | 16 | 9 | 4 |
| 301s seen (cumulative) | – | 1 | 1 | 1 | 2 | 2 | 2 |

No query or page stats (empty), no crawl issues, no blocked URLs. diagxcar.com is also at 0 / 0 on Bing.

## 5. URL Inspection and index coverage: not done

The Search Console API answers 403 for every guntherheller.com property: the service account in this environment
(`GOOGLE_CLIENT_EMAIL`) only has access to another site. To run URL Inspection and coverage counts, add that service
account as a user (Full) on the `sc-domain:guntherheller.com` property in Search Console → Settings → Users and
permissions, then re-run. Until then, please check these by hand in the UI:

- Pages → "Crawled – currently not indexed", "Discovered – currently not indexed", "Duplicate, Google chose different
  canonical": counts and examples.
- URL Inspection on: `/`, `/calories/eggs/`, `/calories/cooked-rice/`, `/calories/shrimp/`, `/food/fruits/`,
  `/food/high-protein-foods/`, `/de/haltbarkeit-ente/`, `/does-bagels-go-bad/`, `/cooked-pasta-left-out-overnight/`,
  `/restaurants/mcdonalds/`.
- Settings → Crawl stats → by response: how many 301s Googlebot fetched per day since Nov 16.

## 6. The 6,561 old URLs

- **Live check (21 Nov):** all 6,561 return 301 to exactly the page `data/old-redirects.json` names.
- **How many Google still crawls:** unknown without the API or Crawl stats (Vercel keeps no request logs on this plan,
  and the redirect function logs nothing). Bing has fetched only 2 of them.
- 3,744 of them are DE/ES/FR/PT-BR pages that now land on an English calorie page, and 1,849 land on a storage anchor
  (`#bad`, `#freeze`, `#leftout`) of a calorie page. Google sees both as a topic change, which makes the redirects
  unlikely to carry much.
- Every URL the site doesn't know (not a page, not in the map) also 301s to the home page; Google usually treats that
  as a soft 404.
- After this PR: 3,947 still 301 (their food has a page), 2,614 return 410 because their page was removed (one hop,
  instead of 301 → 410), and 2 new ones point the Thai red curry paste URLs at its new page.

## 7. Page types (before = main, after = this PR)

| Page type | Before: pages | indexable | in sitemap | After: pages | indexable | in sitemap |
|---|---:|---:|---:|---:|---:|---:|
| /calories/ food pages | 13,650 | 3,161 | 3,161 | 547 | 547 | 547 |
| /food/ categories and nutrient lists | 45 | 45 | 45 | 43 | 43 | 43 |
| /food/ hub | 1 | 1 | 1 | 1 | 1 | 1 |
| /restaurants/ (hub + 22 chains) | 23 | 23 | 23 | 0 | 0 | 0 |
| /brands/ (hub + 7 store brands) | 8 | 8 | 8 | 0 | 0 | 0 |
| /tools/ (hub + 5 shelf-life tools) | 6 | 6 | 6 | 0 | 0 | 0 |
| Home | 1 | 1 | 1 | 1 | 1 | 1 |
| Trust pages, reviewer, search | 8 | 7 | 7 | 8 | 7 | 7 |
| **Total** | **13,742** | **3,252** | **3,252** | **600** | **599** | **599** |

Sitemap lastmod values: before 1 (every URL `2026-11-20`); after 2 distinct dates, each from the page's own data.

## Why it was hit (ranked by how well the evidence fits)

1. **Spam systems on a new, expired domain (most likely).** The domain was re-registered on Nov 2 (seo/README.md
   calls it "an expired domain with ~2.7K referring domains", including anchor spam). Within 5 days it had thousands of
   templated pages in 5 languages, and on Nov 7 it added 7 more languages overnight. The fall started within hours and
   was site-wide, across every language and both hosts at once. That is how a site-level spam classification
   (scaled content abuse, expired domain abuse) looks, not how a core update looks. No manual action, so it is
   algorithmic and lifts only when the signals change and Google re-evaluates the site, usually over weeks to months.
2. **Churn after the fall.** Revert, host switch, generated figures, 209 pages cut, a full rebuild into a different
   topic with 6,561 redirects, then restaurants and brands. Each change restarted Google's evaluation of a site it had
   just demoted.
3. **The new topic never had a chance to rank.** The calorie pages launched on Nov 16 into a demoted domain, in a
   space owned by USDA, Nutritionix, CalorieKing and EatThisMuch, with 13,650 pages (10,489 noindex), all with one
   lastmod and a dietitian "review" dated on all 13,726 pages at once.
4. **Overlap with diagxcar.com.** Same foods, same template, same AdSense account and reviewer. A real but minor
   factor; the owner keeps the AdSense ID and the reviewer shared (decision, 21 Nov).

Not the cause: the core update (it started after the fall), and a manual action (none).

## What a 4-day-old site that is not being suppressed looks like

The owner also shared besthometheaterreview.com's export (same owner, launched ~Nov 17). It is one day of hourly
data plus 21 days, so it is a contrast, not proof:

- Impressions started on Nov 18 and grew through the core update: 282 → 1,162 → 1,461 (Nov 18–20).
- One language, one topic, ~250 pages, no rebuilds.
- 160 single-product pages earned 24 of its 39 clicks, ranking for the exact product name ("hisense u7sg", position
  3.9). Its "A vs B" compare pages averaged 4.6 impressions each; we are not copying those.
- Pages lead with the answer, then specs, alternatives and an FAQ; real `datePublished`/`dateModified`.

guntherheller.com also looked fine on day 5 (81K impressions), so the difference that matters is what came next:
scale and churn.

## Rollout plan

1. **Now:** this PR, unmerged. Nothing deploys from it.
2. **Wait** until at least Nov 26, and until Search Console shows a week with no ranking movement (daily impressions
   and average position flat).
3. **Before merging:** re-export Search Console Pages (same 1 Nov–now range, or the API once the service account has
   access) and run `node scripts/build-proven.mjs Pages.csv "<range>"`, then `node scripts/build-lastmod.mjs` and
   `npm run build`. If a food has started earning impressions on its own, it joins the list then, not later.
4. **Release** on the owner's "merge": one deploy, every page at once. Do not ping IndexNow, do not resubmit
   everything: the sitemap index is already submitted, and its lastmod dates tell Google what changed.
5. **Then freeze for 4 weeks:** no new URLs, no removed URLs, no new page types, no title rewrites. Template bug fixes
   only.
6. **Every week:** Search Console Performance (impressions, average position, pages with impressions), Pages report
   (the 410s dropping out; "Crawled – currently not indexed" for /calories/), Crawl stats (410/301 volume).
7. **Decide after 4 weeks**, with data: the USDA-variant groups (PR), adding servings for the 31 foods that have none,
   and whether any removed food is worth bringing back.
