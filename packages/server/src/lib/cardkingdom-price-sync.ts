import { lt, max, sql } from "drizzle-orm";
import { db } from "../db";
import { cardKingdomPrices } from "../db/schema";
import { cardKingdomNumber } from "./card-search/cardkingdom-prices";
import { CARD_API_HEADERS } from "./constants/card-search";
import { CARDKINGDOM_PRICE_UPSERT_BATCH_SIZE } from "./constants/sync";
import {
  CARDKINGDOM_DOWNLOAD_TIMEOUT_MS,
  CARDKINGDOM_MIN_PULL_INTERVAL_MS,
} from "./constants/timing";
import {
  CARDKINGDOM_PRICELIST_URL,
  CARDKINGDOM_SITE_URL,
} from "./constants/urls";
import type {
  CardKingdomPriceListEntry,
  CardKingdomPriceListFile,
  CardKingdomSyncResult,
} from "./interfaces/cardkingdom";

function positivePrice(value: string | null): number | null {
  const price = Number(value);
  return Number.isFinite(price) && price > 0 ? price : null;
}

function skuParts(entry: CardKingdomPriceListEntry): {
  setCode: string;
  number: string;
} {
  const [prefix, ...rest] = entry.sku.toLowerCase().split("-");
  const isFoil = entry.is_foil === "true";
  const setCode =
    isFoil && prefix.length > 3 && prefix.startsWith("f")
      ? prefix.slice(1)
      : prefix;
  return { setCode, number: cardKingdomNumber(rest.join("-")) };
}

async function upsertPrices(
  entries: CardKingdomPriceListEntry[],
  baseUrl: string,
  pulledAt: Date,
): Promise<void> {
  for (
    let i = 0;
    i < entries.length;
    i += CARDKINGDOM_PRICE_UPSERT_BATCH_SIZE
  ) {
    const batch = entries.slice(i, i + CARDKINGDOM_PRICE_UPSERT_BATCH_SIZE);
    await db
      .insert(cardKingdomPrices)
      .values(
        batch.map((e) => ({
          productId: e.id,
          scryfallId: e.scryfall_id || null,
          isFoil: e.is_foil === "true",
          ...skuParts(e),
          retail: positivePrice(e.price_retail),
          retailQty: e.qty_retail,
          buylist: positivePrice(e.price_buy),
          url: e.url ? new URL(e.url, baseUrl).toString() : null,
          updatedAt: pulledAt,
        })),
      )
      .onConflictDoUpdate({
        target: cardKingdomPrices.productId,
        set: {
          scryfallId: sql`excluded.scryfall_id`,
          isFoil: sql`excluded.is_foil`,
          setCode: sql`excluded.set_code`,
          number: sql`excluded.number`,
          retail: sql`excluded.retail`,
          retailQty: sql`excluded.retail_qty`,
          buylist: sql`excluded.buylist`,
          url: sql`excluded.url`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
  }
}

async function lastPulledAt(): Promise<Date | null> {
  const [row] = await db
    .select({ lastSynced: max(cardKingdomPrices.updatedAt) })
    .from(cardKingdomPrices);
  return row?.lastSynced ?? null;
}

export async function syncCardKingdomPrices({
  force = false,
  log,
}: {
  force?: boolean;
  log: (msg: string) => void;
}): Promise<CardKingdomSyncResult> {
  const pulledAt = await lastPulledAt();
  if (
    !force &&
    pulledAt &&
    Date.now() - pulledAt.getTime() < CARDKINGDOM_MIN_PULL_INTERVAL_MS
  ) {
    log("Card Kingdom: price list pulled recently; skipping.");
    return { prices: 0, removed: 0, skipped: true };
  }

  const startedAt = new Date();
  const res = await fetch(CARDKINGDOM_PRICELIST_URL, {
    headers: CARD_API_HEADERS,
    signal: AbortSignal.timeout(CARDKINGDOM_DOWNLOAD_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(
      `GET ${CARDKINGDOM_PRICELIST_URL} failed: HTTP ${res.status}`,
    );
  }
  const list = (await res.json()) as CardKingdomPriceListFile;
  await upsertPrices(
    list.data,
    list.meta.base_url || CARDKINGDOM_SITE_URL,
    startedAt,
  );

  const removed = await db
    .delete(cardKingdomPrices)
    .where(lt(cardKingdomPrices.updatedAt, startedAt))
    .returning({ productId: cardKingdomPrices.productId });

  log(
    `Card Kingdom: ${list.data.length} prices synced, ${removed.length} delisted (list ${list.meta.created_at}).`,
  );
  return { prices: list.data.length, removed: removed.length, skipped: false };
}
