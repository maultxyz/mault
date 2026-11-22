import {
  scanFoilType,
  UNMATCHED_RETRY_REQUEST_MAX_SCANS,
  type RetryUnmatchedCardsBatchResult,
} from "@magic-vault/shared";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { authQuery } from "../db";
import { collections, games, unmatchedCards } from "../db/schema";
import { UNMATCHED_RETRY_CONCURRENCY } from "./constants/unmatched-retry";
import { UUID_PATTERN } from "./constants/validation";
import type {
  PromotedUnmatchedScan,
  UnmatchedRetryBatchRequest,
  UnmatchedRetryMatch,
} from "./interfaces/unmatched-promotion";
import {
  announcePromotedUnmatchedScan,
  promoteUnmatchedScan,
} from "./unmatched-promotion";
import { rematchStoredScanWithText } from "./unmatched-rematch";

const collectionsBeingRetried = new Set<string>();

export function parseUnmatchedRetryScanIds(scanIds: unknown): string[] | null {
  if (!Array.isArray(scanIds)) return null;
  const uniqueScanIds = [...new Set(scanIds)];
  if (
    uniqueScanIds.length === 0 ||
    uniqueScanIds.length > UNMATCHED_RETRY_REQUEST_MAX_SCANS ||
    !uniqueScanIds.every((scanId) => typeof scanId === "string" && UUID_PATTERN.test(scanId))
  ) {
    return null;
  }
  return uniqueScanIds;
}

function loadRetryBatch({ jwtClaims, orgId, collectionGuid, scanIds }: UnmatchedRetryBatchRequest) {
  return authQuery(jwtClaims, (tx) =>
    tx
      .select({
        id: unmatchedCards.id,
        scanId: unmatchedCards.guid,
        embedding: unmatchedCards.embedding,
        gameKey: games.key,
        lang: collections.lang,
        matchAllLanguages: collections.matchAllLanguages,
        capturedImageKey: unmatchedCards.capturedImageKey,
        capturedImageDataUrl: sql<
          string | null
        >`CASE WHEN ${unmatchedCards.capturedImageKey} IS NULL THEN ${unmatchedCards.capturedImageDataUrl} END`,
      })
      .from(unmatchedCards)
      .innerJoin(collections, eq(collections.id, unmatchedCards.collectionId))
      .leftJoin(games, eq(games.id, collections.gameId))
      .where(
        and(
          eq(collections.guid, collectionGuid),
          eq(collections.orgId, orgId),
          eq(collections.isDeleted, false),
          eq(unmatchedCards.isDeleted, false),
          inArray(unmatchedCards.guid, scanIds),
        ),
      )
      .orderBy(asc(unmatchedCards.id)),
  );
}

async function rematchRows(
  rows: Awaited<ReturnType<typeof loadRetryBatch>>,
): Promise<UnmatchedRetryMatch[]> {
  const matches: UnmatchedRetryMatch[] = [];
  for (let i = 0; i < rows.length; i += UNMATCHED_RETRY_CONCURRENCY) {
    const batchMatches = await Promise.all(
      rows.slice(i, i + UNMATCHED_RETRY_CONCURRENCY).map(async (row) => {
        if (!row.scanId) return null;
        const card = await rematchStoredScanWithText({ ...row, scanId: row.scanId });
        return card ? { scanId: row.scanId, card } : null;
      }),
    );
    matches.push(...batchMatches.filter((match) => match != null));
  }
  return matches;
}

export function isRetryingUnmatchedCards(orgId: string, collectionGuid: string): boolean {
  return collectionsBeingRetried.has(`${orgId}:${collectionGuid}`);
}

export async function retryUnmatchedCardsBatch(
  request: UnmatchedRetryBatchRequest,
): Promise<RetryUnmatchedCardsBatchResult> {
  const retryKey = `${request.orgId}:${request.collectionGuid}`;
  collectionsBeingRetried.add(retryKey);
  try {
    const rows = await loadRetryBatch(request);
    const matches = await rematchRows(rows);

    const promoted: PromotedUnmatchedScan[] = [];
    let scanLimitReached = false;
    for (const match of matches) {
      const foilType = scanFoilType(match.card, null);
      const outcome = await authQuery(request.jwtClaims, (tx) =>
        promoteUnmatchedScan(tx, {
          orgId: request.orgId,
          collectionGuid: request.collectionGuid,
          scanId: match.scanId,
          card: match.card,
          isFoil: foilType != null,
          foilType,
          origin: "retriedAutomatically",
        }),
      );
      if (outcome.status === 402) {
        scanLimitReached = true;
        break;
      }
      if (outcome.status === 200) promoted.push(outcome.promoted);
    }
    await Promise.all(promoted.map(announcePromotedUnmatchedScan));

    return {
      checkedCount: request.scanIds.length,
      matchedCount: promoted.length,
      scanLimitReached,
    };
  } finally {
    collectionsBeingRetried.delete(retryKey);
  }
}
