import { sql } from "drizzle-orm";
import type { Transaction } from "../db";
import {
  collectionCards,
  collections,
  devices,
  games,
  intakeLots,
  orgDailyScanUsage,
} from "../db/schema";
import { UUID_PATTERN } from "./constants/validation";
import type {
  ScanSaveContext,
  ScanSaveContextInput,
  ScanSaveContextRow,
} from "./interfaces/scan-save-context";
import { todayUtc } from "./scan-usage";

export function toScanSaveContext(row: ScanSaveContextRow): ScanSaveContext {
  return {
    collection: {
      id: Number(row.collection_id),
      gameId: row.game_id == null ? null : Number(row.game_id),
      name: row.collection_name,
      lang: row.collection_lang,
      gameKey: row.game_key,
      gameName: row.game_name,
    },
    scansToday: Number(row.scans_today ?? 0),
    isAlreadySaved: row.is_already_saved === true,
    scannedByDeviceId:
      row.scanned_by_device_id == null ? null : Number(row.scanned_by_device_id),
    openIntakeLotId:
      row.open_intake_lot_id == null ? null : Number(row.open_intake_lot_id),
  };
}

export async function loadScanSaveContext(
  tx: Transaction,
  { orgId, collectionGuid, scanId, deviceGuid }: ScanSaveContextInput,
): Promise<ScanSaveContext | null> {
  const scannedByDeviceId =
    deviceGuid && UUID_PATTERN.test(deviceGuid)
      ? sql`(
          SELECT d.id FROM ${devices} d
          WHERE d.guid = ${deviceGuid}::uuid AND d.org_id = ${orgId}
          LIMIT 1
        )`
      : sql`NULL::int`;
  const result = await tx.execute(sql`
    SELECT
      col.id AS collection_id,
      col.game_id,
      col.name AS collection_name,
      col.lang AS collection_lang,
      g.key AS game_key,
      g.name AS game_name,
      COALESCE((
        SELECT u.scan_count FROM ${orgDailyScanUsage} u
        WHERE u.org_id = ${orgId} AND u.day = ${todayUtc()}::date
      ), 0)::int AS scans_today,
      EXISTS (
        SELECT 1 FROM ${collectionCards} saved WHERE saved.guid = ${scanId}::uuid
      ) AS is_already_saved,
      ${scannedByDeviceId} AS scanned_by_device_id,
      (
        SELECT il.id FROM ${intakeLots} il
        WHERE il.collection_id = col.id
          AND il.status = 'open'
          AND il.is_deleted = false
        LIMIT 1
      ) AS open_intake_lot_id
    FROM ${collections} col
    LEFT JOIN ${games} g ON g.id = col.game_id
    WHERE col.guid = ${collectionGuid}::uuid
      AND col.org_id = ${orgId}
      AND col.is_deleted = false
    LIMIT 1
  `);
  const row = result.rows[0] as unknown as ScanSaveContextRow | undefined;
  return row ? toScanSaveContext(row) : null;
}
