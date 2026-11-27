import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "pi-link": "src/pi-link-main.ts",
    "lib/sync-job/worker": "src/lib/sync-job/worker.ts",
    "lib/card-match-worker": "src/lib/card-match-worker.ts",
    "scripts/sync-prices": "scripts/sync-prices.ts",
    "scripts/post-platform-stats": "scripts/post-platform-stats.ts",
    "scripts/migrate-scan-images": "scripts/migrate-scan-images.ts",
    "scripts/backfill-collector-numbers": "scripts/backfill-collector-numbers.ts",
  },
  format: ["cjs"],
  outDir: "dist",
  noExternal: ["@magic-vault/shared"],
});
