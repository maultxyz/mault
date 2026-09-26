import { max, sql } from "drizzle-orm";
import { db } from "../db";
import { tcgplayerPrices, tcgplayerProducts } from "../db/schema";
import { fetchCardApi } from "./card-search/fetch";
import { ADAPTERS_BY_GAME_KEY } from "./card-search/resolve";
import { CARD_API_HEADERS } from "./constants/card-search";
import {
  TCGPLAYER_PRICE_UPSERT_BATCH_SIZE,
  TCGPLAYER_PRODUCT_UPSERT_BATCH_SIZE,
} from "./constants/sync";
import {
  TCGCSV_REQUEST_DELAY_MS,
  TCGPLAYER_PRODUCTS_MAX_AGE_MS,
} from "./constants/timing";
import { TCGCSV_URL } from "./constants/urls";
import type {
  PriceSyncResult,
  TcgcsvGroup,
  TcgcsvPrice,
  TcgcsvProduct,
  TcgcsvResponse,
} from "./interfaces/tcgcsv";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function tcgcsvGet(path: string): Promise<Response> {
  const res = await fetchCardApi(`${TCGCSV_URL}${path}`, {
    headers: CARD_API_HEADERS,
  });
  await sleep(TCGCSV_REQUEST_DELAY_MS);
  if (!res.ok) throw new Error(`GET ${path} failed: HTTP ${res.status}`);
  return res;
}

async function tcgcsvResults<T>(path: string): Promise<T[]> {
  const json = (await (await tcgcsvGet(path)).json()) as TcgcsvResponse<T>;
  if (!json.success) {
    throw new Error(`GET ${path} failed: ${json.errors.join("; ")}`);
  }
  return json.results;
}

async function upsertPrices(
  categoryId: number,
  prices: TcgcsvPrice[],
): Promise<void> {
  for (let i = 0; i < prices.length; i += TCGPLAYER_PRICE_UPSERT_BATCH_SIZE) {
    const batch = prices.slice(i, i + TCGPLAYER_PRICE_UPSERT_BATCH_SIZE);
    await db
      .insert(tcgplayerPrices)
      .values(
        batch.map((p) => ({
          productId: p.productId,
          subType: p.subTypeName,
          categoryId,
          lowPrice: p.lowPrice,
          midPrice: p.midPrice,
          highPrice: p.highPrice,
          marketPrice: p.marketPrice,
          directLowPrice: p.directLowPrice,
        })),
      )
      .onConflictDoUpdate({
        target: [tcgplayerPrices.productId, tcgplayerPrices.subType],
        set: {
          categoryId: sql`excluded.category_id`,
          lowPrice: sql`excluded.low_price`,
          midPrice: sql`excluded.mid_price`,
          highPrice: sql`excluded.high_price`,
          marketPrice: sql`excluded.market_price`,
          directLowPrice: sql`excluded.direct_low_price`,
          updatedAt: sql`now()`,
        },
      });
  }
}

function extendedValue(product: TcgcsvProduct, name: string): string | null {
  return product.extendedData.find((e) => e.name === name)?.value ?? null;
}

async function upsertProducts(
  categoryId: number,
  products: TcgcsvProduct[],
): Promise<void> {
  for (
    let i = 0;
    i < products.length;
    i += TCGPLAYER_PRODUCT_UPSERT_BATCH_SIZE
  ) {
    const batch = products.slice(i, i + TCGPLAYER_PRODUCT_UPSERT_BATCH_SIZE);
    await db
      .insert(tcgplayerProducts)
      .values(
        batch.map((p) => ({
          productId: p.productId,
          categoryId,
          groupId: p.groupId,
          name: p.name,
          number: extendedValue(p, "Number"),
          rarity: extendedValue(p, "Rarity"),
        })),
      )
      .onConflictDoUpdate({
        target: tcgplayerProducts.productId,
        set: {
          categoryId: sql`excluded.category_id`,
          groupId: sql`excluded.group_id`,
          name: sql`excluded.name`,
          number: sql`excluded.number`,
          rarity: sql`excluded.rarity`,
          updatedAt: sql`now()`,
        },
      });
  }
}

async function lastSyncedByCategory(
  table: typeof tcgplayerPrices | typeof tcgplayerProducts,
): Promise<Map<number, Date>> {
  const rows = await db
    .select({ categoryId: table.categoryId, lastSynced: max(table.updatedAt) })
    .from(table)
    .groupBy(table.categoryId);
  return new Map(
    rows.flatMap((r) => (r.lastSynced ? [[r.categoryId, r.lastSynced]] : [])),
  );
}

export async function syncTcgplayerPrices({
  force = false,
  log,
}: {
  force?: boolean;
  log: (msg: string) => void;
}): Promise<PriceSyncResult> {
  const lastUpdated = new Date(
    (await (await tcgcsvGet("/last-updated.txt")).text()).trim(),
  );
  const pricesSyncedAt = await lastSyncedByCategory(tcgplayerPrices);
  const productsSyncedAt = await lastSyncedByCategory(tcgplayerProducts);
  const productsCutoff = new Date(Date.now() - TCGPLAYER_PRODUCTS_MAX_AGE_MS);

  const needsProducts = new Map<number, boolean>();
  for (const adapter of Object.values(ADAPTERS_BY_GAME_KEY)) {
    if (!adapter.tcgplayer) continue;
    const { categoryId, productMatch } = adapter.tcgplayer;
    needsProducts.set(
      categoryId,
      (needsProducts.get(categoryId) ?? false) || !!productMatch,
    );
  }

  const plans = [...needsProducts].flatMap(([categoryId, matchesProducts]) => {
    const pricedAt = pricesSyncedAt.get(categoryId);
    const productsAt = productsSyncedAt.get(categoryId);
    const prices = force || !pricedAt || pricedAt < lastUpdated;
    const products =
      matchesProducts && (force || !productsAt || productsAt < productsCutoff);
    return prices || products ? [{ categoryId, prices, products }] : [];
  });

  if (plans.length === 0) {
    log(
      `tcgcsv build ${lastUpdated.toISOString()} already pulled for every category; nothing to do.`,
    );
    return { skipped: true, prices: 0, products: 0, failedGroups: 0 };
  }

  log(
    `Pulling tcgcsv build ${lastUpdated.toISOString()}: ${plans
      .map(
        (p) =>
          `${p.categoryId} (${[p.prices && "prices", p.products && "products"].filter(Boolean).join(" + ")})`,
      )
      .join(", ")}...`,
  );

  let totalPrices = 0;
  let totalProducts = 0;
  let failedGroups = 0;
  for (const plan of plans) {
    const groups = await tcgcsvResults<TcgcsvGroup>(
      `/tcgplayer/${plan.categoryId}/groups`,
    );

    let categoryPrices = 0;
    let categoryProducts = 0;
    for (const group of groups) {
      const groupPath = `/tcgplayer/${plan.categoryId}/${group.groupId}`;
      try {
        if (plan.products) {
          const products = await tcgcsvResults<TcgcsvProduct>(
            `${groupPath}/products`,
          );
          await upsertProducts(plan.categoryId, products);
          categoryProducts += products.length;
        }
        if (plan.prices) {
          const prices = await tcgcsvResults<TcgcsvPrice>(
            `${groupPath}/prices`,
          );
          await upsertPrices(plan.categoryId, prices);
          categoryPrices += prices.length;
        }
      } catch (err) {
        failedGroups++;
        log(`Category ${plan.categoryId}, group ${group.name}: ${String(err)}`);
      }
    }

    totalPrices += categoryPrices;
    totalProducts += categoryProducts;
    log(
      `Category ${plan.categoryId}: ${categoryPrices} prices, ${categoryProducts} products across ${groups.length} groups.`,
    );
  }

  log(
    `Done. ${totalPrices} prices and ${totalProducts} products synced, ${failedGroups} groups failed.`,
  );
  return {
    skipped: false,
    prices: totalPrices,
    products: totalProducts,
    failedGroups,
  };
}
