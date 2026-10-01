import { pool } from "../src/db";
import { syncCardmarketPrices } from "../src/lib/cardmarket-price-sync";
import { refreshCollectionCardPrices } from "../src/lib/collection-card-prices";
import { syncTcgplayerPrices } from "../src/lib/tcgplayer-price-sync";

const log = (msg: string) => console.log(`[sync-prices] ${msg}`);
const force = process.argv.includes("--force");

async function run(): Promise<boolean> {
  let ok = true;
  let pulled = force;
  try {
    const tcgplayer = await syncTcgplayerPrices({ force, log });
    ok &&= tcgplayer.failedGroups === 0;
    pulled ||= tcgplayer.prices > 0 || tcgplayer.products > 0;
  } catch (err) {
    console.error("[sync-prices] TCGplayer sync failed:", err);
    ok = false;
  }
  try {
    const cardmarket = await syncCardmarketPrices({ force, log });
    ok &&= cardmarket.failedGames === 0;
    pulled ||= cardmarket.prices > 0 || cardmarket.products > 0;
  } catch (err) {
    console.error("[sync-prices] Cardmarket sync failed:", err);
    ok = false;
  }
  if (pulled) {
    await refreshCollectionCardPrices({ log });
  } else {
    log("No new prices pulled; collection card prices are already current.");
  }
  return ok;
}

run()
  .then((ok) => {
    process.exitCode = ok ? 0 : 1;
  })
  .catch((err) => {
    console.error("[sync-prices] Fatal:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
