/** Renders one pencil-and-watercolour placeholder illustration (SVG → resvg → sharp WebP). */
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import { MOTIFS } from "./motifs.mjs";

const hash = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const rng = (seed) => () => ((seed = Math.imul(seed ^ (seed >>> 15), 2246822507) ^ Math.imul(seed ^ (seed >>> 13), 3266489909)), ((seed ^= seed >>> 16) >>> 0) / 4294967296);

export function svgFor(slug, motifKey, salt = 0) {
  const m = MOTIFS[motifKey];
  const r = rng(hash(salt ? `${slug}#${salt}` : slug));
  const rot = (r() - 0.5) * 14;
  const dx = (r() - 0.5) * 60, dy = (r() - 0.5) * 30;
  const seed = Math.floor(r() * 1000);
  const blob = (cx, cy, rx, ry) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs>
    <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6f2ea"/><stop offset="1" stop-color="#ebe5d8"/></linearGradient>
    <filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${seed}"/><feColorMatrix values="0 0 0 0 0.42  0 0 0 0 0.37  0 0 0 0 0.29  0 0 0 0.07 0"/></filter>
    <filter id="wash" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="${seed + 7}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="70" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="6"/></filter>
    <filter id="bleed" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="${seed + 3}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="18" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="2.2"/></filter>
    <filter id="pencil" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="1" seed="${seed + 11}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" xChannelSelector="R" yChannelSelector="G"/></filter>
  </defs>
  <rect width="1200" height="800" fill="url(#paper)"/>
  <g filter="url(#wash)" fill="${m.c}" opacity="0.32">${blob(600 + dx, 420 + dy, 330, 220)}${blob(470 + dx, 360, 160, 120)}</g>
  <ellipse cx="${600 + dx * 0.3}" cy="650" rx="250" ry="26" fill="#5b5244" opacity="0.08" filter="url(#bleed)"/>
  <g transform="translate(${600 + dx * 0.3} ${400 + dy * 0.3}) rotate(${rot}) scale(5.2) translate(-50 -50)">
    ${m.fill ? `<path d="${m.fill}" fill="${m.c}" opacity="0.78" filter="url(#bleed)"/>` : ""}
    <g fill="none" stroke-linecap="round" stroke-linejoin="round" filter="url(#pencil)">
      <path d="${m.d}" stroke="#4a4237" stroke-width="1.15" opacity="0.85"/>
      <path d="${m.d}" stroke="#4a4237" stroke-width="0.55" opacity="0.45" transform="translate(0.6 0.4)"/>
    </g>
  </g>
  <rect width="1200" height="800" filter="url(#grain)"/>
</svg>`;
}

export async function renderWebp(slug, motifKey, salt = 0) {
  const png = new Resvg(svgFor(slug, motifKey, salt), { fitTo: { mode: "width", value: 1200 } }).render().asPng();
  const big = await sharp(png).webp({ quality: 74, effort: 4 }).toBuffer();
  const small = await sharp(png).resize(600, 400).webp({ quality: 72, effort: 4 }).toBuffer();
  return { big, small };
}
