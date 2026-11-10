import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import {
  tcgplayerPrices,
  tcgplayerPriceSets,
  tcgplayerProducts,
} from "../db/schema";
import { adapterEntriesForGameKeys } from "./card-search/resolve";
import {
  TCGPLAYER_PRICE_UPSERT_BATCH_SIZE,
  TCGPLAYER_PRODUCT_UPSERT_BATCH_SIZE,
} from "./constants/sync";
import { TCGTRACKING_PROGRESS_LOG_EVERY_SETS } from "./constants/tcgtracking";
import type {
  TcgplayerPriceSyncResult,
  TcgtrackingCatalogEntry,
  TcgtrackingSet,
  TcgtrackingSetPricing,
} from "./interfaces/tcgtracking";
import {
  fetchTcgtrackingSetEntries,
  fetchTcgtrackingSetPricing,
  fetchTcgtrackingSets,
} from "./tcgtracking/catalog";

export function tcgplayerCategoryIds(gameKeys: string[] | undefined): number[] {
  return [
    ...new Set(
      adapterEntriesForGameKeys(gameKeys).flatMap(([, adapter]) =>
        adapter.tcgplayer ? [adapter.tcgplayer.categoryId] : [],
      ),
    ),
  ];
}

async function saveSet(
  categoryId: number,
  set: TcgtrackingSet,
  products: TcgtrackingCatalogEntry[] | null,
  pricing: TcgtrackingSetPricing | null,
): Promise<void> {
  await db.transaction(async (tx) => {
    for (
      let i = 0;
      products && i < products.length;
      i += TCGPLAYER_PRODUCT_UPSERT_BATCH_SIZE
    ) {
      await tx
        .insert(tcgplayerProducts)
        .values(
          products
            .slice(i, i + TCGPLAYER_PRODUCT_UPSERT_BATCH_SIZE)
            .map(({ product }) => ({
              productId: product.id,
              categoryId,
              groupId: set.id,
              groupName: set.name,
              name: product.name,
              number: product.number,
              rarity: product.rarity,
            })),
        )
        .onConflictDoUpdate({
          target: tcgplayerProducts.productId,
          set: {
            categoryId: sql`excluded.category_id`,
            groupId: sql`excluded.group_id`,
            groupName: sql`excluded.group_name`,
            name: sql`excluded.name`,
            number: sql`excluded.number`,
            rarity: sql`excluded.rarity`,
            updatedAt: sql`now()`,
          },
        });
    }
    for (
      let i = 0;
      pricing && i < pricing.productIds.length;
      i += TCGPLAYER_PRICE_UPSERT_BATCH_SIZE
    ) {
      await tx
        .delete(tcgplayerPrices)
        .where(
          and(
            eq(tcgplayerPrices.categoryId, categoryId),
            inArray(
              tcgplayerPrices.productId,
              pricing.productIds.slice(i, i + TCGPLAYER_PRICE_UPSERT_BATCH_SIZE),
            ),
          ),
        );
    }
    for (
      let i = 0;
      pricing && i < pricing.prices.length;
      i += TCGPLAYER_PRICE_UPSERT_BATCH_SIZE
    ) {
      await tx
        .insert(tcgplayerPrices)
        .values(
          pricing.prices
            .slice(i, i + TCGPLAYER_PRICE_UPSERT_BATCH_SIZE)
            .map((price) => ({ ...price, categoryId })),
        )
        .onConflictDoUpdate({
          target: [tcgplayerPrices.productId, tcgplayerPrices.subType],
          set: {
            categoryId: sql`excluded.category_id`,
            lowPrice: sql`excluded.low_price`,
            marketPrice: sql`excluded.market_price`,
            updatedAt: sql`now()`,
          },
        });
    }
    const marker = {
      productsModified: set.products_modified ?? null,
      pricingModified: set.pricing_modified ?? null,
      syncedAt: new Date(),
    };
    await tx
      .insert(tcgplayerPriceSets)
      .values({ categoryId, setId: set.id, ...marker })
      .onConflictDoUpdate({
        target: [tcgplayerPriceSets.categoryId, tcgplayerPriceSets.setId],
        set: marker,
      });
  });
}

export async function syncTcgplayerPrices({
  force = false,
  gameKeys,
  log,
}: {
  force?: boolean;
  gameKeys?: string[];
  log: (msg: string) => void;
}): Promise<TcgplayerPriceSyncResult> {
  let totalPrices = 0;
  let totalProducts = 0;
  let failedSets = 0;
  for (const categoryId of tcgplayerCategoryIds(gameKeys)) {
    const sets = await fetchTcgtrackingSets(categoryId);
    const markers = new Map(
      (
        await db
          .select()
          .from(tcgplayerPriceSets)
          .where(eq(tcgplayerPriceSets.categoryId, categoryId))
      ).map((marker) => [marker.setId, marker]),
    );
    const plans = sets.flatMap((set) => {
      const marker = markers.get(set.id);
      const syncProducts =
        force ||
        !marker ||
        marker.productsModified !== (set.products_modified ?? null);
      const syncPrices =
        force ||
        !marker ||
        marker.pricingModified !== (set.pricing_modified ?? null);
      return syncProducts || syncPrices
        ? [{ set, syncProducts, syncPrices }]
        : [];
    });
    log(
      `Category ${categoryId}: ${plans.length} of ${sets.length} sets have new prices or products.`,
    );
    for (const [index, { set, syncProducts, syncPrices }] of plans.entries()) {
      try {
        const products = syncProducts
          ? await fetchTcgtrackingSetEntries(categoryId, set)
          : null;
        const pricing = syncPrices
          ? await fetchTcgtrackingSetPricing(categoryId, set.id)
          : null;
        await saveSet(categoryId, set, products, pricing);
        totalProducts += products?.length ?? 0;
        totalPrices += pricing?.prices.length ?? 0;
      } catch (err) {
        failedSets++;
        log(`Category ${categoryId}, set ${set.name} (${set.id}): ${String(err)}`);
      }
      if ((index + 1) % TCGTRACKING_PROGRESS_LOG_EVERY_SETS === 0) {
        log(`Category ${categoryId}: ${index + 1}/${plans.length} sets.`);
      }
    }
  }
  log(
    `Done. ${totalPrices} prices and ${totalProducts} products synced, ${failedSets} sets failed.`,
  );
  return {
    skipped: totalPrices === 0 && totalProducts === 0 && failedSets === 0,
    prices: totalPrices,
    products: totalProducts,
    failedSets,
  };
}
