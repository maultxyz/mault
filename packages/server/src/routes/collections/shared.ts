import type {
  Collection,
  FieldMeta,
  PlayingCardWithDistance,
  ScannedCard,
  UnmatchedCard,
} from "@magic-vault/shared";
import { count, desc, eq, sql } from "drizzle-orm";
import type { Transaction } from "../../db";
import { collectionCards, collections, games } from "../../db/schema";

export function toCollection(row: {
  guid: string | null;
  name: string;
  isActive: boolean;
  cardCount: string | number;
  lang: string;
  createdAt: Date;
  updatedAt: Date;
  gameGuid: string | null;
  gameKey: string | null;
  gameName: string | null;
  gameIsActive: boolean | null;
  gameFieldDefinitions: unknown;
  gameApiDocsUrl: string | null;
  gameCreatedAt: Date | null;
  gameUpdatedAt: Date | null;
}): Collection {
  return {
    guid: row.guid!,
    name: row.name,
    isActive: row.isActive,
    cardCount: Number(row.cardCount),
    lang: row.lang,
    game: row.gameGuid
      ? {
          guid: row.gameGuid,
          key: row.gameKey!,
          name: row.gameName!,
          isActive: row.gameIsActive!,
          fieldDefinitions: row.gameFieldDefinitions as FieldMeta[],
          apiDocsUrl: row.gameApiDocsUrl,
          createdAt: row.gameCreatedAt!,
          updatedAt: row.gameUpdatedAt!,
        }
      : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toScannedCard(row: {
  guid: string | null;
  card: unknown;
  scannedAt: Date;
  binNumber: number | null;
  capturedImageDataUrl?: string | null;
  isFoil?: boolean | null;
  isDownloaded?: boolean | null;
  alternativeMatches?: unknown;
}): ScannedCard {
  return {
    scanId: row.guid!,
    card: row.card as PlayingCardWithDistance,
    scannedAt: row.scannedAt.getTime(),
    binNumber: row.binNumber ?? undefined,
    capturedImageUrl: row.capturedImageDataUrl ?? undefined,
    isFoil: row.isFoil ?? undefined,
    isDownloaded: row.isDownloaded ?? undefined,
    alternativeMatches:
      (row.alternativeMatches as PlayingCardWithDistance[] | null) ?? undefined,
  };
}

export function toUnmatchedCard(row: {
  guid: string | null;
  capturedImageDataUrl: string | null;
  scannedAt: Date;
}): UnmatchedCard {
  return {
    scanId: row.guid!,
    capturedImageUrl: row.capturedImageDataUrl ?? undefined,
    scannedAt: row.scannedAt.getTime(),
  };
}

export async function loadCollections(
  tx: Transaction,
  orgId: string,
): Promise<{ success: true; data: Collection[] }> {
  const rows = await tx
    .select({
      id: collections.id,
      guid: collections.guid,
      name: collections.name,
      isActive: collections.isActive,
      cardCount: count(collectionCards.id),
      lang: collections.lang,
      createdAt: collections.createdAt,
      updatedAt: collections.updatedAt,
      gameGuid: games.guid,
      gameKey: games.key,
      gameName: games.name,
      gameIsActive: games.isActive,
      gameFieldDefinitions: games.fieldDefinitions,
      gameApiDocsUrl: games.apiDocsUrl,
      gameCreatedAt: games.createdAt,
      gameUpdatedAt: games.updatedAt,
    })
    .from(collections)
    .leftJoin(collectionCards, eq(collectionCards.collectionId, collections.id))
    .leftJoin(games, eq(games.id, collections.gameId))
    .where(eq(collections.orgId, orgId))
    .groupBy(
      collections.id,
      collections.guid,
      collections.name,
      collections.isActive,
      collections.lang,
      collections.createdAt,
      collections.updatedAt,
      games.id,
    )
    .orderBy(desc(collections.updatedAt));

  return { success: true, data: rows.map(toCollection) };
}

export async function collectionNameTaken(
  tx: Transaction,
  orgId: string,
  name: string,
  excludeGuid?: string,
): Promise<boolean> {
  const trimmed = name.trim().toLowerCase();
  const existing = await tx.query.collections.findFirst({
    where: (t, { eq, and }) =>
      and(eq(t.orgId, orgId), sql`lower(trim(${t.name})) = ${trimmed}`),
    columns: { guid: true },
  });
  if (!existing) return false;
  return existing.guid !== excludeGuid;
}
