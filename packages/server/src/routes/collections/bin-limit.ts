import { computeBinCapacity } from "@magic-vault/shared";
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
  deviceGuid: string | undefined,
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
  if (!bin) return null;

  const device = await tx.query.devices.findFirst({
    where: (t, { eq, and }) =>
      deviceGuid
        ? and(eq(t.orgId, orgId), eq(t.guid, deviceGuid))
        : eq(t.orgId, orgId),
    orderBy: (t, { asc }) => asc(t.id),
    columns: { id: true },
  });
  const heightRow = device
    ? await tx.query.binHeights.findFirst({
        where: (t, { eq, and }) =>
          and(eq(t.deviceId, device.id), eq(t.binNumber, binNumber)),
        columns: { height: true },
      })
    : null;
  const game = gameId
    ? await tx.query.games.findFirst({
        where: (t, { eq }) => eq(t.id, gameId),
        columns: { cardThickness: true },
      })
    : null;

  const effectiveCapacity = computeBinCapacity(
    heightRow?.height,
    game?.cardThickness,
    bin.cardLimit,
  );
  if (!effectiveCapacity) return null;

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

  if (value < effectiveCapacity) return null;
  return { binNumber, cardLimit: effectiveCapacity, count: value };
}
