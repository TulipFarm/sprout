import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { docsOptimizedDeps } from "./optimized-deps.mjs";

// Gate builds run beside the dev server and rewrite the shared Vite cache, leaving the dev
// server pointing at a React chunk that no longer exists, so islands load two Reacts.
const cacheDir = process.argv.includes("dev")
  ? "node_modules/.vite-dev"
  : undefined;

export default defineConfig({
  site: "https://sprout.tulipfarm.ai",
  devToolbar: { enabled: false },
  integrations: [react()],
  vite: {
    cacheDir,
    plugins: [tailwindcss()],
    optimizeDeps: { include: docsOptimizedDeps() },
  },
});
