import { pool } from "../src/db";
import { refreshCardPrices } from "../src/lib/card-price-refresh";
import { syncCardmarketPrices } from "../src/lib/cardmarket-price-sync";
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
  try {
    if (!pulled) {
      log("No new prices pulled; only pricing cards that have no price row.");
    }
    await refreshCardPrices({ log, onlyMissing: !pulled });
  } catch (err) {
    console.error("[sync-prices] Card price refresh failed:", err);
    ok = false;
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
