// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://www.guntherheller.com",
  trailingSlash: "always",
  output: "static",
  build: { format: "directory", inlineStylesheets: "always" },
  compressHTML: true,
  prefetch: false,
  devToolbar: { enabled: false },
  vite: { plugins: [tailwindcss()] },
});
