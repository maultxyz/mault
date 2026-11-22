import { pickedCardLanguage } from "@magic-vault/shared";
import { and, eq } from "drizzle-orm";
import type { Transaction } from "../db";
import {
  collectionCards,
  collections,
  games,
  unmatchedCards,
} from "../db/schema";
import { toScannedCard } from "../routes/collections/shared";
import { notifyCardScanned } from "../routes/collections/notify-card-scanned";
import { loadOrgPlan } from "../routes/collections/scan-limit";
import { findOpenIntakeLotId } from "./intake";
import type {
  UnmatchedPromotionOutcome,
  UnmatchedPromotionRequest,
  PromotedUnmatchedScan,
} from "./interfaces/unmatched-promotion";
import { toSavedCardSnapshots } from "./saved-cards";
import { resolveScanImageUrl } from "./scan-images";
import { markScanCorrected } from "./scan-stats";
import {
  consumeDailyScan,
  dailyScanLimitForPlan,
  dailyScanLimitMessage,
} from "./scan-usage";
import { emitCollectionCardsChanged, emitToSession } from "./session-stream";
import { emitCardScannedWebhook } from "./webhooks/events";

export async function promoteUnmatchedScan(
  tx: Transaction,
  { orgId, collectionGuid, scanId, card: identified, isFoil, foilType, origin }: UnmatchedPromotionRequest,
): Promise<UnmatchedPromotionOutcome> {
  const isIdentifiedByHand = origin === "identifiedByHand";
  const [collection] = await tx
    .select({
      id: collections.id,
      gameId: collections.gameId,
      name: collections.name,
      lang: collections.lang,
      gameKey: games.key,
      gameName: games.name,
    })
    .from(collections)
    .leftJoin(games, eq(games.id, collections.gameId))
    .where(
      and(
        eq(collections.guid, collectionGuid),
        eq(collections.orgId, orgId),
        eq(collections.isDeleted, false),
      ),
    )
    .limit(1);
  if (!collection) {
    return { status: 404, message: "Collection not found." };
  }

  const [unmatched] = await tx
    .select()
    .from(unmatchedCards)
    .where(
      and(
        eq(unmatchedCards.guid, scanId),
        eq(unmatchedCards.orgId, orgId),
        eq(unmatchedCards.collectionId, collection.id),
        eq(unmatchedCards.isDeleted, false),
      ),
    )
    .limit(1);
  if (!unmatched) {
    return { status: 404, message: "Unmatched scan not found." };
  }

  const plan = await loadOrgPlan(tx, orgId);
  if (!(await consumeDailyScan(orgId, plan))) {
    return {
      status: 402,
      message: dailyScanLimitMessage(dailyScanLimitForPlan(plan)),
      scanLimitReached: true,
    };
  }

  const savedIsFoil = isFoil ?? foilType != null;
  const saved = await toSavedCardSnapshots(
    { gameKey: collection.gameKey, lang: collection.lang },
    identified,
    null,
  );
  await tx.insert(collectionCards).values({
    guid: scanId,
    collectionId: collection.id,
    cardId: identified.id,
    card: saved.card,
    scannedAt: unmatched.scannedAt,
    binNumber: unmatched.binNumber,
    binEmptiedAt: unmatched.binEmptiedAt,
    capturedImageDataUrl: unmatched.capturedImageDataUrl,
    capturedImageKey: unmatched.capturedImageKey,
    capturedBackImageDataUrl: unmatched.capturedBackImageDataUrl,
    capturedBackImageKey: unmatched.capturedBackImageKey,
    isFoil: savedIsFoil,
    foilType: foilType ?? null,
    language: pickedCardLanguage(identified),
    isCorrected: isIdentifiedByHand,
    isReviewed: isIdentifiedByHand,
    lowConfidenceMatch: !isIdentifiedByHand,
    scannedByUserId: unmatched.scannedByUserId,
    scannedByDeviceId: unmatched.scannedByDeviceId,
    intakeLotId: await findOpenIntakeLotId(tx, collection.id),
    orgId,
  });

  await tx
    .update(unmatchedCards)
    .set({
      isDeleted: true,
      capturedImageKey: null,
      capturedImageDataUrl: null,
      capturedBackImageKey: null,
      capturedBackImageDataUrl: null,
    })
    .where(eq(unmatchedCards.id, unmatched.id));

  await tx
    .update(collections)
    .set({ updatedAt: new Date() })
    .where(eq(collections.id, collection.id));

  return {
    status: 200,
    promoted: {
      orgId,
      collectionGuid,
      scanId,
      origin,
      identified,
      card: toScannedCard({
        guid: scanId,
        card: identified,
        scannedAt: unmatched.scannedAt,
        binNumber: unmatched.binNumber,
        isFoil: savedIsFoil,
        foilType: foilType ?? null,
        language: pickedCardLanguage(identified),
        isCorrected: isIdentifiedByHand,
        isReviewed: isIdentifiedByHand,
      }),
      collection,
      image: {
        capturedImageKey: unmatched.capturedImageKey,
        capturedImageDataUrl: unmatched.capturedImageDataUrl,
      },
    },
  };
}

export async function announcePromotedUnmatchedScan(
  promoted: PromotedUnmatchedScan,
): Promise<void> {
  const { orgId, collectionGuid, scanId, card } = promoted;
  emitToSession(orgId, collectionGuid, "unmatched_removed", { scanId });
  emitToSession(orgId, collectionGuid, "card_added", card);
  emitCollectionCardsChanged(orgId, collectionGuid);
  emitCardScannedWebhook(orgId, scanId);
  if (promoted.origin !== "identifiedByHand") return;
  void markScanCorrected(scanId);
  notifyCardScanned({
    orgId,
    collectionGuid,
    isNewSession: false,
    card: promoted.identified,
    isFoil: card.isFoil,
    foilType: card.foilType,
    collectionName: promoted.collection.name,
    gameName: promoted.collection.gameName ?? undefined,
    gameId: promoted.collection.gameId,
    capturedImageUrl: await resolveScanImageUrl(promoted.image),
  });
}

