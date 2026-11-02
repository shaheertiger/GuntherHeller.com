#!/usr/bin/env node
/**
 * Generates every favicon search engines and browsers ask for, from the GH mark:
 *   favicon.ico (16/32/48), favicon.svg, favicon-96x96.png, apple-touch-icon.png (180),
 *   web-app-manifest-192x192.png, web-app-manifest-512x512.png, site.webmanifest
 * Google needs a square icon at a multiple of 48 px, linked from every page: see Base.astro.
 */
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const font = readFileSync(require.resolve("@fontsource/dm-sans/files/dm-sans-latin-700-normal.woff"));
const out = (f) => new URL(`../public/${f}`, import.meta.url);

// Text → vector paths via satori, so the SVG favicon needs no font.
const mark = await satori(
  { type: "div", props: { style: { width: 64, height: 64, borderRadius: 32, background: "#4a3bd2", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 27, fontWeight: 700, letterSpacing: -0.5, fontFamily: "DM Sans" }, children: "GH" } },
  { width: 64, height: 64, fonts: [{ name: "DM Sans", data: font, weight: 700 }] },
);
writeFileSync(out("favicon.svg"), mark);

const png = (size, pad = 0, bg) => {
  let svg = mark;
  if (pad || bg) {
    const inner = size - pad * 2;
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${bg ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : ""}<g transform="translate(${pad} ${pad}) scale(${inner / 64})">${mark.replace(/^<svg[^>]*>|<\/svg>$/g, "")}</g></svg>`;
  }
  return new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng();
};
writeFileSync(out("favicon-96x96.png"), png(96));
writeFileSync(out("apple-touch-icon.png"), png(180, 14, "#ffffff")); // iOS ignores transparency: white plate
writeFileSync(out("web-app-manifest-192x192.png"), png(192, 16, "#ffffff"));
writeFileSync(out("web-app-manifest-512x512.png"), png(512, 44, "#ffffff"));

// favicon.ico with embedded PNG frames (supported by every browser and crawler).
const frames = [16, 32, 48].map((s) => [s, png(s)]);
const header = Buffer.alloc(6 + 16 * frames.length);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(frames.length, 4);
let offset = header.length;
frames.forEach(([s, buf], i) => {
  const o = 6 + i * 16;
  header.writeUInt8(s, o); header.writeUInt8(s, o + 1); header.writeUInt8(0, o + 2); header.writeUInt8(0, o + 3);
  header.writeUInt16LE(1, o + 4); header.writeUInt16LE(32, o + 6); header.writeUInt32LE(buf.length, o + 8); header.writeUInt32LE(offset, o + 12);
  offset += buf.length;
});
writeFileSync(out("favicon.ico"), Buffer.concat([header, ...frames.map((f) => f[1])]));

writeFileSync(out("site.webmanifest"), JSON.stringify({
  name: "Gunther Heller — How long does food last?",
  short_name: "Gunther Heller",
  start_url: "/",
  display: "browser",
  background_color: "#ffffff",
  theme_color: "#4a3bd2",
  icons: [
    { src: "/web-app-manifest-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/web-app-manifest-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
  ],
}, null, 2) + "\n");
console.log("favicons written to public/");
