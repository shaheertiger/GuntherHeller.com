# Figures: art direction

Every indexable page gets a hero and 3–6 in-body figures, rendered from the same data the page
prints. This file is the brief; `src/figures/system.css` is the system; `docs/figures-specimen.png`
shows one of every card.

## Point of view

**A storage chart you could pin inside a kitchen cupboard door, drawn by a data desk.**
The site already reads as a clean reference (white ground, DM Sans, indigo accent, paper tiles).
The figures push that toward editorial food print — NYT Cooking's confidence with a headline,
The Pudding's habit of letting one number carry the story, Stripe Press's flat colour planes —
without stock photos, clip-art, plates or garnish.

- **One bold thing per image.** In a hero that is the number ("4–6"), set enormous in a condensed
  grotesk. In a body figure it is the data mark (the bar, the gauge, the step number). Everything
  else is quiet: one serif headline, sentence-case labels, a footer.
- **Colour means a place.** Warm = counter/pantry, cool = fridge, icy = freezer. Colour is never
  decoration; if a shape is amber it is about room temperature.
- **Food as geometry.** Each food family is a silhouette built from 2–4 primitives (ellipse, slab,
  triangle) in two tones of the zone colour. Recognisable at 120 px, never a drawing of a product.
- **Numbers are the copy.** Every figure's numbers come from the page's data; labels come from the
  page's locale file. Nothing is typed into an image by hand.
- **No calls to action.** No app badges, downloads, logins or "try it" — the wordmark is the only
  branding and it is small.

## Type

| Role | Face | Size at 1200×675 | Notes |
| --- | --- | --- | --- |
| Hero number | Archivo, wdth 62–75, wght 800 | fitted, 180–300 px | tabular figures, tight tracking |
| Display / answer | Archivo wdth 75, wght 760 | 72–84 px | tabular |
| Figure headline | Newsreader (display opsz), wght 560 | 60 px | the editorial voice; one per figure |
| Sub / lead | DM Sans 500 | 34 px | the site's own face |
| Label | DM Sans 500–600 | 30 px (min 28; DE may drop to 26) | sentence case, never tracked caps |
| Data value | Archivo wdth 80, wght 700 | 40–56 px | tabular |
| Footer | DM Sans 500 | 28 px | wordmark + source |

Rules: no all-caps labels, no monospace, no middle-dot meta strings, no arrows on text, no single
accented word in a headline.

## Colour

| Token | Hex | Use |
| --- | --- | --- |
| ink | `#18181b` | text, line icons (site ink) |
| muted | `#565661` | secondary text (7.0:1 on white) |
| ground | `#ffffff` | figure background |
| mist | `#eef0f3` | empty tracks, rules |
| accent | `#4a3bd2` | key accent: wordmark, step numbers, focus of the system (site primary) |
| pantry | `#e39a2d` field · `#7a4a06` text · `#fcefd9` tint | warm |
| fridge | `#2aa497` field · `#0b5c54` text · `#d9f2ee` tint | cool |
| freezer | `#7cc0f2` field · `#1d4f96` text · `#e6f3fd` tint | icy |
| safe ✓ | `#1d6b42` on `#e5f4ec` | passes AA (≥ 4.5:1) on both white and tint |
| discard ✗ | `#b2261b` on `#fde9e6` | passes AA on both |

Zone tokens replace the site's old counter/fridge/freezer colours in `global.css`, so the on-page
widgets and the images use one palette.

## Layout

1200×675, 8 px grid, 72 px margins (content box 1056×531). Headline top-left, data in the middle
band, footer on the bottom margin line: GH roundel + "Gunther Heller" left, source right.

```
 hero                                         body figure
┌───────────────────────────────────────┐    ┌───────────────────────────────────────┐
│ Cooked rice              ▓▓▓▓▓▓▓▓▓▓▓▓▓│    │ How long cooked rice lasts            │
│                        ▓▓ (silhouette)│    │ Raw vs cooked, USDA FoodKeeper        │
│ 4–6                    ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│    │ Fridge   ███▏ 4–6 days                │
│ days in the fridge     ▓▓ zone field ▓│    │ Freezer  ██████████████████ 6 months  │
│ Freezer: 6 months      ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│    │                                       │
│ (GH) Gunther Heller    ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│    │ (GH) Gunther Heller   USDA FoodKeeper │
└───────────────────────────────────────┘    └───────────────────────────────────────┘
```

Heroes vary per page, deterministically from the page path: field shape (slab, quarter disc, tall
column), silhouette scale/rotation/crop, a low-contrast texture (ruled lines, dot grid, arcs), and of
course the number and zone. Text always sits left on white so the family stays recognisable.

Radii: 28 px on fields, 10 px on bar ends and chips, 999 px on pills. One elevation, used only on
gauge markers. Icons: 48 px grid, 3 px round stroke, no fills except the check/cross discs.

## Card types

answer (hero) · shelf-life · temperature · steps · signs · versus · matrix · callout — see
`src/figures/html.mjs` for markup and `src/figures/cards.ts` for which page gets which card.

## Mobile

At 360 px a 1200 px figure is drawn at 0.3×, so a 30 px label is ~9 px. Each figure is designed so
its one important thing (the number, the bars, the verdict) is ≥ 56 px on the canvas (≥ 17 px on a
phone); small labels repeat what the page text already says next to the figure.
