import { pool } from "../src/db";
import { refreshCollectionCardPrices } from "../src/lib/collection-card-prices";
import { syncTcgplayerPrices } from "../src/lib/tcgplayer-price-sync";

const log = (msg: string) => console.log(`[sync-prices] ${msg}`);

syncTcgplayerPrices({ force: process.argv.includes("--force"), log })
  .then(async (result) => {
    await refreshCollectionCardPrices({ log });
    process.exitCode = result.failedGroups > 0 ? 1 : 0;
  })
  .catch((err) => {
    console.error("[sync-prices] Fatal:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
