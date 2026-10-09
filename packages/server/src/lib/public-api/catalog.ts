import type {
  PublicApiCollection,
  PublicApiLocation,
} from "@magic-vault/shared";
import { sql } from "drizzle-orm";
import type { Transaction } from "../../db";
import type {
  PublicApiCollectionRow,
  PublicApiLocationRow,
} from "../interfaces/public-api";
import { isoTimestampSql } from "./pagination";

export async function loadPublicApiCollections(
  tx: Transaction,
  orgId: string,
): Promise<PublicApiCollection[]> {
  const result = await tx.execute(sql`
    SELECT col.guid::text AS guid, col.name, g.key AS game, col.lang,
      (SELECT count(*) FROM collection_cards cc WHERE cc.collection_id = col.id)::int AS card_count
    FROM collections col
    LEFT JOIN games g ON g.id = col.game_id
    WHERE col.org_id = ${orgId} AND col.is_deleted = false
    ORDER BY col.name
  `);
  return (result.rows as unknown as PublicApiCollectionRow[]).map((r) => ({
    guid: r.guid,
    name: r.name,
    game: r.game,
    lang: r.lang,
    cardCount: Number(r.card_count),
  }));
}

export async function loadPublicApiLocations(
  tx: Transaction,
  orgId: string,
): Promise<PublicApiLocation[]> {
  const result = await tx.execute(sql`
    SELECT sl.guid::text AS guid, sl.name,
      ${isoTimestampSql(sql`sl.created_at`)} AS created_at,
      (
        SELECT count(*) FROM collection_cards cc
        JOIN collections col ON col.id = cc.collection_id AND col.is_deleted = false
        WHERE cc.location_id = sl.id
      )::int AS card_count
    FROM storage_locations sl
    WHERE sl.org_id = ${orgId} AND sl.is_deleted = false
    ORDER BY sl.name
  `);
  return (result.rows as unknown as PublicApiLocationRow[]).map((r) => ({
    guid: r.guid,
    name: r.name,
    cardCount: Number(r.card_count),
    createdAt: r.created_at,
  }));
}
