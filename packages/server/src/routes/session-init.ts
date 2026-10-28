import {
  RECENT_SCANNED_CARDS_COUNT,
  UNMATCHED_PREVIEW_COUNT,
  type Collection,
  type FieldMeta,
  type PlayingCardWithDistance,
} from "@magic-vault/shared";
import { and, count, desc, eq, sql } from "drizzle-orm";
import type { Transaction } from "../db";
import { collectionCards, unmatchedCards } from "../db/schema";
import { cardWithStoredPricesSql } from "../lib/card-price-sql";
import type { ViewerInfo } from "../lib/interfaces/session-stream";
import { resolveScanImageUrl } from "../lib/scan-images";
import { isPiHost } from "../lib/pi-host";
import { hydrateSavedScans } from "../lib/saved-cards";
import { toScannedCard, toUnmatchedCard } from "./collections/shared";

async function querySessionInit(
  tx: Transaction,
  guid: string,
  orgId: string,
  viewers: ViewerInfo[],
) {
  const collection = await tx.query.collections.findFirst({
    where: (t, { eq, and }) =>
      and(eq(t.guid, guid), eq(t.orgId, orgId), eq(t.isDeleted, false)),
    columns: {
      id: true,
      guid: true,
      name: true,
      isActive: true,
      gameId: true,
      lang: true,
      matchAllLanguages: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!collection) return null;

  const game = collection.gameId
    ? await tx.query.games.findFirst({
        where: (t, { eq }) => eq(t.id, collection.gameId!),
      })
    : null;

  const cardRows = await tx
    .select({
      guid: collectionCards.guid,
      card: sql<PlayingCardWithDistance>`${cardWithStoredPricesSql(sql`${collectionCards.card}`)}`,
      scannedAt: collectionCards.scannedAt,
      binNumber: collectionCards.binNumber,
      isFoil: collectionCards.isFoil,
      foilType: collectionCards.foilType,
      condition: collectionCards.condition,
      language: collectionCards.language,
      isDownloaded: collectionCards.isDownloaded,
      alternativeMatches: collectionCards.alternativeMatches,
      lowConfidenceMatch: collectionCards.lowConfidenceMatch,
    })
    .from(collectionCards)
    .where(eq(collectionCards.collectionId, collection.id))
    .orderBy(desc(collectionCards.scannedAt))
    .limit(RECENT_SCANNED_CARDS_COUNT);

  const [{ cardCount }] = await tx
    .select({ cardCount: count(collectionCards.id) })
    .from(collectionCards)
    .where(eq(collectionCards.collectionId, collection.id));

  const liveUnmatched = and(
    eq(unmatchedCards.collectionId, collection.id),
    eq(unmatchedCards.isDeleted, false),
  );
  const [{ unmatchedCount }] = await tx
    .select({ unmatchedCount: count(unmatchedCards.id) })
    .from(unmatchedCards)
    .where(liveUnmatched);
  const unmatchedRows = await tx
    .select({
      guid: unmatchedCards.guid,
      scannedAt: unmatchedCards.scannedAt,
      binNumber: unmatchedCards.binNumber,
      ...(isPiHost() ? { diagnostics: unmatchedCards.diagnostics } : {}),
      capturedImageDataUrl: unmatchedCards.capturedImageDataUrl,
      capturedImageKey: unmatchedCards.capturedImageKey,
    })
    .from(unmatchedCards)
    .where(liveUnmatched)
    .orderBy(desc(unmatchedCards.scannedAt), desc(unmatchedCards.id))
    .limit(UNMATCHED_PREVIEW_COUNT);

  return {
    collection: {
      guid: collection.guid!,
      name: collection.name,
      isActive: collection.isActive,
      cardCount,
      previewImages: [],
      lang: collection.lang,
      matchAllLanguages: collection.matchAllLanguages,
      game: game
        ? {
            guid: game.guid!,
            key: game.key,
            name: game.name,
            isActive: game.isActive,
            fieldDefinitions: game.fieldDefinitions as FieldMeta[],
            foilTypes: (game.foilTypes as string[] | null) ?? [],
            apiDocsUrl: game.apiDocsUrl,
            createdAt: game.createdAt,
            updatedAt: game.updatedAt,
            cardThickness: game.cardThickness,
          }
        : null,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
    } satisfies Collection,
    recentCards: await hydrateSavedScans(
      { gameKey: game?.key ?? null, lang: collection.lang },
      cardRows.map(toScannedCard),
      { includeRaw: false },
    ),
    unmatchedCards: await Promise.all(
      unmatchedRows.map(async (row) =>
        toUnmatchedCard({
          ...row,
          capturedImageUrl: await resolveScanImageUrl(row),
        }),
      ),
    ),
    unmatchedCount,
    viewers,
  };
}

export async function loadSessionInit(
  run: <T>(fn: (tx: Transaction) => Promise<T>) => Promise<T>,
  guid: string,
  orgId: string,
  viewers: ViewerInfo[],
) {
  return run((tx) => querySessionInit(tx, guid, orgId, viewers));
}
