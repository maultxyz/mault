import { max, sql } from "drizzle-orm";
import { db } from "../db";
import { cardmarketPrices, cardmarketProducts } from "../db/schema";
import { cardmarketMatchName } from "./card-search/cardmarket-prices";
import { ADAPTERS_BY_GAME_KEY } from "./card-search/resolve";
import { CARD_API_HEADERS } from "./constants/card-search";
import {
  CARDMARKET_PRICE_UPSERT_BATCH_SIZE,
  CARDMARKET_PRODUCT_UPSERT_BATCH_SIZE,
} from "./constants/sync";
import { CARDMARKET_DOWNLOAD_TIMEOUT_MS } from "./constants/timing";
import { CARDMARKET_CATALOG_URL } from "./constants/urls";
import type {
  CardmarketPriceGuideEntry,
  CardmarketPriceGuideFile,
  CardmarketProduct,
  CardmarketProductsFile,
  CardmarketSyncResult,
} from "./interfaces/cardmarket";

function priceGuideUrl(gameId: number): string {
  return `${CARDMARKET_CATALOG_URL}/priceGuide/price_guide_${gameId}.json`;
}

function productListUrl(gameId: number): string {
  return `${CARDMARKET_CATALOG_URL}/productList/products_singles_${gameId}.json`;
}

async function download(url: string, method = "GET"): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: CARD_API_HEADERS,
    signal: AbortSignal.timeout(CARDMARKET_DOWNLOAD_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`${method} ${url} failed: HTTP ${res.status}`);
  return res;
}

async function lastModified(url: string): Promise<Date | null> {
  const header = (await download(url, "HEAD")).headers.get("last-modified");
  return header ? new Date(header) : null;
}

function positive(value: number | null | undefined): number | null {
  return value != null && value > 0 ? value : null;
}

async function upsertPrices(
  gameId: number,
  entries: CardmarketPriceGuideEntry[],
): Promise<void> {
  for (let i = 0; i < entries.length; i += CARDMARKET_PRICE_UPSERT_BATCH_SIZE) {
    const batch = entries.slice(i, i + CARDMARKET_PRICE_UPSERT_BATCH_SIZE);
    await db
      .insert(cardmarketPrices)
      .values(
        batch.map((e) => ({
          productId: e.idProduct,
          gameId,
          low: positive(e.low),
          trend: positive(e.trend),
          avg: positive(e.avg),
          avg1: positive(e.avg1),
          avg7: positive(e.avg7),
          avg30: positive(e.avg30),
          lowFoil: positive(e["low-foil"]),
          trendFoil: positive(e["trend-foil"]),
          avgFoil: positive(e["avg-foil"]),
          avg1Foil: positive(e["avg1-foil"]),
          avg7Foil: positive(e["avg7-foil"]),
          avg30Foil: positive(e["avg30-foil"]),
        })),
      )
      .onConflictDoUpdate({
        target: cardmarketPrices.productId,
        set: {
          gameId: sql`excluded.game_id`,
          low: sql`excluded.low`,
          trend: sql`excluded.trend`,
          avg: sql`excluded.avg`,
          avg1: sql`excluded.avg1`,
          avg7: sql`excluded.avg7`,
          avg30: sql`excluded.avg30`,
          lowFoil: sql`excluded.low_foil`,
          trendFoil: sql`excluded.trend_foil`,
          avgFoil: sql`excluded.avg_foil`,
          avg1Foil: sql`excluded.avg1_foil`,
          avg7Foil: sql`excluded.avg7_foil`,
          avg30Foil: sql`excluded.avg30_foil`,
          updatedAt: sql`now()`,
        },
      });
  }
}

async function upsertProducts(
  gameId: number,
  products: CardmarketProduct[],
): Promise<void> {
  for (
    let i = 0;
    i < products.length;
    i += CARDMARKET_PRODUCT_UPSERT_BATCH_SIZE
  ) {
    const batch = products.slice(i, i + CARDMARKET_PRODUCT_UPSERT_BATCH_SIZE);
    await db
      .insert(cardmarketProducts)
      .values(
        batch.map((p) => ({
          productId: p.idProduct,
          gameId,
          name: p.name,
          matchName: cardmarketMatchName(p.name),
          expansionId: p.idExpansion,
          metacardId: p.idMetacard,
        })),
      )
      .onConflictDoUpdate({
        target: cardmarketProducts.productId,
        set: {
          gameId: sql`excluded.game_id`,
          name: sql`excluded.name`,
          matchName: sql`excluded.match_name`,
          expansionId: sql`excluded.expansion_id`,
          metacardId: sql`excluded.metacard_id`,
          updatedAt: sql`now()`,
        },
      });
  }
}

async function lastSyncedByGame(): Promise<Map<number, Date>> {
  const rows = await db
    .select({
      gameId: cardmarketPrices.gameId,
      lastSynced: max(cardmarketPrices.updatedAt),
    })
    .from(cardmarketPrices)
    .groupBy(cardmarketPrices.gameId);
  return new Map(
    rows.flatMap((r) => (r.lastSynced ? [[r.gameId, r.lastSynced]] : [])),
  );
}

export async function syncCardmarketPrices({
  force = false,
  log,
}: {
  force?: boolean;
  log: (msg: string) => void;
}): Promise<CardmarketSyncResult> {
  const needsProducts = new Map<number, boolean>();
  for (const adapter of Object.values(ADAPTERS_BY_GAME_KEY)) {
    if (!adapter.cardmarket) continue;
    const { gameId, productNames } = adapter.cardmarket;
    needsProducts.set(
      gameId,
      (needsProducts.get(gameId) ?? false) || !!productNames,
    );
  }

  const syncedAt = await lastSyncedByGame();
  const result: CardmarketSyncResult = {
    prices: 0,
    products: 0,
    skippedGames: 0,
    failedGames: 0,
  };

  for (const [gameId, matchesProducts] of needsProducts) {
    try {
      const guideUrl = priceGuideUrl(gameId);
      const modifiedAt = await lastModified(guideUrl);
      const pulledAt = syncedAt.get(gameId);
      if (!force && modifiedAt && pulledAt && pulledAt >= modifiedAt) {
        result.skippedGames++;
        log(`Game ${gameId}: price guide already pulled; skipping.`);
        continue;
      }

      let products = 0;
      if (matchesProducts) {
        const list = (await (
          await download(productListUrl(gameId))
        ).json()) as CardmarketProductsFile;
        await upsertProducts(gameId, list.products);
        products = list.products.length;
      }

      const guide = (await (
        await download(guideUrl)
      ).json()) as CardmarketPriceGuideFile;
      await upsertPrices(gameId, guide.priceGuides);

      result.prices += guide.priceGuides.length;
      result.products += products;
      log(
        `Game ${gameId}: ${guide.priceGuides.length} prices, ${products} products (guide ${guide.createdAt}).`,
      );
    } catch (err) {
      result.failedGames++;
      log(`Game ${gameId}: ${String(err)}`);
    }
  }

  log(
    `Done. ${result.prices} prices and ${result.products} products synced, ${result.skippedGames} games skipped, ${result.failedGames} failed.`,
  );
  return result;
}
