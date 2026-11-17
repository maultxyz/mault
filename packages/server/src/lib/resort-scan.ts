import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { Transaction } from "../db";
import { collectionCards } from "../db/schema";
import { activeBinSetWhere } from "../routes/bins/shared";
import { lateSaveBinEmptiedAtSql } from "./bin-emptying";
import { activeWorkflowStepResorts } from "./preset-workflows";
import type {
  CardToResort,
  FindCardToResortInput,
  MoveResortedCardInput,
} from "./interfaces/resort-scan";

export async function findCardToResort(
  tx: Transaction,
  { orgId, collectionId, gameId, cardId, scanIsFoil }: FindCardToResortInput,
): Promise<CardToResort | null> {
  const activeSet = await tx.query.binSets.findFirst({
    where: (t) => activeBinSetWhere(t, orgId, gameId),
    columns: { guid: true, isResortMode: true, skipSaving: true },
  });
  if (!activeSet || activeSet.skipSaving) return null;
  const resorts =
    activeSet.isResortMode ||
    (await activeWorkflowStepResorts(tx, orgId, gameId, activeSet.guid!));
  if (!resorts) return null;
  const [candidate] = await tx
    .select({
      id: collectionCards.id,
      isFoil: collectionCards.isFoil,
      foilType: collectionCards.foilType,
      condition: collectionCards.condition,
      hasCapturedImage: sql<boolean>`(${collectionCards.capturedImageKey} IS NOT NULL OR ${collectionCards.capturedImageDataUrl} IS NOT NULL)`,
    })
    .from(collectionCards)
    .where(
      and(
        eq(collectionCards.collectionId, collectionId),
        eq(collectionCards.cardId, cardId),
      ),
    )
    .orderBy(
      ...(scanIsFoil ? [desc(collectionCards.isFoil)] : []),
      asc(collectionCards.scannedAt),
      asc(collectionCards.id),
    )
    .limit(1)
    .for("update", { skipLocked: true });
  return candidate ?? null;
}

export async function moveResortedCard(
  tx: Transaction,
  {
    rowId,
    orgId,
    scanId,
    scannedAt,
    binNumber,
    scannedByUserId,
    scannedByDeviceId,
    capturedImage,
  }: MoveResortedCardInput,
): Promise<void> {
  await tx
    .update(collectionCards)
    .set({
      guid: scanId,
      scannedAt: new Date(scannedAt),
      binNumber: binNumber ?? null,
      binEmptiedAt: lateSaveBinEmptiedAtSql(orgId, binNumber, scannedAt),
      locationId: null,
      locationPosition: null,
      scannedByUserId,
      scannedByDeviceId,
      ...(capturedImage
        ? {
            capturedImageDataUrl: capturedImage.dataUrl,
            capturedImageKey: capturedImage.key,
          }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(collectionCards.id, rowId));
}
