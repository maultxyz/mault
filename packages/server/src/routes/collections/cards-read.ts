import {
  COLLECTION_CARDS_PAGE_SIZE,
  pageSizeFromQuery,
  type CollectionCardsCount,
  type CollectionCardsPage,
  type CollectionCardsQuery,
  type CollectionCardsSummary,
  type ScanTimelineBuckets,
  isScanTimelineGrouping,
} from "@magic-vault/shared";
import type { Transaction } from "../../db";
import { applyCardPricesToScans } from "../../lib/card-search/card-prices";
import {
  COLLECTION_CARDS_AGGREGATE_CACHE_MAX_ENTRIES,
  COLLECTION_CARDS_AGGREGATE_CACHE_TTL_MS,
} from "../../lib/constants/collection-read-caches";
import { createOrgReadCache } from "../../lib/org-read-cache";
import { loadOrgPricing } from "../../lib/price-source";
import { hydrateSavedScans } from "../../lib/saved-cards";
import {
  cardFilterSql,
  cardQueryUsesCatalog,
  findCardsCollection,
  loadCardsCount,
  loadCardStats,
  loadScanTimelineBuckets,
  loadUnhydratedCardsPage,
  parseCardsQuery,
  parsePage,
} from "./cards-query";
import type { TransactionRunner } from "../../lib/interfaces/collections";

const cardsSummaryCache = createOrgReadCache<CollectionCardsSummary | null>(
  COLLECTION_CARDS_AGGREGATE_CACHE_TTL_MS,
  COLLECTION_CARDS_AGGREGATE_CACHE_MAX_ENTRIES,
);

const cardsCountCache = createOrgReadCache<CollectionCardsCount | null>(
  COLLECTION_CARDS_AGGREGATE_CACHE_TTL_MS,
  COLLECTION_CARDS_AGGREGATE_CACHE_MAX_ENTRIES,
);

const scanTimelineBucketsCache = createOrgReadCache<ScanTimelineBuckets | null>(
  COLLECTION_CARDS_AGGREGATE_CACHE_TTL_MS,
  COLLECTION_CARDS_AGGREGATE_CACHE_MAX_ENTRIES,
);

function cardFilterCacheKey(
  collectionGuid: string,
  { search, filters, unreviewed }: CollectionCardsQuery,
  ...extraKeyParts: string[]
): string {
  return JSON.stringify([collectionGuid, search, filters, unreviewed, ...extraKeyParts]);
}

export async function readCardsPage(
  run: TransactionRunner,
  guid: string,
  orgId: string,
  params: Record<string, string>,
): Promise<CollectionCardsPage | null> {
  const query = parseCardsQuery(params);
  const page = parsePage(params.page);
  const pageSize = pageSizeFromQuery(params.limit, COLLECTION_CARDS_PAGE_SIZE);
  const result = await run(async (tx: Transaction) => {
    const collection = await findCardsCollection(tx, guid, orgId);
    if (!collection) return null;
    const data = await loadUnhydratedCardsPage(
      tx,
      collection,
      query,
      page,
      pageSize,
    );
    return { gameKey: collection.gameKey, lang: collection.lang, data };
  });
  if (!result) return null;
  const hydratedItems = await hydrateSavedScans(
    { gameKey: result.gameKey, lang: result.lang },
    result.data.items,
    { includeRaw: true },
  );
  const items = await applyCardPricesToScans(
    result.gameKey,
    result.lang,
    hydratedItems,
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
  return cardsSummaryCache.get(orgId, cardFilterCacheKey(guid, query), () =>
    run(async (tx) => {
      const collection = await findCardsCollection(tx, guid, orgId);
      if (!collection) return null;
      const pricing = await loadOrgPricing(tx, orgId);
      return loadCardStats(tx, collection, cardFilterSql(query), pricing);
    }),
  );
}

export async function readCardsCount(
  run: TransactionRunner,
  guid: string,
  orgId: string,
  params: Record<string, string>,
): Promise<CollectionCardsCount | null> {
  const query = parseCardsQuery(params);
  return cardsCountCache.get(orgId, cardFilterCacheKey(guid, query), () =>
    run(async (tx) => {
      const collection = await findCardsCollection(tx, guid, orgId);
      if (!collection) return null;
      return {
        totalCount: await loadCardsCount(
          tx,
          collection,
          cardFilterSql(query),
          cardQueryUsesCatalog(query, collection),
        ),
      };
    }),
  );
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
  return scanTimelineBucketsCache.get(
    orgId,
    cardFilterCacheKey(guid, query, grouping, timeZone),
    () =>
      run(async (tx) => {
        const collection = await findCardsCollection(tx, guid, orgId);
        if (!collection) return null;
        return {
          buckets: await loadScanTimelineBuckets(
            tx,
            collection,
            cardFilterSql(query),
            cardQueryUsesCatalog(query, collection),
            grouping,
            timeZone,
          ),
        };
      }),
  );
}
