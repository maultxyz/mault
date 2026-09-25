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
