import {
  STORAGE_LOCATION_NAME_MAX_LENGTH,
  STORAGE_VERIFY_CARDS_MAX,
  toCardCondition,
  type CardStatsAggregate,
  type CollectionCardsQuery,
  type FieldMeta,
  type OrgPricing,
  type PlayingCardWithDistance,
  type PickListEntryInput,
  type StorageLocationCardContext,
  type StorageLocationSearchResult,
  type StoragePickList,
  type StorageLocation,
  type StorageLocationCard,
  type StorageLocationExportCard,
  type StorageLocationExportSummary,
} from "@magic-vault/shared";
import { and, asc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { uuidArraySql } from "../../lib/sql-arrays";
import type { Transaction } from "../../db";
import {
  collectionCards,
  collections,
  games,
  storageLocations,
} from "../../db/schema";
import type {
  StorageLocationRow,
  StoredCardIdsPage,
  StoredCardNavigationRow,
} from "../../lib/interfaces/storage-locations";
import {
  cardPricesJoinSql,
  cardWithStoredPricesSql,
  joinedScannedCardPriceSql,
} from "../../lib/card-price-sql";
import { cardCatalogJoinSql } from "../../lib/card-catalog-sql";
import {
  STORED_CARD_CATALOG_SCOPE,
  STORED_CARD_COLLECTION_JOINS,
  INVENTORY_CARD_FILTER,
  INVENTORY_CARD_JOINS,
  STORED_CARD_POSITION_ORDER,
  WANTED_LINE_NAME_MATCH,
} from "../../lib/constants/storage-locations";
import {
  cardFilterSql,
  cardQueryUsesCatalog,
  cardSortKeySql,
  loadCardStatsForSource,
  sortUsesStoredPrices,
} from "../collections/cards-query";
import { CC_ALIAS_SQL_COLUMNS } from "../../lib/constants/card-prices";
import { loadOrgPricing } from "../../lib/price-source";
import { hydrateSavedCards } from "../../lib/saved-cards";

export function parseLocationName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim();
  if (!name || name.length > STORAGE_LOCATION_NAME_MAX_LENGTH) return null;
  return name;
}

export async function locationNameTaken(
  tx: Transaction,
  orgId: string,
  name: string,
  excludeGuid?: string,
): Promise<boolean> {
  const existing = await tx.query.storageLocations.findFirst({
    where: (t, { eq, and }) =>
      and(
        eq(t.orgId, orgId),
        eq(t.isDeleted, false),
        sql`lower(${t.name}) = ${name.toLowerCase()}`,
      ),
    columns: { guid: true },
  });
  return !!existing && existing.guid !== excludeGuid;
}

export async function findLocationId(
  tx: Transaction,
  orgId: string,
  guid: string,
): Promise<number | null> {
  const location = await tx.query.storageLocations.findFirst({
    where: (t, { eq, and }) =>
      and(eq(t.guid, guid), eq(t.orgId, orgId), eq(t.isDeleted, false)),
    columns: { id: true },
  });
  return location?.id ?? null;
}

export const storedCardPosition = sql<number>`COALESCE(${collectionCards.locationPosition}, 0)`;

export function storedCardsWhere(
  locationId: number,
  ...conditions: (SQL | undefined)[]
) {
  return and(
    eq(collectionCards.locationId, locationId),
    eq(collections.isDeleted, false),
    ...conditions,
  );
}

function storedCardColumns() {
  return {
    rowId: collectionCards.id,
    scanId: collectionCards.guid,
    position: storedCardPosition,
    card: sql<PlayingCardWithDistance>`${cardWithStoredPricesSql(sql`(${collectionCards.card} - 'raw')`)}`,
    isFoil: collectionCards.isFoil,
    foilType: collectionCards.foilType,
    stamp: collectionCards.stamp,
    condition: collectionCards.condition,
    language: collectionCards.language,
    lowConfidenceMatch: collectionCards.lowConfidenceMatch,
    hasAlternatives: sql<boolean>`(${collectionCards.alternativeMatches} IS NOT NULL AND ${collectionCards.alternativeMatches} <> '[]'::jsonb)`,
    corrected: collectionCards.isCorrected,
    reviewed: collectionCards.isReviewed,
    acquisitionCost: collectionCards.acquisitionCost,
    acquisitionCurrency: collectionCards.acquisitionCurrency,
    collectionGuid: collections.guid,
    collectionName: collections.name,
    collectionLang: collections.lang,
    gameKey: games.key,
  };
}

export function selectStoredCards(tx: Transaction) {
  return tx
    .select(storedCardColumns())
    .from(collectionCards)
    .innerJoin(collections, eq(collections.id, collectionCards.collectionId))
    .leftJoin(games, eq(games.id, collections.gameId));
}

export function selectLocatedCards(tx: Transaction) {
  return tx
    .select({
      ...storedCardColumns(),
      locationGuid: storageLocations.guid,
      locationName: storageLocations.name,
    })
    .from(collectionCards)
    .innerJoin(
      storageLocations,
      and(
        eq(storageLocations.id, collectionCards.locationId),
        eq(storageLocations.isDeleted, false),
      ),
    )
    .innerJoin(collections, eq(collections.id, collectionCards.collectionId))
    .leftJoin(games, eq(games.id, collections.gameId));
}

export async function toLocatedCards(
  rows: Awaited<ReturnType<typeof selectLocatedCards>>,
  canViewCosts: boolean,
): Promise<StorageLocationSearchResult[]> {
  const stored = await toStoredCards(rows, canViewCosts);
  return stored.map((card, index) => ({
    ...card,
    locationGuid: rows[index].locationGuid!,
    locationName: rows[index].locationName,
  }));
}

export function visibleAcquisitionCost(
  row: { acquisitionCost: number | null; acquisitionCurrency: string | null },
  canViewCosts: boolean,
): Pick<StorageLocationCard, "acquisitionCost" | "acquisitionCurrency"> {
  return canViewCosts && row.acquisitionCost !== null
    ? {
        acquisitionCost: row.acquisitionCost,
        acquisitionCurrency: row.acquisitionCurrency,
      }
    : { acquisitionCost: null, acquisitionCurrency: null };
}

export async function toStoredCards(
  rows: Awaited<ReturnType<typeof selectStoredCards>>,
  canViewCosts: boolean,
): Promise<StorageLocationCard[]> {
  const cards = await hydrateSavedCards(
    rows.map((r) => ({
      gameKey: r.gameKey,
      lang: r.collectionLang,
      card: r.card,
    })),
    { includeRaw: false },
  );
  return rows.map((r, i) => toStoredCard(r, cards[i], canViewCosts));
}

function toStoredCard(
  r: Awaited<ReturnType<typeof selectStoredCards>>[number],
  card: PlayingCardWithDistance,
  canViewCosts: boolean,
): StorageLocationCard {
  return {
    scanId: r.scanId!,
    position: Number(r.position),
    card,
    isFoil: r.isFoil,
    foilType: r.foilType,
    stamp: r.stamp,
    condition: toCardCondition(r.condition),
    language: r.language,
    lowConfidenceMatch: r.lowConfidenceMatch,
    hasAlternatives: r.hasAlternatives,
    corrected: r.corrected,
    reviewed: r.reviewed,
    ...visibleAcquisitionCost(r, canViewCosts),
    collectionGuid: r.collectionGuid!,
    collectionName: r.collectionName,
  };
}

export async function orderedLocationGuids(
  tx: Transaction,
  orgId: string,
): Promise<(string | null)[]> {
  const rows = await tx
    .select({ guid: storageLocations.guid })
    .from(storageLocations)
    .where(
      and(
        eq(storageLocations.orgId, orgId),
        eq(storageLocations.isDeleted, false),
      ),
    )
    .orderBy(asc(storageLocations.name), asc(storageLocations.id));
  return rows.map((row) => row.guid);
}

export async function loadLocations(
  tx: Transaction,
  orgId: string,
  guids?: string[],
): Promise<StorageLocation[]> {
  if (guids && guids.length === 0) return [];
  const pricing = await loadOrgPricing(tx, orgId);
  const result = await tx.execute(sql`
    SELECT sl.guid, sl.name, sl.created_at, sl.last_used_at,
      count(cc.id)::int AS card_count,
      COALESCE(sum(${joinedScannedCardPriceSql(pricing, CC_ALIAS_SQL_COLUMNS, "cp")}) FILTER (WHERE cc.id IS NOT NULL), 0)::float8 AS total_value
    FROM ${storageLocations} sl
    LEFT JOIN (
      ${collectionCards} cc
      JOIN ${collections} col ON col.id = cc.collection_id AND col.is_deleted = false
      LEFT JOIN games g ON g.id = col.game_id
      LEFT JOIN card_prices cp ON cp.game_key = g.key
        AND cp.lang = COALESCE(cc.card_lang, col.lang)
        AND cp.card_id = cc.card_id
    ) ON cc.location_id = sl.id
    WHERE sl.org_id = ${orgId}
      AND sl.is_deleted = false
      ${guids ? sql`AND sl.guid = ANY(${uuidArraySql(guids)})` : sql``}
    GROUP BY sl.id
    ORDER BY sl.name, sl.id
  `);
  return (result.rows as unknown as StorageLocationRow[]).map((r) => ({
    guid: r.guid,
    name: r.name,
    createdAt: new Date(r.created_at),
    lastUsedAt: r.last_used_at ? new Date(r.last_used_at) : null,
    cardCount: Number(r.card_count),
    totalValue: Number(r.total_value),
  }));
}

export async function loadStorageLocationExportCards(
  tx: Transaction,
  locationId: number,
): Promise<StorageLocationExportCard[]> {
  const rows = await tx
    .select({
      scanId: collectionCards.guid,
      position: collectionCards.locationPosition,
      card: sql<PlayingCardWithDistance>`${cardWithStoredPricesSql(sql`${collectionCards.card}`)}`,
      isFoil: collectionCards.isFoil,
      foilType: collectionCards.foilType,
      stamp: collectionCards.stamp,
      condition: collectionCards.condition,
      language: collectionCards.language,
      collectionName: collections.name,
      collectionLang: collections.lang,
      gameKey: games.key,
    })
    .from(collectionCards)
    .innerJoin(collections, eq(collections.id, collectionCards.collectionId))
    .leftJoin(games, eq(games.id, collections.gameId))
    .where(
      and(
        eq(collectionCards.locationId, locationId),
        eq(collections.isDeleted, false),
      ),
    )
    .orderBy(asc(collectionCards.locationPosition));
  const cards = await hydrateSavedCards(
    rows.map((r) => ({
      gameKey: r.gameKey,
      lang: r.collectionLang,
      card: r.card,
    })),
    { includeRaw: true },
  );
  return rows.map((r, i) => ({
    scanId: r.scanId!,
    position: r.position ?? 0,
    collectionName: r.collectionName,
    gameKey: r.gameKey,
    card: cards[i],
    isFoil: r.isFoil,
    foilType: r.foilType,
    stamp: r.stamp,
    condition: toCardCondition(r.condition),
    language: r.language,
  }));
}

export async function loadStorageLocationExportSummary(
  tx: Transaction,
  locationId: number,
): Promise<StorageLocationExportSummary> {
  const rows = await tx
    .select({ scanId: collectionCards.guid, gameKey: games.key })
    .from(collectionCards)
    .innerJoin(collections, eq(collections.id, collectionCards.collectionId))
    .leftJoin(games, eq(games.id, collections.gameId))
    .where(
      and(
        eq(collectionCards.locationId, locationId),
        eq(collections.isDeleted, false),
      ),
    );
  return {
    gameKeys: [...new Set(rows.map((row) => row.gameKey))],
    scanIds: rows.flatMap((row) => (row.scanId ? [row.scanId] : [])),
  };
}

export async function loadLocationFieldDefinitions(
  tx: Transaction,
  locationId: number,
): Promise<FieldMeta[]> {
  const result = await tx.execute(sql`
    SELECT g.field_definitions FROM games g
    WHERE g.id IN (
      SELECT col.game_id FROM collection_cards cc
      JOIN collections col ON col.id = cc.collection_id AND NOT col.is_deleted
      WHERE cc.location_id = ${locationId}
    )
  `);
  const [first = [], ...rest] = (
    result.rows as unknown as { field_definitions: FieldMeta[] | null }[]
  ).map((row) => row.field_definitions ?? []);
  return first.filter((field) =>
    rest.every((fields) =>
      fields.some(
        (other) =>
          other.field === field.field &&
          other.path === field.path &&
          other.type === field.type,
      ),
    ),
  );
}

function storedCardsRankedCte(
  locationId: number,
  query: CollectionCardsQuery,
  fieldDefinitions: FieldMeta[],
  keepScanId?: string,
): SQL {
  const sortKey = cardSortKeySql(query.sort, fieldDefinitions);
  const keepCard = keepScanId ? sql` OR cc.guid = ${keepScanId}::uuid` : sql``;
  return sql`
    ranked AS (
      SELECT cc.id, cc.guid, col.guid AS collection_guid, cc.is_reviewed,
        row_number() OVER (
          ORDER BY ${sortKey ? sql`${sortKey}, ` : sql``}${STORED_CARD_POSITION_ORDER}
        ) AS rn
      FROM collection_cards cc
      ${STORED_CARD_COLLECTION_JOINS}
      ${cardQueryUsesCatalog(query, fieldDefinitions) ? cardCatalogJoinSql(STORED_CARD_CATALOG_SCOPE, CC_ALIAS_SQL_COLUMNS) : sql``}
      ${sortUsesStoredPrices(query.sort, fieldDefinitions) ? cardPricesJoinSql("cp", STORED_CARD_CATALOG_SCOPE, CC_ALIAS_SQL_COLUMNS) : sql``}
      WHERE cc.location_id = ${locationId}
        AND ((${cardFilterSql(query, keepScanId)})${keepCard})
    )`;
}

export async function loadStoredCardIdsPage(
  tx: Transaction,
  locationId: number,
  query: CollectionCardsQuery,
  fieldDefinitions: FieldMeta[],
  pageSize: number,
  requestedPage: number,
): Promise<StoredCardIdsPage> {
  const ranked = storedCardsRankedCte(locationId, query, fieldDefinitions);
  const counted = await tx.execute(sql`
    WITH ${ranked} SELECT count(*)::int AS total FROM ranked
  `);
  const total = Number(
    (counted.rows[0] as unknown as { total: number } | undefined)?.total ?? 0,
  );
  const page = Math.min(requestedPage, Math.max(Math.ceil(total / pageSize), 1));
  const result = await tx.execute(sql`
    WITH ${ranked}
    SELECT id FROM ranked ORDER BY rn
    LIMIT ${pageSize}::int OFFSET ${(page - 1) * pageSize}::int
  `);
  return {
    rowIds: (result.rows as unknown as { id: number }[]).map((row) =>
      Number(row.id),
    ),
    total,
    page,
  };
}

export async function loadStoredCardsByRowIds(
  tx: Transaction,
  rowIds: number[],
) {
  if (rowIds.length === 0) return [];
  const rows = await selectStoredCards(tx).where(
    and(inArray(collectionCards.id, rowIds), eq(collections.isDeleted, false)),
  );
  const order = new Map(rowIds.map((rowId, index) => [rowId, index]));
  return rows.sort(
    (a, b) => (order.get(a.rowId) ?? 0) - (order.get(b.rowId) ?? 0),
  );
}

export async function loadStoredCardNavigation(
  tx: Transaction,
  locationId: number,
  query: CollectionCardsQuery,
  fieldDefinitions: FieldMeta[],
  scanId: string,
  unreviewedOnly: boolean,
): Promise<Omit<StorageLocationCardContext, "card"> | null> {
  const neighborFilter = unreviewedOnly ? sql`AND NOT is_reviewed` : sql``;
  const result = await tx.execute(sql`
    WITH ${storedCardsRankedCte(locationId, { ...query, unreviewed: false }, fieldDefinitions, scanId)},
    target AS (SELECT rn FROM ranked WHERE guid = ${scanId}::uuid)
    SELECT
      (target.rn - 1)::int AS index,
      (SELECT count(*) FROM ranked)::int AS total,
      prev.guid::text AS prev_scan_id,
      prev.collection_guid::text AS prev_collection_guid,
      next.guid::text AS next_scan_id,
      next.collection_guid::text AS next_collection_guid
    FROM target
    LEFT JOIN LATERAL (
      SELECT guid, collection_guid FROM ranked
      WHERE rn < target.rn ${neighborFilter}
      ORDER BY rn DESC LIMIT 1
    ) prev ON true
    LEFT JOIN LATERAL (
      SELECT guid, collection_guid FROM ranked
      WHERE rn > target.rn ${neighborFilter}
      ORDER BY rn ASC LIMIT 1
    ) next ON true
  `);
  const row = result.rows[0] as unknown as StoredCardNavigationRow | undefined;
  if (!row) return null;
  return {
    index: row.index,
    total: row.total,
    previous:
      row.prev_scan_id && row.prev_collection_guid
        ? { scanId: row.prev_scan_id, collectionGuid: row.prev_collection_guid }
        : null,
    next:
      row.next_scan_id && row.next_collection_guid
        ? { scanId: row.next_scan_id, collectionGuid: row.next_collection_guid }
        : null,
  };
}

export function loadLocationCardStats(
  tx: Transaction,
  locationId: number,
  pricing: OrgPricing,
): Promise<CardStatsAggregate> {
  return loadCardStatsForSource(
    tx,
    {
      scope: STORED_CARD_CATALOG_SCOPE,
      joins: STORED_CARD_COLLECTION_JOINS,
      where: sql`cc.location_id = ${locationId}`,
    },
    pricing,
  );
}

function wantedLinesCte(entries: PickListEntryInput[]): SQL {
  const wanted = entries.map((entry, lineIndex) => ({
    line_index: lineIndex,
    name: entry.name.trim().toLowerCase().replace(/\s+/g, " "),
    quantity: entry.quantity,
  }));
  return sql`wanted AS (
    SELECT * FROM jsonb_to_recordset(${JSON.stringify(wanted)}::jsonb)
      AS w(line_index int, name text, quantity int)
  )`;
}

export async function loadStoragePickList(
  tx: Transaction,
  orgId: string,
  entries: PickListEntryInput[],
  canViewCosts: boolean,
): Promise<StoragePickList> {
  if (entries.length === 0) return { lines: [], cards: [] };
  const matched = await tx.execute(sql`
    WITH ${wantedLinesCte(entries)},
    matched AS (
      SELECT cc.id, w.line_index, w.quantity, sl.name AS location_name,
        sl.id AS location_id, cc.location_position,
        row_number() OVER (
          PARTITION BY w.line_index
          ORDER BY sl.name, sl.id, cc.location_position, cc.id
        ) AS rn
      FROM wanted w
      JOIN collection_cards cc ON cc.org_id = ${orgId} AND ${WANTED_LINE_NAME_MATCH}
      ${INVENTORY_CARD_JOINS}
      WHERE ${INVENTORY_CARD_FILTER}
    )
    SELECT id, line_index FROM matched
    WHERE rn <= quantity
    ORDER BY location_name, location_id, location_position, id
  `);
  const lineIndexByRowId = new Map<number, number>();
  for (const row of matched.rows as unknown as {
    id: number;
    line_index: number;
  }[]) {
    if (!lineIndexByRowId.has(Number(row.id))) {
      lineIndexByRowId.set(Number(row.id), row.line_index);
    }
  }
  const rowIds = [...lineIndexByRowId.keys()];
  const rows =
    rowIds.length === 0
      ? []
      : await selectLocatedCards(tx).where(inArray(collectionCards.id, rowIds));
  const order = new Map(rowIds.map((rowId, index) => [rowId, index]));
  rows.sort((a, b) => (order.get(a.rowId) ?? 0) - (order.get(b.rowId) ?? 0));
  const located = await toLocatedCards(rows, canViewCosts);
  const cards = located.map((card, index) => ({
    ...card,
    lineIndex: lineIndexByRowId.get(rows[index].rowId) ?? 0,
  }));
  return {
    lines: entries.map((entry, lineIndex) => ({
      name: entry.name,
      quantity: entry.quantity,
      found: cards.filter((card) => card.lineIndex === lineIndex).length,
    })),
    cards,
  };
}

export async function removeCardsFromLocations(
  tx: Transaction,
  orgId: string,
  scanIds: string[],
): Promise<number> {
  if (scanIds.length === 0) return 0;
  const updated = await tx
    .update(collectionCards)
    .set({ locationId: null, locationPosition: null })
    .where(
      and(
        eq(collectionCards.orgId, orgId),
        sql`${collectionCards.locationId} IS NOT NULL`,
        sql`${collectionCards.guid} = ANY(${uuidArraySql(scanIds)})`,
      ),
    )
    .returning({ id: collectionCards.id });
  return updated.length;
}

export async function loadStorageVerifyCards(
  tx: Transaction,
  locationId: number,
  canViewCosts: boolean,
): Promise<StorageLocationSearchResult[]> {
  return toLocatedCards(
    await selectLocatedCards(tx)
      .where(
        and(
          eq(collectionCards.locationId, locationId),
          eq(collections.isDeleted, false),
        ),
      )
      .orderBy(asc(collectionCards.locationPosition), asc(collectionCards.id))
      .limit(STORAGE_VERIFY_CARDS_MAX),
    canViewCosts,
  );
}
