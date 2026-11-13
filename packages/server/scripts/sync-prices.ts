import "../src/lib/console-timestamps";
import { pool } from "../src/db";
import { refreshCardPrices } from "../src/lib/card-price-refresh";
import { adapterEntriesForGameKeys } from "../src/lib/card-search/resolve";
import { syncCardKingdomPrices } from "../src/lib/cardkingdom-price-sync";
import { syncCardmarketPrices } from "../src/lib/cardmarket-price-sync";
import { snapshotTrackedOrgCollectionValues } from "../src/lib/collection-value-snapshots";
import {
  buildPriceSyncEmbed,
  postDiscordWebhook,
  sendPlatformDiscordNotification,
} from "../src/lib/discord";
import type { PriceSyncSummary } from "../src/lib/interfaces/discord";
import { syncTcgplayerPrices } from "../src/lib/tcgplayer-price-sync";
import { syncGameFoilTypesFromTcgplayer } from "../src/lib/tcgplayer-foil-types";
import { syncTcgplayerSkus } from "../src/lib/tcgplayer-sku-sync";

const log = (msg: string) => console.log(`[sync-prices] ${msg}`);
const warnPartialFailure = (msg: string) =>
  console.log(`::warning::[sync-prices] ${msg}`);
const force = process.argv.includes("--force");
const refreshOnly = process.argv.includes("--refresh-only");
const gameKeys = process.argv
  .find((arg) => arg.startsWith("--games="))
  ?.slice("--games=".length)
  .split(",")
  .map((gameKey) => gameKey.trim())
  .filter(Boolean);
const syncCardKingdom = adapterEntriesForGameKeys(gameKeys).some(
  ([, adapter]) => !!adapter.cardkingdom,
);

async function notifyDiscord(summary: PriceSyncSummary): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      await postDiscordWebhook(webhookUrl, {
        allowed_mentions: { parse: [] },
        embeds: [buildPriceSyncEmbed(summary)],
      });
      log("Posted price update to Discord.");
    } catch (err) {
      console.log(
        `::warning::Discord price update failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    return;
  }
  try {
    const outcome = await sendPlatformDiscordNotification(
      "pricing",
      buildPriceSyncEmbed(summary),
    );
    if (outcome === "sent") log("Posted price update to Discord.");
    else if (outcome === "failed") log("Discord price update post failed.");
  } catch (err) {
    console.error("[sync-prices] Discord notification failed:", err);
  }
}

async function refresh(): Promise<boolean> {
  log("Refresh only: rebuilding card prices from stored source prices.");
  try {
    await refreshCardPrices({ log, onlyMissing: false, gameKeys });
    return true;
  } catch (err) {
    console.error("[sync-prices] Card price refresh failed:", err);
    return false;
  }
}

async function run(): Promise<boolean> {
  if (gameKeys) log(`Only syncing games: ${gameKeys.join(", ")}.`);
  let ok = true;
  let pulled = force;
  const sources: PriceSyncSummary["sources"] = {};
  try {
    log("TCGplayer: starting.");
    const tcgplayer = await syncTcgplayerPrices({ force, gameKeys, log });
    if (tcgplayer.failedSets > 0) {
      warnPartialFailure(`TCGplayer: ${tcgplayer.failedSets} sets failed.`);
    }
    pulled ||= tcgplayer.prices > 0 || tcgplayer.products > 0;
    sources.TCGplayer =
      tcgplayer.prices > 0 || tcgplayer.products > 0
        ? {
            status: "updated",
            prices: tcgplayer.prices,
            products: tcgplayer.products,
            failures: tcgplayer.failedSets,
          }
        : tcgplayer.failedSets > 0
          ? { status: "failed" }
          : { status: "unchanged" };
  } catch (err) {
    console.error("[sync-prices] TCGplayer sync failed:", err);
    ok = false;
    sources.TCGplayer = { status: "failed" };
  }
  try {
    log("TCGplayer SKUs: starting.");
    const skus = await syncTcgplayerSkus({ force, gameKeys, log });
    if (skus.failedSets > 0) {
      warnPartialFailure(`TCGplayer SKUs: ${skus.failedSets} sets failed.`);
    }
    pulled ||= skus.sets > 0;
    log(
      skus.skipped
        ? "TCGplayer SKUs: unchanged."
        : `TCGplayer SKUs: ${skus.sets} sets, ${skus.skuRows} rows, ${skus.failedSets} failed.`,
    );
    await syncGameFoilTypesFromTcgplayer({ gameKeys, log });
  } catch (err) {
    console.error("[sync-prices] TCGplayer SKU sync failed:", err);
    ok = false;
  }
  try {
    log("Cardmarket: starting.");
    const cardmarket = await syncCardmarketPrices({ force, gameKeys, log });
    if (cardmarket.failedGames > 0) {
      warnPartialFailure(`Cardmarket: ${cardmarket.failedGames} games failed.`);
    }
    pulled ||= cardmarket.prices > 0 || cardmarket.products > 0;
    sources.Cardmarket =
      cardmarket.prices > 0 || cardmarket.products > 0
        ? {
            status: "updated",
            prices: cardmarket.prices,
            products: cardmarket.products,
            failures: cardmarket.failedGames,
          }
        : cardmarket.failedGames > 0
          ? { status: "failed" }
          : { status: "unchanged" };
  } catch (err) {
    console.error("[sync-prices] Cardmarket sync failed:", err);
    ok = false;
    sources.Cardmarket = { status: "failed" };
  }
  if (syncCardKingdom) {
    try {
      log("Card Kingdom: starting.");
      const cardKingdom = await syncCardKingdomPrices({ force, log });
      pulled ||= cardKingdom.prices > 0;
      sources["Card Kingdom"] =
        cardKingdom.prices > 0
          ? { status: "updated", prices: cardKingdom.prices }
          : { status: "unchanged" };
    } catch (err) {
      console.error("[sync-prices] Card Kingdom sync failed:", err);
      ok = false;
      sources["Card Kingdom"] = { status: "failed" };
    }
  }
  let refreshedCards: number | null = null;
  try {
    if (!pulled) {
      log("No new prices pulled; only pricing cards that have no price row.");
    }
    refreshedCards = await refreshCardPrices({
      log,
      onlyMissing: !pulled,
      gameKeys,
    });
  } catch (err) {
    console.error("[sync-prices] Card price refresh failed:", err);
    ok = false;
  }
  try {
    await snapshotTrackedOrgCollectionValues(log);
  } catch (err) {
    console.error("[sync-prices] Collection value snapshots failed:", err);
    ok = false;
  }
  if (pulled) {
    await notifyDiscord({
      forced: force,
      sources,
      refreshedCards,
    });
  }
  return ok;
}

(refreshOnly ? refresh() : run())
  .then((ok) => {
    process.exitCode = ok ? 0 : 1;
  })
  .catch((err) => {
    console.error("[sync-prices] Fatal:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
