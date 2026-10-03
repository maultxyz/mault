import { and, asc, eq, gt, isNotNull, isNull } from "drizzle-orm";
import { db, pool } from "../src/db";
import { collectionCards, collections, unmatchedCards } from "../src/db/schema";
import {
  OBJECT_STORAGE_ENABLED,
  SCAN_IMAGE_BACKFILL_BATCH_SIZE,
} from "../src/lib/constants/object-storage";
import type { ScanImageKind } from "../src/lib/interfaces/scan-images";
import { storeScanImage } from "../src/lib/scan-images";

const log = (msg: string) => console.log(`[migrate-scan-images] ${msg}`);

async function migrateTable(
  kind: ScanImageKind,
  table: typeof collectionCards | typeof unmatchedCards,
): Promise<{ moved: number; failed: number }> {
  const cleared = await db
    .update(table)
    .set({ capturedImageDataUrl: null })
    .where(
      and(
        isNotNull(table.capturedImageKey),
        isNotNull(table.capturedImageDataUrl),
      ),
    )
    .returning({ id: table.id });
  log(`${kind}: cleared ${cleared.length} data URLs already in object storage`);

  let lastId = 0;
  let moved = 0;
  let failed = 0;
  for (;;) {
    const rows = await db
      .select({
        id: table.id,
        guid: table.guid,
        orgId: table.orgId,
        collectionGuid: collections.guid,
        dataUrl: table.capturedImageDataUrl,
      })
      .from(table)
      .innerJoin(collections, eq(collections.id, table.collectionId))
      .where(
        and(
          gt(table.id, lastId),
          isNotNull(table.capturedImageDataUrl),
          isNull(table.capturedImageKey),
        ),
      )
      .orderBy(asc(table.id))
      .limit(SCAN_IMAGE_BACKFILL_BATCH_SIZE);
    if (rows.length === 0) break;

    for (const row of rows) {
      lastId = row.id;
      if (!row.guid || !row.collectionGuid) {
        failed++;
        continue;
      }
      const stored = await storeScanImage(
        {
          orgId: row.orgId,
          collectionGuid: row.collectionGuid,
          scanId: row.guid,
          kind,
        },
        row.dataUrl,
      );
      if (!stored.key) {
        failed++;
        continue;
      }
      await db
        .update(table)
        .set({ capturedImageKey: stored.key, capturedImageDataUrl: null })
        .where(eq(table.id, row.id));
      moved++;
    }
    log(`${kind}: moved ${moved}, failed ${failed} so far`);
  }
  return { moved, failed };
}

async function run(): Promise<boolean> {
  if (!OBJECT_STORAGE_ENABLED) {
    log(
      "Object storage isn't configured (SCAN_IMAGE_BUCKET and AWS_* are required). Nothing to do.",
    );
    return false;
  }
  const dropped = await db
    .update(unmatchedCards)
    .set({ capturedImageDataUrl: null })
    .where(
      and(
        eq(unmatchedCards.isDeleted, true),
        isNotNull(unmatchedCards.capturedImageDataUrl),
      ),
    )
    .returning({ id: unmatchedCards.id });
  log(`Dropped ${dropped.length} images of deleted unmatched cards`);

  const cards = await migrateTable("cards", collectionCards);
  const unmatched = await migrateTable("unmatched", unmatchedCards);
  log(
    `Done. Cards: ${cards.moved} moved, ${cards.failed} failed. Unmatched: ${unmatched.moved} moved, ${unmatched.failed} failed.`,
  );
  return cards.failed === 0 && unmatched.failed === 0;
}

run()
  .then((ok) => {
    process.exitCode = ok ? 0 : 1;
  })
  .catch((err) => {
    console.error("[migrate-scan-images] Fatal:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
