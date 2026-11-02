#!/usr/bin/env node
/** Renders the single site-wide Open Graph image → public/og.png (1200×630). Run: npm run og */
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const font = (w) => readFileSync(require.resolve(`@fontsource/dm-sans/files/dm-sans-latin-${w}-normal.woff`));
const h = (type, style, ...children) => ({ type, props: { style, children: children.length === 1 ? children[0] : children } });

const cell = (dot, label, value) =>
  h("div", { display: "flex", flexDirection: "column", flex: 1, padding: "28px 30px", borderLeft: label === "On the counter" ? "none" : "1px solid #e4e4e7" },
    h("div", { display: "flex", alignItems: "center", gap: 10, fontSize: 18, letterSpacing: 2.5, color: "#71717a", textTransform: "uppercase" },
      h("div", { width: 12, height: 12, borderRadius: 6, background: dot }), label),
    h("div", { fontSize: 56, fontWeight: 700, letterSpacing: -2, marginTop: 14, color: "#18181b" }, value));

const tree = h("div", { width: 1200, height: 630, display: "flex", background: "linear-gradient(135deg,#f4f1ea,#ece7dc)", fontFamily: "DM Sans" },
 h("div", { position: "absolute", left: 64, top: 56, width: 1072, height: 518, display: "flex", flexDirection: "column" },
  h("div", { display: "flex", alignItems: "center", gap: 16, fontSize: 30, fontWeight: 700, color: "#18181b" },
    h("div", { width: 52, height: 52, borderRadius: 26, background: "#4a3bd2", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }, "GH"),
    "Gunther Heller"),
  h("div", { fontSize: 72, fontWeight: 700, letterSpacing: -3, lineHeight: 1.05, color: "#18181b", marginTop: 44, maxWidth: 1000 }, "How long does food last?"),
  h("div", { fontSize: 30, color: "#5d564a", marginTop: 16 }, "Fridge, freezer and pantry times for 660+ foods · USDA FoodKeeper"),
  h("div", { display: "flex", marginTop: "auto", background: "#fff", border: "1px solid #e4e4e7", borderRadius: 14 },
    cell("#c7871a", "On the counter", "2 hours"), cell("#2f8f5b", "In the fridge", "4–6 days"), cell("#3c6fd1", "In the freezer", "6 months"))));

const svg = await satori(tree, { width: 1200, height: 630, fonts: [{ name: "DM Sans", data: font(400), weight: 400 }, { name: "DM Sans", data: font(700), weight: 700 }] });
writeFileSync(new URL("../public/og.png", import.meta.url), new Resvg(svg).render().asPng());
console.log("wrote public/og.png");
