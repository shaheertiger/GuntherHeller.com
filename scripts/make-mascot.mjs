#!/usr/bin/env node
/**
 * "Gunther", the site mascot: a friendly fridge drawn in the site's pencil-and-watercolour skin.
 * Writes public/mascot/gunther-{mood}.svg (crisp, for inline UI use) and
 * public/mascot/gunther-{mood}.webp (watercolour render, 480×600) for each mood.
 *   npm run mascot
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";

const OUT = new URL("../public/mascot/", import.meta.url);
mkdirSync(OUT, { recursive: true });

const INK = "#2e2a52";
const BODY = "#7b6ff0";
const BODY_DARK = "#5a4ddc";
const DOOR = "#f6f2ea";
const CHEEK = "#f4a7b9";

/** Face, arms and extras per mood. */
const MOODS = {
  happy: {
    brows: "M92 132 q12 -8 24 0 M124 132 q12 -8 24 0",
    eyes: "happy",
    mouth: "M104 186 q16 18 32 0",
    mouthFill: true,
    armL: "M52 175 q-22 8 -26 30", handL: [26, 206],
    armR: "M188 175 q22 8 26 30", handR: [214, 206],
    extra: "sparkle",
  },
  wave: {
    brows: "M92 130 q12 -6 24 0 M124 130 q12 -6 24 0",
    eyes: "open",
    mouth: "M102 184 q18 20 36 0",
    mouthFill: true,
    armL: "M52 175 q-22 8 -26 30", handL: [26, 206],
    armR: "M188 160 q26 -14 30 -46", handR: [218, 112],
    extra: "wave",
  },
  thinking: {
    brows: "M92 128 q12 -2 24 4 M124 126 q12 -8 24 -2",
    eyes: "side",
    mouth: "M108 190 q10 -4 22 2",
    mouthFill: false,
    armL: "M52 175 q-22 8 -26 30", handL: [26, 206],
    armR: "M188 178 q14 18 -40 18", handR: [146, 196],
    front: true,
    extra: "question",
  },
  worried: {
    brows: "M94 128 q10 -2 22 -8 M124 120 q12 6 22 8",
    eyes: "open",
    mouth: "M106 192 q14 -10 28 0",
    mouthFill: false,
    armL: "M52 170 q-26 -6 -28 -30", handL: [24, 140],
    armR: "M188 170 q26 -6 28 -30", handR: [216, 140],
    extra: "sweat",
  },
  oops: {
    brows: "M94 124 q10 6 22 6 M124 130 q12 0 22 -6",
    eyes: "x",
    mouth: "M106 196 q14 -14 28 0",
    mouthFill: false,
    armL: "M52 172 q-24 12 -24 34", handL: [28, 206],
    armR: "M188 172 q24 12 24 34", handR: [212, 206],
    extra: "stink",
  },
};

function eyes(kind) {
  const L = [104, 152], R = [136, 152];
  if (kind === "happy") return `<path d="M96 154 q8 -10 16 0 M128 154 q8 -10 16 0" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;
  if (kind === "x") return `<path d="M98 146 l12 12 M110 146 l-12 12 M130 146 l12 12 M142 146 l-12 12" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;
  const dx = kind === "side" ? 4 : 0, dy = kind === "side" ? -3 : 0;
  return [L, R].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="10" ry="12" fill="#fff" stroke="${INK}" stroke-width="2.5"/><circle cx="${x + dx}" cy="${y + 2 + dy}" r="5.5" fill="${INK}"/><circle cx="${x + dx + 2}" cy="${y - 1 + dy}" r="1.8" fill="#fff"/>`).join("");
}

function extra(kind) {
  if (kind === "sparkle") return `<g stroke="#e0a326" stroke-width="3" stroke-linecap="round"><path d="M206 52 v16 M198 60 h16"/><path d="M30 92 v10 M25 97 h10"/></g>`;
  if (kind === "wave") return `<g fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round" opacity=".55"><path d="M228 92 q8 6 6 16"/><path d="M236 84 q12 10 8 26"/></g>`;
  if (kind === "question") return `<g fill="none" stroke="#4a3bd2" stroke-width="4" stroke-linecap="round"><path d="M198 40 q2 -14 16 -12 q14 4 8 16 q-4 6 -10 8 v8"/><circle cx="212" cy="74" r="2.5" fill="#4a3bd2"/></g>`;
  if (kind === "sweat") return `<path d="M158 116 q8 12 0 18 q-8 -6 0 -18z" fill="#8fc1f0" stroke="${INK}" stroke-width="2"/>`;
  if (kind === "stink") return `<g fill="none" stroke="#7aa35a" stroke-width="3" stroke-linecap="round"><path d="M200 60 q-8 -10 0 -20 q8 -10 0 -20"/><path d="M214 70 q-8 -10 0 -20 q8 -10 0 -20"/></g>`;
  return "";
}

export function gunther(mood, { watercolour = false } = {}) {
  const m = MOODS[mood];
  const wash = watercolour
    ? `<defs>
        <filter id="wc" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="0.8"/></filter>
        <filter id="pencil" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="1" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" xChannelSelector="R" yChannelSelector="G"/></filter>
      </defs>`
    : "";
  const f = (id) => (watercolour ? ` filter="url(#${id})"` : "");
  const [hlx, hly] = m.handL, [hrx, hry] = m.handR;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 300" role="img" aria-label="Gunther the fridge, ${mood}">
${wash}
<ellipse cx="120" cy="284" rx="70" ry="8" fill="#5b5244" opacity=".14"${f("wc")}/>
<g${f("pencil")}>
  <path d="${m.armL}" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
  ${m.front ? "" : `<path d="${m.armR}" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><circle cx="${hrx}" cy="${hry}" r="9" fill="${DOOR}" stroke="${INK}" stroke-width="3"/>`}
  <circle cx="${hlx}" cy="${hly}" r="9" fill="${DOOR}" stroke="${INK}" stroke-width="3"/>
  <rect x="80" y="258" width="24" height="18" rx="9" fill="${BODY_DARK}" stroke="${INK}" stroke-width="3"/>
  <rect x="136" y="258" width="24" height="18" rx="9" fill="${BODY_DARK}" stroke="${INK}" stroke-width="3"/>
</g>
<rect x="50" y="30" width="140" height="232" rx="34" fill="${BODY}"${f("wc")}/>
<g${f("pencil")}>
  <rect x="50" y="30" width="140" height="232" rx="34" fill="none" stroke="${INK}" stroke-width="4"/>
  <rect x="62" y="42" width="116" height="58" rx="22" fill="${DOOR}" stroke="${INK}" stroke-width="3"/>
  <rect x="62" y="110" width="116" height="140" rx="24" fill="${DOOR}" stroke="${INK}" stroke-width="3"/>
  <rect x="160" y="58" width="8" height="26" rx="4" fill="${BODY_DARK}" stroke="${INK}" stroke-width="2.5"/>
  <rect x="160" y="128" width="8" height="40" rx="4" fill="${BODY_DARK}" stroke="${INK}" stroke-width="2.5"/>
  <path d="${m.brows}" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>
  ${eyes(m.eyes)}
  <ellipse cx="88" cy="176" rx="9" ry="6" fill="${CHEEK}" opacity=".85"/>
  <ellipse cx="152" cy="176" rx="9" ry="6" fill="${CHEEK}" opacity=".85"/>
  <path d="${m.mouth}${m.mouthFill ? " z" : ""}" fill="${m.mouthFill ? "#c0392b" : "none"}" stroke="${INK}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
  <g transform="translate(76 76) rotate(-35)"><path d="M0 0 q3 -6 12 -5 q9 1 10 6 L4 26 q-3 2 -4 -1 z" fill="#f77f00" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M5 8 l5 1 M3 15 l4 1" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/><path d="M11 -5 q-4 -8 0 -12 M13 -5 q3 -8 9 -9 M12 -5 q0 -9 4 -12" fill="none" stroke="#38b000" stroke-width="2.5" stroke-linecap="round"/></g>
  <circle cx="114" cy="68" r="9" fill="#4a3bd2" stroke="${INK}" stroke-width="2"/><text x="114" y="72" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" font-weight="700" fill="#fff">GH</text>
  ${extra(m.extra)}
  ${m.front ? `<path d="${m.armR}" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><circle cx="${hrx}" cy="${hry}" r="9" fill="${DOOR}" stroke="${INK}" stroke-width="3"/>` : ""}
</g>
</svg>`;
}

for (const mood of Object.keys(MOODS)) {
  writeFileSync(new URL(`gunther-${mood}.svg`, OUT), gunther(mood).replace(/\n\s*/g, "\n"));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="600" viewBox="0 0 480 600"><rect width="480" height="600" fill="none"/><g transform="scale(2)">${gunther(mood, { watercolour: true }).replace(/^<svg[^>]*>|<\/svg>$/g, "")}</g></svg>`;
  const png = new Resvg(svg, { fitTo: { mode: "width", value: 480 } }).render().asPng();
  await sharp(png).webp({ quality: 82, alphaQuality: 90 }).toFile(new URL(`gunther-${mood}.webp`, OUT).pathname);
}
console.log(`mascot: ${Object.keys(MOODS).length} moods written to public/mascot/`);
