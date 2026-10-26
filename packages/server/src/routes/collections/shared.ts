import {
  COLLECTION_PREVIEW_IMAGE_COUNT,
  toCardCondition,
  type CardStorageLocation,
  type Collection,
  type FieldMeta,
  type PlayingCardWithDistance,
  type ScannedCard,
  type UnmatchedCard,
  type UnmatchedScanDiagnostics,
} from "@magic-vault/shared";
import { and, desc, eq, sql } from "drizzle-orm";
import type { Transaction } from "../../db";
import { collectionCards, collections, games } from "../../db/schema";
import { COLLECTION_PREVIEW_SCAN_WINDOW } from "../../lib/constants/collections";

export function toCollection(row: {
  guid: string | null;
  name: string;
  isActive: boolean;
  cardCount: string | number;
  lang: string;
  matchAllLanguages: boolean;
  createdAt: Date;
  updatedAt: Date;
  gameGuid: string | null;
  gameKey: string | null;
  gameName: string | null;
  gameIsActive: boolean | null;
  gameFieldDefinitions: unknown;
  gameFoilTypes: unknown;
  gameApiDocsUrl: string | null;
  gameCardThickness: number | null;
  gameCreatedAt: Date | null;
  gameUpdatedAt: Date | null;
  previewImages?: string[];
}): Collection {
  return {
    guid: row.guid!,
    name: row.name,
    isActive: row.isActive,
    cardCount: Number(row.cardCount),
    previewImages: row.previewImages ?? [],
    lang: row.lang,
    matchAllLanguages: row.matchAllLanguages,
    game: row.gameGuid
      ? {
          guid: row.gameGuid,
          key: row.gameKey!,
          name: row.gameName!,
          isActive: row.gameIsActive!,
          fieldDefinitions: row.gameFieldDefinitions as FieldMeta[],
          foilTypes: (row.gameFoilTypes as string[] | null) ?? [],
          apiDocsUrl: row.gameApiDocsUrl,
          cardThickness: row.gameCardThickness,
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
  foilType?: string | null;
  condition?: string | null;
  language?: string | null;
  isDownloaded?: boolean | null;
  alternativeMatches?: unknown;
  isCorrected?: boolean | null;
  lowConfidenceMatch?: boolean | null;
  isReviewed?: boolean | null;
  storageLocation?: CardStorageLocation | null;
}): ScannedCard {
  return {
    scanId: row.guid!,
    card: row.card as PlayingCardWithDistance,
    scannedAt: row.scannedAt.getTime(),
    binNumber: row.binNumber ?? undefined,
    capturedImageUrl: row.capturedImageDataUrl ?? undefined,
    isFoil: row.isFoil ?? undefined,
    foilType: row.foilType ?? undefined,
    condition: toCardCondition(row.condition),
    language: row.language ?? undefined,
    isDownloaded: row.isDownloaded ?? undefined,
    alternativeMatches:
      (row.alternativeMatches as PlayingCardWithDistance[] | null) ?? undefined,
    corrected: row.isCorrected ?? undefined,
    lowConfidenceMatch: row.lowConfidenceMatch || undefined,
    reviewed: row.isReviewed || undefined,
    storageLocation: row.storageLocation ?? undefined,
  };
}

export function toUnmatchedCard(row: {
  guid: string | null;
  capturedImageUrl: string | undefined;
  scannedAt: Date;
  binNumber: number | null;
  diagnostics?: unknown;
}): UnmatchedCard {
  return {
    scanId: row.guid!,
    capturedImageUrl: row.capturedImageUrl,
    scannedAt: row.scannedAt.getTime(),
    binNumber: row.binNumber ?? undefined,
    diagnostics:
      (row.diagnostics as UnmatchedScanDiagnostics | null) ?? undefined,
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
      cardCount: sql<number>`(SELECT count(*)::int FROM ${collectionCards} cc WHERE cc.collection_id = ${collections.id})`,
      lang: collections.lang,
      matchAllLanguages: collections.matchAllLanguages,
      createdAt: collections.createdAt,
      updatedAt: collections.updatedAt,
      gameGuid: games.guid,
      gameKey: games.key,
      gameName: games.name,
      gameIsActive: games.isActive,
      gameFieldDefinitions: games.fieldDefinitions,
      gameFoilTypes: games.foilTypes,
      gameApiDocsUrl: games.apiDocsUrl,
      gameCardThickness: games.cardThickness,
      gameCreatedAt: games.createdAt,
      gameUpdatedAt: games.updatedAt,
    })
    .from(collections)
    .leftJoin(games, eq(games.id, collections.gameId))
    .where(and(eq(collections.orgId, orgId), eq(collections.isDeleted, false)))
    .orderBy(desc(collections.updatedAt));

  const previews = await tx.execute(sql`
    SELECT c.guid, COALESCE(p.images, ARRAY[]::text[]) AS images
    FROM ${collections} c
    LEFT JOIN LATERAL (
      SELECT array_agg(recent.image ORDER BY recent.scanned_at DESC) AS images
      FROM (
        SELECT latest.image, latest.scanned_at
        FROM (
          SELECT cc.card->'image'->>'small' AS image, cc.scanned_at
          FROM ${collectionCards} cc
          WHERE cc.collection_id = c.id
          ORDER BY cc.scanned_at DESC
          LIMIT ${COLLECTION_PREVIEW_SCAN_WINDOW}
        ) latest
        WHERE latest.image IS NOT NULL
        ORDER BY latest.scanned_at DESC
        LIMIT ${COLLECTION_PREVIEW_IMAGE_COUNT}
      ) recent
    ) p ON true
    WHERE c.org_id = ${orgId}
      AND c.is_deleted = false
  `);
  const imagesByGuid = new Map(
    (previews.rows as { guid: string; images: string[] }[]).map((r) => [
      r.guid,
      r.images,
    ]),
  );

  return {
    success: true,
    data: rows.map((row) =>
      toCollection({
        ...row,
        previewImages: imagesByGuid.get(row.guid ?? "") ?? [],
      }),
    ),
  };
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
      and(
        eq(t.orgId, orgId),
        eq(t.isDeleted, false),
        sql`lower(trim(${t.name})) = ${trimmed}`,
      ),
    columns: { guid: true },
  });
  if (!existing) return false;
  return existing.guid !== excludeGuid;
}
