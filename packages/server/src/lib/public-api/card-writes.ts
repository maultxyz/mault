import { sql, type SQL } from "drizzle-orm";
import type { Transaction } from "../../db";
import type {
  PublicApiCardWriteResult,
  PublicApiDeletedCard,
} from "../interfaces/public-api";
import { loadPublicApiCard } from "./cards";

function liveCardSql(orgId: string, scanId: string): SQL {
  return sql`cc.guid = ${scanId}::uuid AND cc.org_id = ${orgId}
    AND EXISTS (
      SELECT 1 FROM collections col
      WHERE col.id = cc.collection_id AND col.is_deleted = false
    )`;
}

async function updatedCard(
  tx: Transaction,
  orgId: string,
  rows: unknown[],
  scanId: string,
): Promise<PublicApiCardWriteResult> {
  if (rows.length === 0) return { status: "card_not_found" };
  const card = await loadPublicApiCard(tx, orgId, scanId);
  return card ? { status: "ok", card } : { status: "card_not_found" };
}

export async function removePublicApiCardFromLocation(
  tx: Transaction,
  orgId: string,
  scanId: string,
): Promise<PublicApiCardWriteResult> {
  const result = await tx.execute(sql`
    UPDATE collection_cards cc
    SET location_id = NULL, location_position = NULL
    WHERE ${liveCardSql(orgId, scanId)}
    RETURNING cc.id
  `);
  return updatedCard(tx, orgId, result.rows, scanId);
}

export async function movePublicApiCard(
  tx: Transaction,
  orgId: string,
  scanId: string,
  locationGuid: string,
): Promise<PublicApiCardWriteResult> {
  const location = await tx.execute(sql`
    SELECT id FROM storage_locations
    WHERE guid = ${locationGuid}::uuid AND org_id = ${orgId} AND is_deleted = false
  `);
  const locationId = (location.rows[0] as { id: number } | undefined)?.id;
  if (locationId === undefined) return { status: "location_not_found" };
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtext(${`storage_location:${locationId}`}))`,
  );
  const result = await tx.execute(sql`
    UPDATE collection_cards cc
    SET location_id = ${locationId},
        location_position = (
          SELECT coalesce(max(location_position), 0) + 1
          FROM collection_cards
          WHERE location_id = ${locationId}
        )
    WHERE ${liveCardSql(orgId, scanId)}
    RETURNING cc.id
  `);
  return updatedCard(tx, orgId, result.rows, scanId);
}

export async function deletePublicApiCard(
  tx: Transaction,
  orgId: string,
  scanId: string,
): Promise<PublicApiDeletedCard | null> {
  const result = await tx.execute(sql`
    DELETE FROM collection_cards cc
    USING collections col
    WHERE col.id = cc.collection_id AND col.is_deleted = false
      AND cc.guid = ${scanId}::uuid AND cc.org_id = ${orgId}
    RETURNING cc.captured_image_key AS image_key, col.guid::text AS collection_guid
  `);
  const row = result.rows[0] as
    | { image_key: string | null; collection_guid: string }
    | undefined;
  return row
    ? { imageKey: row.image_key, collectionGuid: row.collection_guid }
    : null;
}
