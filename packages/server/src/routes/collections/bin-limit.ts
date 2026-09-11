import { and, eq, gt, sql } from "drizzle-orm";
import type { Transaction } from "../../db";
import { collectionCards } from "../../db/schema";

export interface BinLimitStatus {
  binNumber: number;
  cardLimit: number;
  count: number;
}

export async function findFullBin(
  tx: Transaction,
  orgId: string,
  gameId: number | null,
  collectionId: number,
  binNumber: number,
): Promise<BinLimitStatus | null> {
  const activeBinSet = await tx.query.binSets.findFirst({
    where: (t, { eq, and, isNull }) =>
      gameId === null
        ? and(eq(t.isActive, true), isNull(t.gameId), eq(t.orgId, orgId))
        : and(eq(t.isActive, true), eq(t.gameId, gameId), eq(t.orgId, orgId)),
    columns: { id: true },
  });
  if (!activeBinSet) return null;

  const bin = await tx.query.bins.findFirst({
    where: (t, { eq, and }) =>
      and(eq(t.binSet, activeBinSet.id), eq(t.binNumber, binNumber)),
    columns: { cardLimit: true, lastEmptiedAt: true },
  });
  if (!bin?.cardLimit) return null;

  const [{ value }] = await tx
    .select({ value: sql<number>`count(*)::int` })
    .from(collectionCards)
    .where(
      and(
        eq(collectionCards.collectionId, collectionId),
        eq(collectionCards.binNumber, binNumber),
        bin.lastEmptiedAt
          ? gt(collectionCards.scannedAt, bin.lastEmptiedAt)
          : undefined,
      ),
    );

  if (value < bin.cardLimit) return null;
  return { binNumber, cardLimit: bin.cardLimit, count: value };
}
