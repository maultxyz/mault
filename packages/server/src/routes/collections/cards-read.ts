import {
  COLLECTION_CARDS_PAGE_SIZE,
  type CollectionCardsPage,
  type CollectionCardsSummary,
} from "@magic-vault/shared";
import { sql } from "drizzle-orm";
import type { Transaction } from "../../db";
import { applyTcgplayerPricesToScans } from "../../lib/card-search/tcgplayer-prices";
import {
  cardFilterSql,
  findCardsCollection,
  loadCardStats,
  loadCardsPage,
  parseCardsQuery,
  parsePage,
} from "./cards-query";

type TransactionRunner = <T>(fn: (tx: Transaction) => Promise<T>) => Promise<T>;

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
  const items = await applyTcgplayerPricesToScans(
    result.gameKey,
    result.data.items,
  );
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
    const all = await loadCardStats(tx, collection.id, sql`TRUE`);
    const filtered = await loadCardStats(
      tx,
      collection.id,
      cardFilterSql(query),
    );
    return { all, filtered };
  });
}
