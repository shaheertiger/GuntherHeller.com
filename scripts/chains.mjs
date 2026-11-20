/** Restaurant chains (data/chains.json), shared by the data scripts. The site reads the same file in src/lib/chains.ts. */
import fs from "node:fs";
const raw = JSON.parse(fs.readFileSync(new URL("../data/chains.json", import.meta.url), "utf8"));
export const CHAINS = raw.chains.map((c) => ({ ...c, re: new RegExp(c.match, "i") }));
export const chainOf = (desc) => CHAINS.find((c) => c.re.test(desc)) ?? null;
