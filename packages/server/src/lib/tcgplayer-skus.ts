import type { GroupedEntry, PlayingCard } from "@magic-vault/shared";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { tcgplayerProducts } from "../db/schema";
import { ADAPTERS_BY_GAME_KEY } from "./card-search/resolve";
import { tcgplayerProductIdOf } from "./card-search/tcgplayer-prices";
import {
  TCGTRACKING_PRODUCT_SET_CACHE_MAX_KEYS,
  TCGTRACKING_PRODUCT_SET_LOOKUPS_PER_EXPORT_MAX,
  TCGTRACKING_SKU_CACHE_MAX_KEYS,
  TCGTRACKING_SKU_CACHE_TTL_MS,
  TCGTRACKING_SKU_LANGUAGE_CODES,
  TCGTRACKING_SKU_SET_FETCH_CONCURRENCY,
} from "./constants/tcgtracking";
import type { TcgplayerPricing } from "./interfaces/card-search";
import type { TcgplayerSkuTarget } from "./interfaces/tcgplayer-skus";
import type { TcgtrackingSku } from "./interfaces/tcgtracking";
import {
  fetchTcgtrackingProductSetId,
  fetchTcgtrackingSetSkus,
} from "./tcgtracking/catalog";

const skuIdsByVariantKey = new Map<string, { skuId: string | null; expiresAt: number }>();
const setIdsByProductKey = new Map<string, { setId: number; expiresAt: number }>();

function readBounded<T extends { expiresAt: number }>(
  cache: Map<string, T>,
  key: string,
): T | undefined {
  const cached = cache.get(key);
  if (!cached) return undefined;
  if (cached.expiresAt <= Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return cached;
}

function writeBounded<T extends { expiresAt: number }>(
  cache: Map<string, T>,
  key: string,
  value: T,
  maxKeys: number,
): void {
  cache.delete(key);
  while (cache.size >= maxKeys) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) break;
    cache.delete(oldestKey);
  }
  cache.set(key, value);
}

function skuLanguageCode(language: string): string {
  const normalized = language.toLowerCase();
  return TCGTRACKING_SKU_LANGUAGE_CODES[normalized] ?? normalized.toUpperCase();
}

function variantKey(
  categoryId: number,
  target: TcgplayerSkuTarget,
  variant: string,
): string {
  return `${categoryId}:${target.productId}:${variant}:${target.condition}:${target.languageCode}`;
}

function skuTargetFor(
  pricing: TcgplayerPricing,
  entry: GroupedEntry,
): TcgplayerSkuTarget | null {
  const card: PlayingCard = entry.card;
  const condition = entry.condition;
  const languageCode = skuLanguageCode(entry.language);
  if (entry.isFoil && entry.foilType) {
    const finish = pricing
      .finishProducts?.(card)
      .find((product) => product.foilType === entry.foilType);
    if (finish) {
      return { productId: finish.productId, variants: finish.subTypes, condition, languageCode };
    }
  }
  const productId = tcgplayerProductIdOf(pricing, card);
  if (productId === null) return null;
  const subTypes = pricing.subTypes(card);
  const variants =
    entry.isFoil && subTypes.priceFoil.length > 0
      ? subTypes.priceFoil
      : subTypes.price;
  return { productId, variants, condition, languageCode };
}

function cachedSkuId(
  categoryId: number,
  target: TcgplayerSkuTarget,
): { resolved: boolean; skuId: string | null } {
  for (const variant of target.variants) {
    const cached = readBounded(skuIdsByVariantKey, variantKey(categoryId, target, variant));
    if (!cached) return { resolved: false, skuId: null };
    if (cached.skuId) return { resolved: true, skuId: cached.skuId };
  }
  return { resolved: true, skuId: null };
}

function rememberSkuIds(
  categoryId: number,
  target: TcgplayerSkuTarget,
  productSkus: TcgtrackingSku[],
): string | null {
  let firstSkuId: string | null = null;
  const expiresAt = Date.now() + TCGTRACKING_SKU_CACHE_TTL_MS;
  for (const variant of target.variants) {
    const sku = productSkus.find(
      (candidate) =>
        candidate.variant === variant &&
        candidate.condition === target.condition &&
        candidate.language === target.languageCode,
    );
    writeBounded(
      skuIdsByVariantKey,
      variantKey(categoryId, target, variant),
      { skuId: sku?.skuId ?? null, expiresAt },
      TCGTRACKING_SKU_CACHE_MAX_KEYS,
    );
    firstSkuId ??= sku?.skuId ?? null;
  }
  return firstSkuId;
}

async function loadProductSetIds(
  categoryId: number,
  productIds: number[],
): Promise<Map<number, number>> {
  const setIds = new Map<number, number>();
  const uncached = [...new Set(productIds)].filter((productId) => {
    const cached = readBounded(setIdsByProductKey, `${categoryId}:${productId}`);
    if (cached) setIds.set(productId, cached.setId);
    return !cached;
  });
  if (uncached.length > 0) {
    const rows = await db
      .select({
        productId: tcgplayerProducts.productId,
        groupId: tcgplayerProducts.groupId,
      })
      .from(tcgplayerProducts)
      .where(
        and(
          eq(tcgplayerProducts.categoryId, categoryId),
          inArray(tcgplayerProducts.productId, uncached),
        ),
      );
    for (const row of rows) setIds.set(row.productId, row.groupId);
    const missing = uncached
      .filter((productId) => !setIds.has(productId))
      .slice(0, TCGTRACKING_PRODUCT_SET_LOOKUPS_PER_EXPORT_MAX);
    for (const productId of missing) {
      const setId = await fetchTcgtrackingProductSetId(categoryId, productId);
      if (setId !== null) setIds.set(productId, setId);
    }
  }
  const expiresAt = Date.now() + TCGTRACKING_SKU_CACHE_TTL_MS;
  for (const [productId, setId] of setIds) {
    writeBounded(
      setIdsByProductKey,
      `${categoryId}:${productId}`,
      { setId, expiresAt },
      TCGTRACKING_PRODUCT_SET_CACHE_MAX_KEYS,
    );
  }
  return setIds;
}

async function forEachWithConcurrency<T>(
  items: T[],
  concurrency: number,
  run: (item: T) => Promise<void>,
): Promise<void> {
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      await run(items[nextIndex++]);
    }
  });
  await Promise.all(workers);
}

export async function resolveTcgplayerSkuIds(
  gameKey: string | undefined,
  entries: GroupedEntry[],
): Promise<(string | null)[]> {
  const pricing = gameKey ? ADAPTERS_BY_GAME_KEY[gameKey]?.tcgplayer : undefined;
  if (!pricing) return entries.map(() => null);
  const { categoryId } = pricing;

  const targets = entries.map((entry) => skuTargetFor(pricing, entry));
  const skuIds = targets.map(() => null as string | null);
  const unresolvedIndexes: number[] = [];
  targets.forEach((target, index) => {
    if (!target) return;
    const cached = cachedSkuId(categoryId, target);
    if (cached.resolved) skuIds[index] = cached.skuId;
    else unresolvedIndexes.push(index);
  });
  if (unresolvedIndexes.length === 0) return skuIds;

  const setIdsByProductId = await loadProductSetIds(
    categoryId,
    unresolvedIndexes.map((index) => targets[index]!.productId),
  );
  const indexesBySetId = new Map<number, number[]>();
  for (const index of unresolvedIndexes) {
    const setId = setIdsByProductId.get(targets[index]!.productId);
    if (setId === undefined) continue;
    const indexes = indexesBySetId.get(setId) ?? [];
    indexes.push(index);
    indexesBySetId.set(setId, indexes);
  }

  await forEachWithConcurrency(
    [...indexesBySetId.entries()],
    TCGTRACKING_SKU_SET_FETCH_CONCURRENCY,
    async ([setId, indexes]) => {
      let skusByProductId: Map<number, TcgtrackingSku[]>;
      try {
        skusByProductId = await fetchTcgtrackingSetSkus(categoryId, setId);
      } catch (err) {
        console.error(`TCGplayer SKU lookup for set ${setId} failed:`, err);
        return;
      }
      for (const index of indexes) {
        const target = targets[index]!;
        skuIds[index] = rememberSkuIds(
          categoryId,
          target,
          skusByProductId.get(target.productId) ?? [],
        );
      }
    },
  );
  return skuIds;
}
