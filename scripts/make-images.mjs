#!/usr/bin/env node
/**
 * Food images: public/images/foods/{slug}.webp (1200×800) + {slug}-600.webp (600×400).
 *
 * Until the commissioned pencil-and-watercolour set exists, this renders a placeholder
 * illustration per food (motif chosen from the food's name/kind, seeded wash per slug).
 * data/images.json records which files are generated; to add final art, drop
 * {slug}.webp (1200×800) into public/images/foods/, set "{slug}": "final" in
 * data/images.json, and run this script — it writes the 600px version and never
 * overwrites final art.
 *
 *   npm run images              # render missing placeholders + 600px versions of final art
 *   npm run images -- --force   # re-render every placeholder
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fork } from "node:child_process";
import { cpus } from "node:os";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { motifFor } from "./art/motifs.mjs";
import { renderWebp } from "./art/render.mjs";

const ROOT = new URL("../", import.meta.url);
const DIR = new URL("public/images/foods/", ROOT);
const MANIFEST = new URL("data/images.json", ROOT);

if (process.argv[2] === "--worker") {
  // Child process: render the slugs it is sent.
  process.on("message", async (jobs) => {
    for (const { slug, motif, salt = 0 } of jobs) {
      const { big, small } = await renderWebp(slug, motif, salt);
      writeFileSync(new URL(`${slug}.webp`, DIR), big);
      writeFileSync(new URL(`${slug}-600.webp`, DIR), small);
      process.send({ done: slug });
    }
    process.exit(0);
  });
} else {
  mkdirSync(DIR, { recursive: true });
  const foods = JSON.parse(readFileSync(new URL("data/foods.json", ROOT), "utf8")).foods;
  const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : {};
  const force = process.argv.includes("--force");
  const todo = [];
  for (const f of foods) {
    const motif = motifFor(f);
    if (manifest[f.slug] === "final") {
      if (!existsSync(new URL(`${f.slug}-600.webp`, DIR)) && existsSync(new URL(`${f.slug}.webp`, DIR)))
        await sharp(fileURLToPath(new URL(`${f.slug}.webp`, DIR))).resize(600, 400, { fit: "cover" }).webp({ quality: 74 }).toFile(fileURLToPath(new URL(`${f.slug}-600.webp`, DIR)));
      continue;
    }
    manifest[f.slug] = `generated:${motif}`;
    if (force || !existsSync(new URL(`${f.slug}.webp`, DIR))) todo.push({ slug: f.slug, motif });
  }
  const n = Math.max(1, Math.min(cpus().length, Number(process.env.IMG_WORKERS ?? 8)));
  console.log(`rendering ${todo.length} placeholder illustrations on ${n} workers…`);
  let done = 0;
  await Promise.all(
    Array.from({ length: n }, (_, i) => new Promise((resolve, reject) => {
      const jobs = todo.filter((_, j) => j % n === i);
      if (!jobs.length) return resolve();
      const child = fork(fileURLToPath(import.meta.url), ["--worker"]);
      child.on("message", () => { if (++done % 100 === 0) console.log(`  ${done}/${todo.length}`); });
      child.on("exit", () => resolve()); // crashed jobs are retried below
      child.send(jobs);
    })),
  );
  // resvg occasionally panics on a particular noise seed; retry those one at a time with a new seed.
  const runOne = (job) => new Promise((resolve) => {
    const child = fork(fileURLToPath(import.meta.url), ["--worker"], { stdio: "ignore" });
    child.on("exit", (code) => resolve(code === 0));
    child.send([job]);
  });
  for (const job of todo) {
    for (let salt = 1; salt <= 8 && !existsSync(new URL(`${job.slug}.webp`, DIR)); salt++) await runOne({ ...job, salt });
    if (!existsSync(new URL(`${job.slug}.webp`, DIR))) console.warn(`could not render ${job.slug}`);
  }
  writeFileSync(MANIFEST, JSON.stringify(Object.fromEntries(Object.entries(manifest).sort()), null, 1) + "\n");
  console.log(`done: ${foods.length} foods have images (${Object.values(manifest).filter((v) => v === "final").length} final art)`);
}
