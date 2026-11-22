import {
  UNMATCHED_BULK_REMOVE_CONCURRENCY,
  UNMATCHED_RETRY_REQUEST_MAX_SCANS,
} from "./constants/collection-cards.constant";
import type {
  UnmatchedBulkRemoveOptions,
  UnmatchedBulkRemoveSummary,
  UnmatchedRetryRunOptions,
  UnmatchedRetrySummary,
} from "./interfaces/collection-cards.interface";

function chunksOf<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    chunks.push(items.slice(start, start + size));
  }
  return chunks;
}

export async function runUnmatchedRetry({
  scanIds,
  retryBatch,
  onProgress,
  shouldStop,
}: UnmatchedRetryRunOptions): Promise<UnmatchedRetrySummary> {
  const uniqueScanIds = [...new Set(scanIds)];
  const totalCount = uniqueScanIds.length;
  let checkedCount = 0;
  let matchedCount = 0;
  for (const batchScanIds of chunksOf(uniqueScanIds, UNMATCHED_RETRY_REQUEST_MAX_SCANS)) {
    if (shouldStop?.()) {
      return { checkedCount, matchedCount, totalCount, scanLimitReached: false, wasStopped: true };
    }
    const batch = await retryBatch(batchScanIds);
    checkedCount += batch.checkedCount;
    matchedCount += batch.matchedCount;
    onProgress?.({ checkedCount, matchedCount, totalCount });
    if (batch.scanLimitReached) {
      return { checkedCount, matchedCount, totalCount, scanLimitReached: true, wasStopped: false };
    }
  }
  return { checkedCount, matchedCount, totalCount, scanLimitReached: false, wasStopped: false };
}

export async function removeUnmatchedScans({
  scanIds,
  removeScan,
}: UnmatchedBulkRemoveOptions): Promise<UnmatchedBulkRemoveSummary> {
  let removedCount = 0;
  let failedCount = 0;
  for (const batchScanIds of chunksOf([...new Set(scanIds)], UNMATCHED_BULK_REMOVE_CONCURRENCY)) {
    const results = await Promise.all(
      batchScanIds.map((scanId) => removeScan(scanId).catch(() => false)),
    );
    for (const wasRemoved of results) {
      if (wasRemoved) removedCount += 1;
      else failedCount += 1;
    }
  }
  return { removedCount, failedCount };
}
