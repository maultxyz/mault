import {
  decideReviewAutoCheck,
  type CardsReviewedEvent,
  type PlayingCard,
  type ReviewAutoCheckDecision,
  type ReviewAutoCheckOutcome,
} from "@magic-vault/shared";
import { and, eq, inArray, sql } from "drizzle-orm";
import { authQuery, type Transaction } from "../db";
import { collectionCards, collections, games } from "../db/schema";
import {
  attachMatchedCards,
  findCardMatches,
} from "../routes/card/shared";
import { toPortraitCardImage } from "./card-image";
import { REVIEW_AUTO_CHECK_CONCURRENCY } from "./constants/review-auto-check";
import type {
  CheckedReviewAutoCheckRow,
  ReviewAutoCheckRequestContext,
  ReviewAutoCheckRow,
} from "./interfaces/review-auto-check";
import { printedLanguageCodeFromImageBuffer } from "./printing-marks/scan";
import { toSavedCardSnapshots } from "./saved-cards";
import { loadScanImage } from "./scan-images";
import { emitCollectionCardsChanged, emitToSession } from "./session-stream";
import { readStoredScanText } from "./unmatched-rematch";
import { vectorizeCardImage } from "./vectorize";

const collectionsBeingAutoChecked = new Set<string>();

const UNSURE_DECISION: ReviewAutoCheckDecision = {
  verdict: "unsure",
  suggestion: null,
};

function autoCheckKey(orgId: string, collectionGuid: string): string {
  return `${orgId}:${collectionGuid}`;
}

export function isAutoCheckingReviewCards(
  orgId: string,
  collectionGuid: string,
): boolean {
  return collectionsBeingAutoChecked.has(autoCheckKey(orgId, collectionGuid));
}

async function loadUnreviewedRows(
  tx: Transaction,
  { orgId, collectionGuid, scanIds }: ReviewAutoCheckRequestContext,
): Promise<ReviewAutoCheckRow[]> {
  const rows = await tx
    .select({
      scanId: collectionCards.guid,
      cardId: collectionCards.cardId,
      cardLang: collectionCards.cardLang,
      card: collectionCards.card,
      alternativeMatches: collectionCards.alternativeMatches,
      gameKey: games.key,
      lang: collections.lang,
      matchAllLanguages: collections.matchAllLanguages,
      capturedImageKey: collectionCards.capturedImageKey,
      capturedImageDataUrl: sql<
        string | null
      >`CASE WHEN ${collectionCards.capturedImageKey} IS NULL THEN ${collectionCards.capturedImageDataUrl} END`,
    })
    .from(collectionCards)
    .innerJoin(collections, eq(collections.id, collectionCards.collectionId))
    .leftJoin(games, eq(games.id, collections.gameId))
    .where(
      and(
        eq(collections.guid, collectionGuid),
        eq(collections.orgId, orgId),
        eq(collections.isDeleted, false),
        eq(collectionCards.orgId, orgId),
        eq(collectionCards.isReviewed, false),
        inArray(collectionCards.guid, scanIds),
      ),
    );
  return rows.flatMap((row) =>
    row.scanId
      ? [
          {
            ...row,
            scanId: row.scanId,
            card: row.card as PlayingCard,
            alternativeMatches: Array.isArray(row.alternativeMatches)
              ? (row.alternativeMatches as PlayingCard[])
              : null,
          },
        ]
      : [],
  );
}

async function reidentifyStoredScan(
  row: ReviewAutoCheckRow,
): Promise<ReviewAutoCheckDecision> {
  if (!row.gameKey) return UNSURE_DECISION;
  const photo = await loadScanImage(row);
  if (!photo) return UNSURE_DECISION;
  const portrait = await toPortraitCardImage(photo);
  const [{ embedding }, printedLanguageCode] = await Promise.all([
    vectorizeCardImage(portrait),
    printedLanguageCodeFromImageBuffer(row.gameKey, portrait),
  ]);
  const scope = {
    gameKey: row.gameKey,
    lang: row.lang,
    matchAllLanguages: row.matchAllLanguages,
  };
  const [imageResult, textResult] = await Promise.all([
    findCardMatches({
      ...scope,
      embeddings: { embedding },
      printedLanguageCode,
    }).then((result) => attachMatchedCards(result, row.gameKey!, row.lang)),
    readStoredScanText({ ...row, embedding }),
  ]);
  return decideReviewAutoCheck(
    { cardId: row.cardId, lang: row.cardLang },
    imageResult,
    textResult,
  );
}

async function reidentifyRows(
  rows: ReviewAutoCheckRow[],
): Promise<CheckedReviewAutoCheckRow[]> {
  const checked: CheckedReviewAutoCheckRow[] = [];
  for (let i = 0; i < rows.length; i += REVIEW_AUTO_CHECK_CONCURRENCY) {
    checked.push(
      ...(await Promise.all(
        rows
          .slice(i, i + REVIEW_AUTO_CHECK_CONCURRENCY)
          .map(async (row) => ({ row, decision: await reidentifyStoredScan(row) })),
      )),
    );
  }
  return checked;
}

async function withSuggestionFirst(
  row: ReviewAutoCheckRow,
  suggestion: PlayingCard,
): Promise<PlayingCard[] | null> {
  const alternatives = [
    suggestion,
    ...(row.alternativeMatches ?? []).filter(
      (alternative) => alternative.id !== suggestion.id,
    ),
  ];
  const snapshots = await toSavedCardSnapshots(
    { gameKey: row.gameKey, lang: row.lang },
    row.card,
    alternatives,
  );
  return snapshots.alternativeMatches;
}

async function saveDecisions(
  tx: Transaction,
  orgId: string,
  checked: CheckedReviewAutoCheckRow[],
  suggestedAlternatives: Map<string, PlayingCard[] | null>,
): Promise<string[]> {
  const confirmedScanIds = checked
    .filter(({ decision }) => decision.verdict === "confirmed")
    .map(({ row }) => row.scanId);
  const reviewed =
    confirmedScanIds.length > 0
      ? await tx
          .update(collectionCards)
          .set({
            isReviewed: true,
            isAutoReviewed: true,
            lowConfidenceMatch: false,
          })
          .where(
            and(
              eq(collectionCards.orgId, orgId),
              eq(collectionCards.isReviewed, false),
              inArray(collectionCards.guid, confirmedScanIds),
            ),
          )
          .returning({ scanId: collectionCards.guid })
      : [];
  for (const [scanId, alternativeMatches] of suggestedAlternatives) {
    await tx
      .update(collectionCards)
      .set({ alternativeMatches, lowConfidenceMatch: true })
      .where(
        and(
          eq(collectionCards.orgId, orgId),
          eq(collectionCards.isReviewed, false),
          eq(collectionCards.guid, scanId),
        ),
      );
  }
  return reviewed.flatMap((row) => (row.scanId ? [row.scanId] : []));
}

function toOutcome({
  row,
  decision,
}: CheckedReviewAutoCheckRow): ReviewAutoCheckOutcome {
  return {
    scanId: row.scanId,
    verdict: decision.verdict,
    suggestedCardName: decision.suggestion?.card?.name ?? null,
  };
}

export async function autoCheckReviewCards(
  request: ReviewAutoCheckRequestContext,
): Promise<ReviewAutoCheckOutcome[]> {
  const key = autoCheckKey(request.orgId, request.collectionGuid);
  collectionsBeingAutoChecked.add(key);
  try {
    const rows = await authQuery(request.jwtClaims, (tx) =>
      loadUnreviewedRows(tx, request),
    );
    const checked = await reidentifyRows(rows);
    const suggestedAlternatives = new Map<string, PlayingCard[] | null>();
    for (const { row, decision } of checked) {
      if (decision.verdict !== "different" || !decision.suggestion?.card)
        continue;
      suggestedAlternatives.set(
        row.scanId,
        await withSuggestionFirst(row, decision.suggestion.card),
      );
    }
    const confirmedScanIds = await authQuery(request.jwtClaims, (tx) =>
      saveDecisions(tx, request.orgId, checked, suggestedAlternatives),
    );
    if (confirmedScanIds.length > 0) {
      const event: CardsReviewedEvent = {
        confirmedScanIds: [],
        reviewedScanIds: confirmedScanIds,
      };
      emitToSession(request.orgId, request.collectionGuid, "cards_reviewed", event);
    }
    if (confirmedScanIds.length > 0 || suggestedAlternatives.size > 0) {
      emitCollectionCardsChanged(request.orgId, request.collectionGuid);
    }
    return checked.map(toOutcome);
  } finally {
    collectionsBeingAutoChecked.delete(key);
  }
}
