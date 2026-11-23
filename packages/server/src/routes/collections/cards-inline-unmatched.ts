import {
  DEFAULT_CARD_SORT,
  UNMATCHED_INLINE_PAGE_MAX,
  type CollectionCardsQuery,
  type InlineUnmatchedCards,
} from "@magic-vault/shared";
import { sql } from "drizzle-orm";
import type { Transaction } from "../../db";
import type {
  CardsCollection,
  InlineUnmatchedCardRow,
  InlineUnmatchedCardsWindow,
} from "../../lib/interfaces/collections";
import {
  resolveBackScanImageUrl,
  resolveScanImageUrl,
} from "../../lib/scan-images";
import { cardFilterSql, isUnfilteredCardsQuery } from "./cards-query";
import { toUnmatchedCard } from "./shared";

export function showsInlineUnmatchedCards(query: CollectionCardsQuery): boolean {
  return (
    !query.grouped &&
    (!query.sort || query.sort === DEFAULT_CARD_SORT) &&
    isUnfilteredCardsQuery({
      ...query,
      filters: { ...query.filters, hideDownloaded: false },
    })
  );
}

const NO_INLINE_UNMATCHED_CARDS: InlineUnmatchedCards = { items: [], totalInPage: 0 };

export async function loadInlineUnmatchedCards(
  tx: Transaction,
  collection: CardsCollection,
  query: CollectionCardsQuery,
  {
    firstScanId,
    lastScanId,
    isFirstPage,
    isLastPage,
  }: InlineUnmatchedCardsWindow,
): Promise<InlineUnmatchedCards> {
  if (!isFirstPage && !firstScanId) return NO_INLINE_UNMATCHED_CARDS;
  const hasNewerBound = !isFirstPage && !!firstScanId;
  const hasOlderBound = !isLastPage && !!lastScanId;
  const newerBound = hasNewerBound
    ? sql`(
        SELECT min(cc.scanned_at)
        FROM collection_cards cc,
          (SELECT scanned_at, id FROM collection_cards
            WHERE collection_id = ${collection.id} AND guid = ${firstScanId}::uuid) first_card
        WHERE cc.collection_id = ${collection.id}
          AND ${cardFilterSql(query, undefined, collection.pricing)}
          AND (cc.scanned_at, cc.id) > (first_card.scanned_at, first_card.id)
      )`
    : sql`NULL::timestamp`;
  const olderBound = hasOlderBound
    ? sql`(
        SELECT scanned_at FROM collection_cards
        WHERE collection_id = ${collection.id} AND guid = ${lastScanId}::uuid
      )`
    : sql`NULL::timestamp`;
  const result = await tx.execute(sql`
    WITH bounds AS (
      SELECT ${newerBound} AS newer_bound, ${olderBound} AS older_bound
    ),
    live AS (
      SELECT u.*
      FROM unmatched_cards u
      WHERE u.collection_id = ${collection.id} AND NOT u.is_deleted
    ),
    in_window AS (
      SELECT live.*
      FROM live, bounds
      WHERE (bounds.newer_bound IS NULL OR live.scanned_at <= bounds.newer_bound)
        AND (bounds.older_bound IS NULL OR live.scanned_at > bounds.older_bound)
    ),
    counts AS (
      SELECT
        (SELECT count(*) FROM in_window)::int AS total_in_page,
        (SELECT count(*) FROM live, bounds
          WHERE bounds.newer_bound IS NOT NULL
            AND live.scanned_at > bounds.newer_bound)::int AS newer_count
    )
    SELECT
      in_window.guid::text AS guid,
      in_window.captured_image_key AS "capturedImageKey",
      in_window.captured_image_data_url AS "capturedImageDataUrl",
      in_window.captured_back_image_key AS "capturedBackImageKey",
      in_window.captured_back_image_data_url AS "capturedBackImageDataUrl",
      (extract(epoch from in_window.scanned_at) * 1000)::float8 AS scanned_at_ms,
      in_window.bin_number AS "binNumber",
      in_window.diagnostics,
      counts.total_in_page,
      (counts.newer_count
        + row_number() OVER (ORDER BY in_window.scanned_at DESC, in_window.id DESC)
        - 1)::int AS position
    FROM in_window, counts
    ORDER BY in_window.scanned_at DESC, in_window.id DESC
    LIMIT ${UNMATCHED_INLINE_PAGE_MAX}::int
  `);
  const rows = result.rows as unknown as InlineUnmatchedCardRow[];
  if (rows.length === 0) return NO_INLINE_UNMATCHED_CARDS;
  return {
    totalInPage: rows[0].total_in_page,
    items: await Promise.all(
      rows.map(async (row) => ({
        ...toUnmatchedCard({
          guid: row.guid,
          capturedImageUrl: await resolveScanImageUrl(row),
          capturedBackImageUrl: await resolveBackScanImageUrl(row),
          scannedAt: new Date(row.scanned_at_ms),
          binNumber: row.binNumber,
          diagnostics: row.diagnostics,
        }),
        position: row.position,
      })),
    ),
  };
}
