import { configDefaults, defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    // workers/* are separate Wrangler/Workers-runtime projects with their own
    // vitest.config.ts (@cloudflare/vitest-pool-workers) — run via
    // `npm test --prefix workers/<name>`, not swept up here.
    exclude: [...configDefaults.exclude, "workers/**"],
  },
});
