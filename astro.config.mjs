// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import vercel from "@astrojs/vercel";

export default defineConfig({
  site: "https://www.guntherheller.com",
  trailingSlash: "always",
  output: "static", // every page is prerendered; only src/pages/[...path].ts runs on demand (old-URL 301s)
  adapter: vercel(),
  build: { format: "directory", inlineStylesheets: "auto" },
  compressHTML: true,
  prefetch: false,
  devToolbar: { enabled: false },
  vite: { plugins: [tailwindcss()] },
});
