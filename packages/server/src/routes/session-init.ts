import {
  RECENT_SCANNED_CARDS_COUNT,
  type Collection,
  type FieldMeta,
  type PlayingCardWithDistance,
  type ScannedCard,
} from "@magic-vault/shared";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import type { Transaction } from "../db";
import { collectionCards, unmatchedCards } from "../db/schema";
import { cardWithStoredPricesSql } from "../lib/card-price-sql";
import { SESSION_INIT_UNMATCHED_IMAGE_LIMIT } from "../lib/constants/session-stream";
import type { ViewerInfo } from "../lib/session-stream";
import { resolveScanImageUrl } from "../lib/scan-images";
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
      isDownloaded: collectionCards.isDownloaded,
      alternativeMatches: collectionCards.alternativeMatches,
      needsReview: collectionCards.needsReview,
    })
    .from(collectionCards)
    .where(eq(collectionCards.collectionId, collection.id))
    .orderBy(desc(collectionCards.scannedAt))
    .limit(RECENT_SCANNED_CARDS_COUNT);

  const [{ cardCount }] = await tx
    .select({ cardCount: count(collectionCards.id) })
    .from(collectionCards)
    .where(eq(collectionCards.collectionId, collection.id));

  const unmatchedRows = await tx
    .select({
      guid: unmatchedCards.guid,
      scannedAt: unmatchedCards.scannedAt,
      binNumber: unmatchedCards.binNumber,
    })
    .from(unmatchedCards)
    .where(
      and(
        eq(unmatchedCards.collectionId, collection.id),
        eq(unmatchedCards.isDeleted, false),
      ),
    )
    .orderBy(desc(unmatchedCards.scannedAt));

  const recentUnmatchedGuids = unmatchedRows
    .slice(0, SESSION_INIT_UNMATCHED_IMAGE_LIMIT)
    .map((row) => row.guid)
    .filter((guid): guid is string => !!guid);
  const recentImages =
    recentUnmatchedGuids.length > 0
      ? await tx
          .select({
            guid: unmatchedCards.guid,
            capturedImageDataUrl: unmatchedCards.capturedImageDataUrl,
            capturedImageKey: unmatchedCards.capturedImageKey,
          })
          .from(unmatchedCards)
          .where(inArray(unmatchedCards.guid, recentUnmatchedGuids))
      : [];
  const imageByGuid = new Map(
    await Promise.all(
      recentImages.map(
        async (row) => [row.guid, await resolveScanImageUrl(row)] as const,
      ),
    ),
  );

  return {
    collection: {
      guid: collection.guid!,
      name: collection.name,
      isActive: collection.isActive,
      cardCount,
      lang: collection.lang,
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
    recentCards: cardRows.map(toScannedCard).map(slimScan),
    unmatchedCards: unmatchedRows.map((row) =>
      toUnmatchedCard({
        ...row,
        capturedImageUrl: imageByGuid.get(row.guid),
      }),
    ),
    viewers,
  };
}

function withoutRaw(card: PlayingCardWithDistance): PlayingCardWithDistance {
  const { raw: _raw, ...rest } = card;
  return rest;
}

function slimScan(scan: ScannedCard): ScannedCard {
  return {
    ...scan,
    card: withoutRaw(scan.card),
    alternativeMatches: scan.alternativeMatches?.map(withoutRaw),
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
