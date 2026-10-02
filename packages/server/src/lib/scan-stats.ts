import {
  cardMatchPercent,
  type PlayingCardWithDistance,
  type PublicMetrics,
  type ScanVectorizeSource,
} from "@magic-vault/shared";
import { eq, isNotNull, sql } from "drizzle-orm";
import { db } from "../db";
import { scanStats } from "../db/schema";
import {
  SCAN_OUTCOME_MATCHED,
  SCAN_OUTCOME_UNMATCHED,
} from "./constants/scan-stats";

function toVectorizeSource(value: unknown): ScanVectorizeSource | null {
  return value === "server" || value === "web" ? value : null;
}

async function record(write: () => Promise<unknown>): Promise<void> {
  try {
    await write();
  } catch (err) {
    console.error("[scan-stats] Failed to record scan:", err);
  }
}

export function recordMatchedScan(
  scanId: string,
  card: PlayingCardWithDistance,
  hasAlternatives: boolean,
  scannedAt: number,
  vectorizedOn: unknown,
): Promise<void> {
  return record(() =>
    db
      .insert(scanStats)
      .values({
        scanId,
        outcome: SCAN_OUTCOME_MATCHED,
        matchPercent: cardMatchPercent(card),
        hasAlternatives,
        vectorizedOn: toVectorizeSource(vectorizedOn),
        scannedAt: new Date(scannedAt),
      })
      .onConflictDoNothing(),
  );
}

export function recordUnmatchedScan(
  scanId: string,
  scannedAt: number,
  vectorizedOn: unknown,
): Promise<void> {
  return record(() =>
    db
      .insert(scanStats)
      .values({
        scanId,
        outcome: SCAN_OUTCOME_UNMATCHED,
        vectorizedOn: toVectorizeSource(vectorizedOn),
        scannedAt: new Date(scannedAt),
      })
      .onConflictDoNothing(),
  );
}

export function markScanCorrected(scanId: string): Promise<void> {
  return record(() =>
    db
      .update(scanStats)
      .set({ isCorrected: true })
      .where(eq(scanStats.scanId, scanId)),
  );
}

export async function getScanVectorizeStats(): Promise<
  Record<ScanVectorizeSource, number>
> {
  const rows = await db
    .select({
      source: scanStats.vectorizedOn,
      count: sql<number>`count(*)::int`,
    })
    .from(scanStats)
    .where(isNotNull(scanStats.vectorizedOn))
    .groupBy(scanStats.vectorizedOn);
  const stats: Record<ScanVectorizeSource, number> = { server: 0, web: 0 };
  for (const row of rows) {
    const source = toVectorizeSource(row.source);
    if (source) stats[source] = row.count;
  }
  return stats;
}

export async function computeScanMetrics(): Promise<PublicMetrics> {
  const [row] = await db
    .select({
      matched: sql<number>`count(*) filter (where ${scanStats.outcome} = ${SCAN_OUTCOME_MATCHED})::int`,
      unidentified: sql<number>`count(*) filter (where ${scanStats.outcome} = ${SCAN_OUTCOME_UNMATCHED})::int`,
      corrected: sql<number>`count(*) filter (where ${scanStats.isCorrected})::int`,
      multipleMatches: sql<number>`count(*) filter (where ${scanStats.hasAlternatives})::int`,
      avgPercent: sql<number | null>`avg(${scanStats.matchPercent})`,
    })
    .from(scanStats);

  const { matched, unidentified, corrected, multipleMatches, avgPercent } = row;
  const totalScanned = matched + unidentified;
  return {
    totalScanned,
    matched,
    unidentified,
    corrected,
    multipleMatches,
    matchRate:
      totalScanned > 0
        ? Math.round((matched / totalScanned) * 1000) / 10
        : null,
    averageMatchPercent:
      avgPercent != null ? Math.round(Number(avgPercent) * 10) / 10 : null,
  };
}
