import type { ApiScannedCard } from "@magic-vault/shared";
import { sql, type SQL } from "drizzle-orm";
import type { Transaction } from "../../db";
import { cardPriceValueSql } from "../card-price-sql";
import { CC_ALIAS_SQL_COLUMNS } from "../constants/card-prices";
import type {
  PublicApiCardCursor,
  PublicApiCardFilters,
  PublicApiCardRow,
  PublicApiChangePage,
  PublicApiCursorPage,
  PublicApiLocationCardFilters,
  PublicApiLocationCursor,
} from "../interfaces/public-api";
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
): Promise<PublicApiCardRow[]> {
  const where = sql.join(
    [sql`cc.org_id = ${orgId}`, ...conditions],
    sql` AND `,
  );
  const result = await tx.execute(sql`
    SELECT cc.id, cc.guid::text AS scan_id, cc.card_id, cc.is_foil, cc.foil_type,
      (cc.needs_review OR (cc.alternative_matches IS NOT NULL AND cc.alternative_matches <> '[]'::jsonb)) AS needs_review,
      cc.card ->> 'name' AS name, cc.card ->> 'set' AS set_code,
      cc.card ->> 'setName' AS set_name,
      cc.card ->> 'collectorNumber' AS collector_number,
      cc.card ->> 'rarity' AS rarity,
      ${cardPriceValueSql("price", CC_ALIAS_SQL_COLUMNS)} AS price_usd,
      ${cardPriceValueSql("priceFoil", CC_ALIAS_SQL_COLUMNS)} AS price_usd_foil,
      ${cardPriceValueSql("priceEur", CC_ALIAS_SQL_COLUMNS)} AS price_eur,
      ${cardPriceValueSql("priceEurFoil", CC_ALIAS_SQL_COLUMNS)} AS price_eur_foil,
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
  return result.rows as unknown as PublicApiCardRow[];
}

function formatPrice(value: number | string | null): string | null {
  if (value === null) return null;
  const price = Number(value);
  return Number.isFinite(price) ? price.toFixed(2) : null;
}

export function toApiScannedCard(row: PublicApiCardRow): ApiScannedCard {
  return {
    object: "scanned_card",
    id: row.scan_id,
    card_id: row.card_id,
    name: row.name,
    set: row.set_code,
    set_name: row.set_name,
    collector_number: row.collector_number,
    rarity: row.rarity,
    lang: row.lang,
    game: row.game,
    finish: row.is_foil ? "foil" : "nonfoil",
    foil_type: row.is_foil ? row.foil_type : null,
    prices: {
      usd: formatPrice(row.price_usd),
      usd_foil: formatPrice(row.price_usd_foil),
      eur: formatPrice(row.price_eur),
      eur_foil: formatPrice(row.price_eur_foil),
    },
    location:
      row.location_guid && row.location_name
        ? {
            object: "location",
            id: row.location_guid,
            name: row.location_name,
            position: row.location_position ?? 0,
          }
        : null,
    collection: {
      object: "collection",
      id: row.collection_guid,
      name: row.collection_name,
    },
    needs_review: row.needs_review,
    scanned_at: row.scanned_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
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
  if (filters.collectorNumber) {
    conditions.push(
      sql`ltrim(lower(cc.card ->> 'collectorNumber'), '0') = ltrim(lower(${filters.collectorNumber}), '0')`,
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
): Promise<PublicApiChangePage<ApiScannedCard>> {
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
  const rows = await selectCards(
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
    items: page.map(toApiScannedCard),
    nextCursor: nextCursor ? encodeCursor(nextCursor) : null,
    nextSince,
  };
}

export async function loadPublicApiCard(
  tx: Transaction,
  orgId: string,
  scanId: string,
): Promise<ApiScannedCard | null> {
  const [row] = await selectCards(
    tx,
    orgId,
    [sql`cc.guid = ${scanId}::uuid`],
    sql`cc.id`,
    1,
  );
  return row ? toApiScannedCard(row) : null;
}

export async function loadPublicApiLocationCards(
  tx: Transaction,
  orgId: string,
  locationGuid: string,
  filters: PublicApiLocationCardFilters,
): Promise<PublicApiCursorPage<ApiScannedCard> | null> {
  const location = await tx.execute(sql`
    SELECT id FROM storage_locations
    WHERE guid = ${locationGuid}::uuid AND org_id = ${orgId} AND is_deleted = false
  `);
  const locationId = (location.rows[0] as { id: number } | undefined)?.id;
  if (locationId === undefined) return null;
  const position = sql`COALESCE(cc.location_position, 0)`;
  const conditions: SQL[] = [sql`cc.location_id = ${locationId}`];
  if (filters.cursor) {
    conditions.push(
      sql`(${position}, cc.id) > (${filters.cursor.p}::int, ${filters.cursor.i}::int)`,
    );
  }
  const rows = await selectCards(
    tx,
    orgId,
    conditions,
    sql`${position}, cc.id`,
    filters.limit + 1,
  );
  const page = rows.slice(0, filters.limit);
  const last = page[page.length - 1];
  const nextCursor: PublicApiLocationCursor | null =
    rows.length > filters.limit && last
      ? { p: last.location_position ?? 0, i: last.id }
      : null;
  return {
    items: page.map(toApiScannedCard),
    nextCursor: nextCursor ? encodeCursor(nextCursor) : null,
  };
}

export async function loadPublicApiCardsByScanIds(
  tx: Transaction,
  orgId: string,
  scanIds: string[],
): Promise<ApiScannedCard[]> {
  if (scanIds.length === 0) return [];
  const rows = await selectCards(
    tx,
    orgId,
    [
      sql`cc.guid IN (${sql.join(
        scanIds.map((id) => sql`${id}::uuid`),
        sql`, `,
      )})`,
    ],
    sql`COALESCE(cc.location_position, 0), cc.id`,
    scanIds.length,
  );
  return rows.map(toApiScannedCard);
}
