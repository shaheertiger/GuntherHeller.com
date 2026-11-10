/**
 * Figure icon set and food-family silhouettes. Pure data, shared by the renderer and the specimen.
 *
 * Icons: 48×48 grid, 3 px round stroke, drawn in currentColor. `fill` paths are solid.
 * Silhouettes: 400×400 box, each built from a few primitives in two tones ("a" = zone field
 * colour, "b" = deeper tone, "c" = ground-coloured cut-outs) so they read as flat planes.
 */

export const ICONS = {
  pantry: { d: "M8 8h32v32H8z M8 20h32 M8 31h32 M14 14v6 M20 12v8 M27 25v6 M33 23v8" },
  fridge: { d: "M12 5h24a3 3 0 013 3v32a3 3 0 01-3 3H12a3 3 0 01-3-3V8a3 3 0 013-3z M9 19h30 M15 11v4 M15 24v8" },
  freezer: { d: "M24 4v40 M7 14l34 20 M41 14L7 34 M18 6l6 5 6-5 M18 42l6-5 6 5 M5 21l8-2-2-8 M43 27l-8 2 2 8" },
  counter: { d: "M4 30h40 M8 30v12 M40 30v12 M14 30c0-7 4-12 10-12s10 5 10 12 M24 14v4" },
  jar: { d: "M14 10h20v6c4 2 6 6 6 10v14a3 3 0 01-3 3H11a3 3 0 01-3-3V26c0-4 2-8 6-10z M12 10h24 M12 26h24" },
  container: { d: "M6 18h36v20a3 3 0 01-3 3H9a3 3 0 01-3-3z M4 12h40v6H4z M18 15h12" },
  bag: { d: "M10 10h28v30a3 3 0 01-3 3H13a3 3 0 01-3-3z M10 16h28 M10 10l2-4h24l2 4 M17 26h14 M17 32h9" },
  foil: { d: "M6 14l12-6 24 10-12 6z M6 14v18l24 10V24 M30 42l12-6V18 M12 22l6 2 M14 28l8 3" },
  thermometer: { d: "M20 30V9a4 4 0 018 0v21a8 8 0 11-8 0z M24 18v16 M32 12h5 M32 18h5 M32 24h5" },
  clock: { d: "M24 6a18 18 0 110 36 18 18 0 010-36z M24 14v10l7 5" },
  calendar: { d: "M7 11h34v30H7z M7 19h34 M15 5v10 M33 5v10 M14 27h5 M22 27h5 M30 27h5 M14 34h5 M22 34h5" },
  mould: { d: "M24 8a16 16 0 110 32 16 16 0 010-32z", fill: "M18 18a3 3 0 110 6 3 3 0 010-6z M28 15a2 2 0 110 4 2 2 0 010-4z M29 25a4 4 0 110 8 4 4 0 010-8z M19 29a2 2 0 110 4 2 2 0 010-4z" },
  smell: { d: "M12 40c-4-6 4-10 0-16s4-10 0-16 M24 40c-4-6 4-10 0-16s4-10 0-16 M36 40c-4-6 4-10 0-16s4-10 0-16" },
  colour: { d: "M24 6a18 18 0 110 36 18 18 0 010-36z M24 6v36", fill: "M24 6a18 18 0 010 36z" },
  texture: { d: "M6 14c6-4 12 4 18 0s12-4 18 0 M6 24c6-4 12 4 18 0s12-4 18 0 M6 34c6-4 12 4 18 0s12-4 18 0" },
  look: { d: "M4 24s7-13 20-13 20 13 20 13-7 13-20 13S4 24 4 24z M24 18a6 6 0 110 12 6 6 0 010-12z" },
  thaw: { d: "M24 6c7 10 12 17 12 23a12 12 0 01-24 0c0-6 5-13 12-23z M19 30a5 5 0 005 5" },
  check: { disc: true, d: "M15 24l6 6 12-13" },
  cross: { disc: true, d: "M17 17l14 14 M31 17L17 31" },
  pack: { d: "M8 14l16-8 16 8v20l-16 8-16-8z M8 14l16 8 16-8 M24 22v20" },
  pests: { d: "M24 14a6 8 0 110 16 6 8 0 010-16z M24 14v-4 M18 20l-8-4 M30 20l8-4 M18 26H8 M30 26h10 M19 31l-7 6 M29 31l7 6 M24 30v12" },
  heat: { d: "M24 6c4 6 10 10 10 20a10 10 0 01-20 0c0-6 4-10 4-14 4 2 6 6 6 6z" },
  knife: { d: "M6 38L34 10l6 6-24 24z M34 10l4-4" },
  hand: { d: "M16 26V12a3 3 0 016 0v12 M22 22V8a3 3 0 016 0v14 M28 22v-10a3 3 0 016 0v16c0 9-5 14-12 14-6 0-9-3-12-8l-5-9a3 3 0 015-3l4 5" },
};

export function icon(name, { size = 48, stroke = 3, color = "currentColor", disc = null } = {}) {
  const ic = ICONS[name] ?? ICONS.pack;
  const discEl = ic.disc ? `<circle cx="24" cy="24" r="22" fill="${disc ?? "currentColor"}" stroke="none"/>` : "";
  const strokeColor = ic.disc ? "#fff" : color;
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true">${discEl}${ic.fill ? `<path d="${ic.fill}" fill="${color}"/>` : ""}<path d="${ic.d}" fill="none" stroke="${strokeColor}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

/* ---------------------------------------------------------------- silhouettes (400×400) */
// Each entry: list of [tone, svg-element-string]. tone a = field, b = deep, c = ground cut-out.
export const SILHOUETTES = {
  dairy: [ // carton
    ["a", `<path d="M110 150l90-80 90 80v220H110z"/>`],
    ["b", `<path d="M200 70l90 80H110z"/>`],
    ["c", `<rect x="140" y="220" width="120" height="70" rx="12"/>`],
    ["b", `<rect x="180" y="40" width="40" height="34" rx="6"/>`],
  ],
  eggs: [
    ["a", `<ellipse cx="160" cy="230" rx="95" ry="125"/>`],
    ["b", `<ellipse cx="265" cy="260" rx="85" ry="110"/>`],
    ["c", `<ellipse cx="128" cy="180" rx="22" ry="40" transform="rotate(-18 128 180)"/>`],
  ],
  meat: [ // steak: slab with a fat rim and marbling
    ["a", `<path d="M70 190c0-80 80-130 170-120 90 10 130 80 110 150-20 80-100 120-180 110S70 270 70 190z"/>`],
    ["b", `<path d="M100 195c0-62 62-98 136-90 72 8 102 62 86 114-16 60-80 90-142 82S100 255 100 195z"/>`],
    ["c", `<path d="M140 170c30-24 70 10 100-12 M150 230c40-20 70 18 120-6 M200 280c20-10 40 0 60-8" fill="none" stroke-width="14" stroke-linecap="round"/>`],
  ],
  poultry: [ // drumstick
    ["a", `<ellipse cx="240" cy="160" rx="110" ry="95" transform="rotate(-35 240 160)"/>`],
    ["b", `<path d="M190 210L100 300" fill="none" stroke-width="38" stroke-linecap="round"/>`],
    ["b", `<circle cx="80" cy="300" r="26"/><circle cx="100" cy="330" r="26"/>`],
    ["c", `<path d="M215 120c30-20 70-14 90 10" fill="none" stroke-width="16" stroke-linecap="round"/>`],
  ],
  fish: [
    ["a", `<path d="M50 200c60-90 190-110 270 0-80 110-210 90-270 0z"/>`],
    ["b", `<path d="M300 200l70-70v140z"/>`],
    ["c", `<circle cx="120" cy="185" r="14"/>`],
    ["c", `<path d="M190 140c25 35 25 85 0 120" fill="none" stroke-width="14" stroke-linecap="round"/>`],
  ],
  bread: [ // loaf
    ["a", `<path d="M60 200c0-70 70-110 140-110s140 40 140 110v150H60z"/>`],
    ["b", `<rect x="60" y="300" width="280" height="50"/>`],
    ["c", `<path d="M130 150l-20 60 M200 135v70 M270 150l20 60" fill="none" stroke-width="16" stroke-linecap="round"/>`],
  ],
  fruit: [ // apple
    ["a", `<path d="M200 130c-60-40-150-10-150 90s70 160 120 150c15-3 20-8 30-8s15 5 30 8c50 10 120-50 120-150s-90-130-150-90z"/>`],
    ["b", `<path d="M210 120c10-40 40-70 90-70-5 45-40 70-90 70z"/>`],
    ["c", `<ellipse cx="125" cy="200" rx="22" ry="44" transform="rotate(20 125 200)"/>`],
  ],
  vegetables: [ // carrot
    ["a", `<path d="M110 340L270 110c20-20 50 0 40 25L150 360c-15 15-50 0-40-20z"/>`],
    ["b", `<path d="M280 110c-10-40 0-70 20-90 15 30 10 60-20 90z M290 120c30-30 60-36 90-26-20 25-50 36-90 26z"/>`],
    ["c", `<path d="M190 240l40 20 M160 290l35 18 M225 185l35 18" fill="none" stroke-width="14" stroke-linecap="round"/>`],
  ],
  grains: [ // bowl of rice
    ["a", `<path d="M50 200h300c0 90-70 150-150 150S50 290 50 200z"/>`],
    ["b", `<path d="M80 200c10-60 60-90 120-90s110 30 120 90z"/>`],
    ["c", `<ellipse cx="150" cy="160" rx="10" ry="5"/><ellipse cx="190" cy="145" rx="10" ry="5"/><ellipse cx="230" cy="160" rx="10" ry="5"/><ellipse cx="260" cy="180" rx="10" ry="5"/><ellipse cx="120" cy="185" rx="10" ry="5"/><ellipse cx="200" cy="180" rx="10" ry="5"/>`],
  ],
  sauces: [ // bottle
    ["a", `<path d="M165 50h70v80c40 25 55 60 55 100v130a20 20 0 01-20 20H130a20 20 0 01-20-20V230c0-40 15-75 55-100z"/>`],
    ["b", `<rect x="155" y="30" width="90" height="40" rx="10"/>`],
    ["c", `<rect x="140" y="230" width="120" height="90" rx="14"/>`],
  ],
  leftovers: [ // takeaway tub
    ["a", `<path d="M70 150h260l-30 210H100z"/>`],
    ["b", `<rect x="50" y="110" width="300" height="50" rx="12"/>`],
    ["c", `<path d="M120 220h160" fill="none" stroke-width="16" stroke-linecap="round"/>`],
  ],
  baked: [ // muffin
    ["a", `<path d="M90 220h220l-30 140H120z"/>`],
    ["b", `<path d="M70 230c-10-90 60-150 130-150s140 60 130 150z"/>`],
    ["c", `<path d="M150 260l-6 90 M200 260v90 M250 260l6 90" fill="none" stroke-width="12" stroke-linecap="round"/>`],
  ],
  nuts: [ // peanut
    ["a", `<path d="M200 60c70 0 100 60 80 110-10 25-10 35 0 60 20 50-10 110-80 110s-100-60-80-110c10-25 10-35 0-60-20-50 10-110 80-110z"/>`],
    ["c", `<path d="M160 120l15 15 M220 110l-12 18 M170 260l14-14 M230 280l-14-14 M200 180v40" fill="none" stroke-width="12" stroke-linecap="round"/>`],
    ["b", `<ellipse cx="320" cy="300" rx="44" ry="30" transform="rotate(-30 320 300)"/>`],
  ],
  condiments: [ // jar
    ["a", `<path d="M110 130h180v40c25 15 40 40 40 70v110a20 20 0 01-20 20H90a20 20 0 01-20-20V240c0-30 15-55 40-70z"/>`],
    ["b", `<rect x="95" y="80" width="210" height="60" rx="14"/>`],
    ["c", `<rect x="110" y="240" width="180" height="70" rx="12"/>`],
  ],
};

/** Food family for a food record (category first, then kind). */
export function familyOf(f) {
  const k = f.kind, c = f.category, n = f.name.toLowerCase();
  if (k === "eggs" || /\beggs?\b/.test(n)) return "eggs";
  if (c === "poultry") return "poultry";
  if (c === "seafood" || k === "raw-seafood") return "fish";
  if (["milk", "soft-dairy", "hard-cheese", "soft-cheese", "butter", "baby-milk"].includes(k)) return "dairy";
  if (c === "meat" || k === "raw-meat" || k === "cured-meat" || k === "shelf-meat") return "meat";
  if (k === "bakery" || k === "dough") return /bread|bagel|roll|bun|loaf|tortilla|pita|baguette|croissant|biscuit|muffin|toast/.test(n) && !/muffin|cake|pie|cookie|pastr|donut|brownie|croissant/.test(n) ? "bread" : "baked";
  if (k === "fruit" || k === "juice-fresh") return "fruit";
  if (k === "vegetable" || k === "leafy" || k === "herb") return "vegetables";
  if (k === "nuts") return "nuts";
  if (k === "sauce-perishable" || k === "beverage" || k === "coffee-tea" || k === "alcohol" || k === "oil") return "sauces";
  if (k === "condiment" || k === "canned" || k === "dip" || k === "spice") return "condiments";
  if (k === "cooked" || k === "frozen" || c === "leftovers-deli") return "leftovers";
  if (k === "dry-goods" || k === "soy" || c === "grains-beans-pasta") return "grains";
  if (c === "baked-goods") return "baked";
  if (c === "dairy-eggs" || c === "baby-food") return "dairy";
  return "grains";
}

/** Silhouette family for a category hub. */
export const CATEGORY_FAMILY = {
  "dairy-eggs": "dairy", meat: "meat", poultry: "poultry", seafood: "fish", "leftovers-deli": "leftovers", fruits: "fruit",
  vegetables: "vegetables", "grains-beans-pasta": "grains", "baked-goods": "baked", "condiments-sauces": "condiments",
  "pantry-staples": "grains", beverages: "sauces", "frozen-foods": "leftovers", "baby-food": "dairy", "vegetarian-proteins": "nuts",
};
