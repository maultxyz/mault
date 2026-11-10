import { isCardCondition } from "@magic-vault/shared";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { tcgplayerSkus, tcgplayerSkuSets } from "../db/schema";
import {
  TCGPLAYER_SKU_CONDITION_COLUMNS,
  TCGPLAYER_SKU_CONDITION_PRICE_COLUMNS,
  TCGPLAYER_SKU_UPSERT_BATCH_SIZE,
  TCGTRACKING_PROGRESS_LOG_EVERY_SETS,
} from "./constants/tcgtracking";
import type {
  TcgplayerSkuSyncResult,
  TcgtrackingSet,
  TcgtrackingSku,
} from "./interfaces/tcgtracking";
import {
  fetchTcgtrackingSets,
  fetchTcgtrackingSetSkus,
} from "./tcgtracking/catalog";
import { tcgplayerCategoryIds } from "./tcgplayer-price-sync";

function toSkuRows(
  categoryId: number,
  setId: number,
  skusByProductId: Map<number, TcgtrackingSku[]>,
): (typeof tcgplayerSkus.$inferInsert)[] {
  const rowsByKey = new Map<string, typeof tcgplayerSkus.$inferInsert>();
  for (const [productId, skus] of skusByProductId) {
    for (const sku of skus) {
      const skuId = Number(sku.skuId);
      if (!isCardCondition(sku.condition) || !Number.isInteger(skuId)) continue;
      const key = `${productId}:${sku.variant}:${sku.language}`;
      const row = rowsByKey.get(key) ?? {
        productId,
        variant: sku.variant,
        language: sku.language,
        categoryId,
        setId,
      };
      row[TCGPLAYER_SKU_CONDITION_COLUMNS[sku.condition]] = skuId;
      row[TCGPLAYER_SKU_CONDITION_PRICE_COLUMNS[sku.condition]] = sku.marketPrice;
      rowsByKey.set(key, row);
    }
  }
  return [...rowsByKey.values()];
}

async function replaceSetSkus(
  categoryId: number,
  set: TcgtrackingSet,
  rows: (typeof tcgplayerSkus.$inferInsert)[],
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .delete(tcgplayerSkus)
      .where(
        and(
          eq(tcgplayerSkus.categoryId, categoryId),
          eq(tcgplayerSkus.setId, set.id),
        ),
      );
    for (let i = 0; i < rows.length; i += TCGPLAYER_SKU_UPSERT_BATCH_SIZE) {
      await tx
        .insert(tcgplayerSkus)
        .values(rows.slice(i, i + TCGPLAYER_SKU_UPSERT_BATCH_SIZE))
        .onConflictDoNothing();
    }
    const marker = {
      productsModified: set.products_modified ?? null,
      skusModified: set.skus_modified ?? null,
      skuCount: set.sku_count ?? null,
      syncedAt: new Date(),
    };
    await tx
      .insert(tcgplayerSkuSets)
      .values({ categoryId, setId: set.id, ...marker })
      .onConflictDoUpdate({
        target: [tcgplayerSkuSets.categoryId, tcgplayerSkuSets.setId],
        set: marker,
      });
  });
}

export async function syncTcgplayerSkus({
  force = false,
  gameKeys,
  log,
}: {
  force?: boolean;
  gameKeys?: string[];
  log: (msg: string) => void;
}): Promise<TcgplayerSkuSyncResult> {
  let syncedSets = 0;
  let skuRows = 0;
  let failedSets = 0;
  for (const categoryId of tcgplayerCategoryIds(gameKeys)) {
    const sets = (await fetchTcgtrackingSets(categoryId)).filter(
      (set) => (set.sku_count ?? 0) > 0,
    );
    const markers = new Map(
      (
        await db
          .select()
          .from(tcgplayerSkuSets)
          .where(eq(tcgplayerSkuSets.categoryId, categoryId))
      ).map((marker) => [marker.setId, marker]),
    );
    const changedSets = sets.filter((set) => {
      const marker = markers.get(set.id);
      return (
        force ||
        !marker ||
        marker.productsModified !== (set.products_modified ?? null) ||
        marker.skusModified !== (set.skus_modified ?? null) ||
        marker.skuCount !== (set.sku_count ?? null)
      );
    });
    log(
      `Category ${categoryId}: ${changedSets.length} of ${sets.length} sets have new SKUs.`,
    );
    for (const [index, set] of changedSets.entries()) {
      try {
        const rows = toSkuRows(
          categoryId,
          set.id,
          await fetchTcgtrackingSetSkus(categoryId, set.id),
        );
        await replaceSetSkus(categoryId, set, rows);
        syncedSets++;
        skuRows += rows.length;
      } catch (err) {
        failedSets++;
        log(`Category ${categoryId}, set ${set.name} (${set.id}): ${String(err)}`);
      }
      if ((index + 1) % TCGTRACKING_PROGRESS_LOG_EVERY_SETS === 0) {
        log(`Category ${categoryId}: ${index + 1}/${changedSets.length} sets.`);
      }
    }
  }
  return {
    skipped: syncedSets === 0 && failedSets === 0,
    sets: syncedSets,
    skuRows,
    failedSets,
  };
}
