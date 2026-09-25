/**
 * Pulls the latest TCGplayer prices from tcgcsv.com into `tcgplayer_prices`,
 * which card lookups overlay onto stored cards' price/priceFoil. Meant to run
 * once a day on a schedule. tcgcsv publishes one build a day (~20:00 UTC), and
 * a run exits early without pulling anything when that build was already
 * pulled, so scheduling it more often is harmless.
 *
 * Exits non-zero when any group failed, so the scheduler surfaces it. Pass
 * --force to pull even when the current build was already pulled (e.g. to
 * retry after a partially failed run).
 *
 * Usage:
 *   pnpm --filter @magic-vault/server sync:prices [--force]   (local, reads ../../.env)
 *   node packages/server/dist/scripts/sync-prices.js [--force] (built image)
 */
import { pool } from "../src/db";
import { syncTcgplayerPrices } from "../src/lib/tcgplayer-price-sync";

syncTcgplayerPrices({
  force: process.argv.includes("--force"),
  log: (msg) => console.log(`[sync-prices] ${msg}`),
})
  .then((result) => {
    process.exitCode = result.failedGroups > 0 ? 1 : 0;
  })
  .catch((err) => {
    console.error("[sync-prices] Fatal:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
