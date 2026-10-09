import {
  PRICE_SOURCE_FIELDS,
  type PublicApiCard,
  type PublicApiPage,
} from "@magic-vault/shared";
import { sql, type SQL } from "drizzle-orm";
import type { Transaction } from "../../db";
import {
  cardWithStoredPricesSql,
  scannedCardPriceSql,
} from "../card-price-sql";
import { CC_ALIAS_SQL_COLUMNS } from "../constants/card-prices";
import type {
  PublicApiCardCursor,
  PublicApiCardFilters,
  PublicApiCardRow,
} from "../interfaces/public-api";
import { loadOrgPriceSource } from "../price-source";
import {
  encodeCursor,
  isoTimestampSql,
  loadNextSince,
  PublicApiInputError,
  sinceSql,
} from "./pagination";

async function selectCards(
  tx: Transaction,
  orgId: string,
  conditions: SQL[],
  orderBy: SQL,
  limit: number,
): Promise<{ rows: PublicApiCardRow[]; currency: string }> {
  const priceSource = await loadOrgPriceSource(tx, orgId);
  const where = sql.join(
    [sql`cc.org_id = ${orgId}`, ...conditions],
    sql` AND `,
  );
  const result = await tx.execute(sql`
    SELECT cc.id, cc.guid::text AS scan_id, cc.card_id, cc.is_foil, cc.foil_type,
      (cc.needs_review OR (cc.alternative_matches IS NOT NULL AND cc.alternative_matches <> '[]'::jsonb)) AS needs_review,
      ${cardWithStoredPricesSql(sql`(cc.card - 'raw' - 'distance' - 'confidence')`, CC_ALIAS_SQL_COLUMNS)} AS card,
      ${scannedCardPriceSql(priceSource, CC_ALIAS_SQL_COLUMNS)} AS price,
      col.guid::text AS collection_guid, col.name AS collection_name, col.lang,
      g.key AS game,
      sl.guid::text AS location_guid, sl.name AS location_name,
      CASE WHEN sl.id IS NOT NULL THEN cc.location_position END AS location_position,
      ${isoTimestampSql(sql`cc.scanned_at`)} AS scanned_at,
      ${isoTimestampSql(sql`cc.created_at`)} AS created_at,
      ${isoTimestampSql(sql`cc.updated_at`)} AS updated_at,
      cc.updated_at::text AS cursor_ts
    FROM collection_cards cc
    JOIN collections col ON col.id = cc.collection_id AND col.is_deleted = false
    LEFT JOIN games g ON g.id = col.game_id
    LEFT JOIN storage_locations sl ON sl.id = cc.location_id AND sl.is_deleted = false
    WHERE ${where}
    ORDER BY ${orderBy}
    LIMIT ${limit}
  `);
  return {
    rows: result.rows as unknown as PublicApiCardRow[],
    currency: PRICE_SOURCE_FIELDS[priceSource].currency,
  };
}

function toPublicApiCard(
  row: PublicApiCardRow,
  currency: string,
): PublicApiCard {
  return {
    scanId: row.scan_id,
    collection: { guid: row.collection_guid, name: row.collection_name },
    game: row.game,
    lang: row.lang,
    cardId: row.card_id,
    name: row.card.name,
    set: row.card.set,
    setName: row.card.setName,
    collectorNumber: row.card.collectorNumber,
    rarity: row.card.rarity,
    isFoil: row.is_foil,
    foilType: row.foil_type,
    price: row.price == null ? null : Number(row.price),
    currency,
    needsReview: row.needs_review,
    location:
      row.location_guid && row.location_name
        ? {
            guid: row.location_guid,
            name: row.location_name,
            position: row.location_position ?? 0,
          }
        : null,
    scannedAt: row.scanned_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    card: row.card,
  };
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function filterConditions(filters: PublicApiCardFilters): SQL[] {
  const conditions: SQL[] = [];
  if (filters.since) {
    conditions.push(sql`cc.updated_at > ${sinceSql(filters.since)}`);
  }
  if (filters.collectionGuid) {
    conditions.push(sql`col.guid = ${filters.collectionGuid}::uuid`);
  }
  if (filters.locationGuid) {
    conditions.push(sql`sl.guid = ${filters.locationGuid}::uuid`);
  }
  if (filters.inStorage !== null) {
    conditions.push(
      filters.inStorage ? sql`sl.id IS NOT NULL` : sql`sl.id IS NULL`,
    );
  }
  if (filters.cardIds) {
    conditions.push(
      sql`cc.card_id IN (${sql.join(
        filters.cardIds.map((id) => sql`${id}`),
        sql`, `,
      )})`,
    );
  }
  if (filters.name) {
    conditions.push(
      sql`(cc.card ->> 'name') ILIKE ${`%${escapeLike(filters.name)}%`}`,
    );
  }
  if (filters.set) {
    conditions.push(sql`lower(cc.card ->> 'set') = lower(${filters.set})`);
  }
  if (filters.number) {
    conditions.push(
      sql`ltrim(lower(cc.card ->> 'collectorNumber'), '0') = ltrim(lower(${filters.number}), '0')`,
    );
  }
  if (filters.foil !== null) {
    conditions.push(sql`cc.is_foil = ${filters.foil}`);
  }
  return conditions;
}

export async function loadPublicApiCards(
  tx: Transaction,
  orgId: string,
  filters: PublicApiCardFilters,
): Promise<PublicApiPage<PublicApiCard>> {
  const byChange = filters.since !== null;
  const conditions = filterConditions(filters);
  if (filters.cursor) {
    if (byChange) {
      if (!filters.cursor.t) {
        throw new PublicApiInputError("cursor is invalid.");
      }
      conditions.push(
        sql`(cc.updated_at, cc.id) > (${filters.cursor.t}::timestamp, ${filters.cursor.i}::int)`,
      );
    } else {
      conditions.push(sql`cc.id > ${filters.cursor.i}::int`);
    }
  }
  const nextSince = await loadNextSince(tx);
  const { rows, currency } = await selectCards(
    tx,
    orgId,
    conditions,
    byChange ? sql`cc.updated_at, cc.id` : sql`cc.id`,
    filters.limit + 1,
  );
  const page = rows.slice(0, filters.limit);
  const last = page[page.length - 1];
  const nextCursor: PublicApiCardCursor | null =
    rows.length > filters.limit && last
      ? byChange
        ? { t: last.cursor_ts, i: last.id }
        : { i: last.id }
      : null;
  return {
    items: page.map((row) => toPublicApiCard(row, currency)),
    nextCursor: nextCursor ? encodeCursor(nextCursor) : null,
    nextSince,
  };
}

export async function loadPublicApiCard(
  tx: Transaction,
  orgId: string,
  scanId: string,
): Promise<PublicApiCard | null> {
  const { rows, currency } = await selectCards(
    tx,
    orgId,
    [sql`cc.guid = ${scanId}::uuid`],
    sql`cc.id`,
    1,
  );
  return rows[0] ? toPublicApiCard(rows[0], currency) : null;
}
