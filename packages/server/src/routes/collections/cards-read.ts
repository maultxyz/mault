import {
  COLLECTION_CARDS_PAGE_SIZE,
  type CollectionCardsPage,
  type CollectionCardsSummary,
} from "@magic-vault/shared";
import { sql } from "drizzle-orm";
import type { Transaction } from "../../db";
import { applyCardPricesToScans } from "../../lib/card-search/card-prices";
import { loadOrgPriceSource } from "../../lib/price-source";
import {
  cardFilterSql,
  findCardsCollection,
  loadCardStats,
  loadCardsPage,
  parseCardsQuery,
  parsePage,
} from "./cards-query";
import type { TransactionRunner } from "../../lib/interfaces/collections";

export async function readCardsPage(
  run: TransactionRunner,
  guid: string,
  orgId: string,
  params: Record<string, string>,
): Promise<CollectionCardsPage | null> {
  const query = parseCardsQuery(params);
  const page = parsePage(params.page);
  const result = await run(async (tx) => {
    const collection = await findCardsCollection(tx, guid, orgId);
    if (!collection) return null;
    const data = await loadCardsPage(
      tx,
      collection.id,
      collection.fieldDefinitions,
      query,
      page,
      COLLECTION_CARDS_PAGE_SIZE,
    );
    return { gameKey: collection.gameKey, data };
  });
  if (!result) return null;
  const items = await applyCardPricesToScans(result.gameKey, result.data.items);
  return {
    ...result.data,
    items,
    page,
    pageSize: COLLECTION_CARDS_PAGE_SIZE,
  };
}

export async function readCardsSummary(
  run: TransactionRunner,
  guid: string,
  orgId: string,
  params: Record<string, string>,
): Promise<CollectionCardsSummary | null> {
  const query = parseCardsQuery(params);
  return run(async (tx) => {
    const collection = await findCardsCollection(tx, guid, orgId);
    if (!collection) return null;
    const priceSource = await loadOrgPriceSource(tx, orgId);
    const all = await loadCardStats(tx, collection.id, sql`TRUE`, priceSource);
    const filtered = await loadCardStats(
      tx,
      collection.id,
      cardFilterSql(query),
      priceSource,
    );
    return { all, filtered };
  });
}
