/** Shared by scripts/figures.mjs and scripts/check-figures.mjs. */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { cardHtml } from "../../src/figures/html.mjs";

const ROOT = new URL("../../", import.meta.url).pathname;
/** Public origin of the Vercel Blob store that serves /img/fig/* (vercel.json rewrites to it). */
export const FIG_ORIGIN = "https://cpegqs6wjdzroceh.public.blob.vercel-storage.com";
export const FONTS = {
  "dm-sans.woff2": "@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2",
  "newsreader.woff2": "@fontsource-variable/newsreader/files/newsreader-latin-opsz-normal.woff2",
  "newsreader-ext.woff2": "@fontsource-variable/newsreader/files/newsreader-latin-ext-opsz-normal.woff2",
  "archivo.woff2": "@fontsource-variable/archivo/files/archivo-latin-standard-normal.woff2",
  "archivo-ext.woff2": "@fontsource-variable/archivo/files/archivo-latin-ext-standard-normal.woff2",
};
export const CSS = readFileSync(ROOT + "src/figures/system.css", "utf8");
const DESIGN = createHash("sha1").update(CSS).update(readFileSync(ROOT + "src/figures/html.mjs")).update(readFileSync(ROOT + "src/figures/icons.mjs")).update(Object.values(FONTS).join()).digest("hex");
/** Changes when the card's data or anything in the design system changes. */
export const cardHash = (c) => createHash("sha1").update(DESIGN).update(JSON.stringify(c.spec)).digest("hex").slice(0, 16);

/** Numbers a figure prints, read from its HTML (step numbers and the wordmark are not data). */
export function cardNumbers(spec) {
  const text = cardHtml(spec)
    .replace(/<svg[\s\S]*?<\/svg>/g, " ")
    .replace(/<span class="step-no[^"]*">[\s\S]*?<\/span>/g, " ")
    .replace(/<span class="mark">[\s\S]*?<\/span>/g, " ")
    .replace(/style="[^"]*"/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ");
  return [...new Set((text.match(/\d+/g) ?? []).map((n) => String(Number(n))))];
}
