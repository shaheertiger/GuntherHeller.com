/** Loads src/figures/cards.ts (TypeScript, Vite globs, JSON imports) from a plain Node script. */
import { createServer } from "vite";
export async function loadCards() {
  const server = await createServer({ configFile: false, root: new URL("../../", import.meta.url).pathname, logLevel: "error", server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  const mod = await server.ssrLoadModule("/src/figures/cards.ts");
  return { mod, close: () => server.close() };
}
