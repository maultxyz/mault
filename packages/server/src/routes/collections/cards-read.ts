import {
  COLLECTION_CARDS_PAGE_SIZE,
  pageSizeFromQuery,
  type CollectionCardsCount,
  type CollectionCardsPage,
  type CollectionCardsSummary,
  type ScanTimelineBuckets,
  isScanTimelineGrouping,
} from "@magic-vault/shared";
import type { Transaction } from "../../db";
import { applyCardPricesToScans } from "../../lib/card-search/card-prices";
import { loadOrgPricing } from "../../lib/price-source";
import {
  cardFilterSql,
  cardQueryUsesCatalog,
  findCardsCollection,
  loadCardsCount,
  loadCardStats,
  loadCardsPage,
  loadScanTimelineBuckets,
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
  const pageSize = pageSizeFromQuery(params.limit, COLLECTION_CARDS_PAGE_SIZE);
  const result = await run(async (tx) => {
    const collection = await findCardsCollection(tx, guid, orgId);
    if (!collection) return null;
    const data = await loadCardsPage(
      tx,
      collection,
      query,
      page,
      pageSize,
    );
    return { gameKey: collection.gameKey, lang: collection.lang, data };
  });
  if (!result) return null;
  const items = await applyCardPricesToScans(
    result.gameKey,
    result.lang,
    result.data.items,
  );
  return {
    ...result.data,
    items,
    page,
    pageSize,
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
    const pricing = await loadOrgPricing(tx, orgId);
    return loadCardStats(tx, collection, cardFilterSql(query), pricing);
  });
}

export async function readCardsCount(
  run: TransactionRunner,
  guid: string,
  orgId: string,
  params: Record<string, string>,
): Promise<CollectionCardsCount | null> {
  const query = parseCardsQuery(params);
  return run(async (tx) => {
    const collection = await findCardsCollection(tx, guid, orgId);
    if (!collection) return null;
    return {
      totalCount: await loadCardsCount(
        tx,
        collection,
        cardFilterSql(query),
        cardQueryUsesCatalog(query, collection.fieldDefinitions),
      ),
    };
  });
}

function isKnownTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export async function readScanTimelineBuckets(
  run: TransactionRunner,
  guid: string,
  orgId: string,
  params: Record<string, string>,
): Promise<ScanTimelineBuckets | "invalid_params" | null> {
  const { grouping, timeZone } = params;
  if (!isScanTimelineGrouping(grouping) || !timeZone || !isKnownTimeZone(timeZone)) {
    return "invalid_params";
  }
  const query = parseCardsQuery(params);
  return run(async (tx) => {
    const collection = await findCardsCollection(tx, guid, orgId);
    if (!collection) return null;
    return {
      buckets: await loadScanTimelineBuckets(
        tx,
        collection,
        cardFilterSql(query),
        cardQueryUsesCatalog(query, collection.fieldDefinitions),
        grouping,
        timeZone,
      ),
    };
  });
}
