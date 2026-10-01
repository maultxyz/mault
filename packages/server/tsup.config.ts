import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "lib/sync-job/worker": "src/lib/sync-job/worker.ts",
    "scripts/sync-prices": "scripts/sync-prices.ts",
    "scripts/migrate-scan-images": "scripts/migrate-scan-images.ts",
  },
  format: ["cjs"],
  outDir: "dist",
  noExternal: ["@magic-vault/shared"],
});
