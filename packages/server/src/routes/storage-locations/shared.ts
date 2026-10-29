import {
  STORAGE_LOCATION_NAME_MAX_LENGTH,
  toCardCondition,
  type PlayingCardWithDistance,
  type StorageLocation,
  type StorageLocationCard,
  type StorageLocationCardNeighbor,
} from "@magic-vault/shared";
import { and, asc, desc, eq, sql, type SQL } from "drizzle-orm";
import { uuidArraySql } from "../../lib/sql-arrays";
import type { Transaction } from "../../db";
import {
  collectionCards,
  collections,
  games,
  storageLocations,
} from "../../db/schema";
import type { StorageLocationRow } from "../../lib/interfaces/storage-locations";
import {
  cardWithStoredPricesSql,
  joinedScannedCardPriceSql,
} from "../../lib/card-price-sql";
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

export const storedCardOrderKey = sql`(COALESCE(${collectionCards.locationPosition}, 0), ${collectionCards.id})`;

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

export function selectStoredCards(tx: Transaction) {
  return tx
    .select({
      rowId: collectionCards.id,
      scanId: collectionCards.guid,
      position: storedCardPosition,
      card: sql<PlayingCardWithDistance>`${cardWithStoredPricesSql(sql`(${collectionCards.card} - 'raw')`)}`,
      isFoil: collectionCards.isFoil,
      foilType: collectionCards.foilType,
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
    })
    .from(collectionCards)
    .innerJoin(collections, eq(collections.id, collectionCards.collectionId))
    .leftJoin(games, eq(games.id, collections.gameId));
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

export async function countStoredCards(
  tx: Transaction,
  locationId: number,
  ...conditions: (SQL | undefined)[]
): Promise<number> {
  const [row] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(collectionCards)
    .innerJoin(collections, eq(collections.id, collectionCards.collectionId))
    .where(storedCardsWhere(locationId, ...conditions));
  return Number(row?.count ?? 0);
}

export async function findStoredCardNeighbor(
  tx: Transaction,
  locationId: number,
  direction: "previous" | "next",
  currentKey: SQL,
  ...conditions: (SQL | undefined)[]
): Promise<StorageLocationCardNeighbor | null> {
  const isPrevious = direction === "previous";
  const [row] = await tx
    .select({ scanId: collectionCards.guid, collectionGuid: collections.guid })
    .from(collectionCards)
    .innerJoin(collections, eq(collections.id, collectionCards.collectionId))
    .where(
      storedCardsWhere(
        locationId,
        isPrevious
          ? sql`${storedCardOrderKey} < ${currentKey}`
          : sql`${storedCardOrderKey} > ${currentKey}`,
        ...conditions,
      ),
    )
    .orderBy(
      ...(isPrevious
        ? [desc(storedCardPosition), desc(collectionCards.id)]
        : [asc(storedCardPosition), asc(collectionCards.id)]),
    )
    .limit(1);
  return row?.scanId && row.collectionGuid
    ? { scanId: row.scanId, collectionGuid: row.collectionGuid }
    : null;
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
