import { sql } from "drizzle-orm";
import { db } from "../../db";
import { cardImageVectors } from "../../db/schema";
import { SYNC_SOURCES } from "../../lib/sync-job";
import { toPortraitCardImage } from "../../lib/card-image";
import { invalidateCardMatchIndex } from "../../lib/card-match-index";
import { publicGamesCache } from "../../lib/public-games";
import { vectorizeCardImage } from "../../lib/vectorize";
import { storedCollectorNumber } from "../../lib/card-search/collector-number";
import { catalogColumnsFor } from "../../lib/card-catalog";
import {
  addToPrintingMarkBatch,
  persistPrintingMarkBatch,
  printingMarkColumns,
  readCatalogPrintingMarks,
} from "../../lib/printing-marks/catalog";
import { PRINTING_MARK_VERSION } from "../../lib/constants/printing-marks";
import type {
  CatalogPrintingMarks,
  PrintingMarkBatch,
} from "../../lib/interfaces/printing-marks";

async function fetchPortraitImage(
  url: string,
  headers: Record<string, string>,
): Promise<Buffer | null> {
  const imageRes = await fetch(url, { headers });
  if (!imageRes.ok) return null;
  return toPortraitCardImage(Buffer.from(await imageRes.arrayBuffer()));
}

async function embedImageUrl(
  url: string,
  headers: Record<string, string>,
): Promise<number[] | null> {
  const buffer = await fetchPortraitImage(url, headers);
  if (!buffer) return null;
  const { embedding } = await vectorizeCardImage(buffer);
  return embedding;
}

async function embedFrontImageUrl(
  gameKey: string,
  lang: string,
  cardId: string,
  data: unknown,
  url: string,
  headers: Record<string, string>,
): Promise<{ embedding: number[]; marks: CatalogPrintingMarks | null } | null> {
  const buffer = await fetchPortraitImage(url, headers);
  if (!buffer) return null;
  const [{ embedding }, marks] = await Promise.all([
    vectorizeCardImage(buffer),
    readCatalogPrintingMarks(gameKey, lang, cardId, data, buffer),
  ]);
  return { embedding, marks };
}

export async function syncOneCard(
  gameKey: string,
  cardId: string,
  lang: string,
): Promise<
  | { success: true; message: string }
  | { success: false; message: string; status: 400 | 404 | 502 }
> {
  const source = SYNC_SOURCES[gameKey];
  if (!source) {
    return {
      success: false,
      message: `Unknown sync source: ${gameKey}`,
      status: 400,
    };
  }
  const baseUrl = source.defaultUrl;

  const { card, urls } = await source.fetchOne(cardId, baseUrl, lang);
  const attempted = urls.length > 0 ? ` (tried: ${urls.join(", ")})` : "";
  if (!card) {
    return {
      success: false,
      message: `Card not found via ${source.label}${attempted}`,
      status: 404,
    };
  }
  if (!card.imageUrl) {
    return {
      success: false,
      message: `No image available for this card${attempted}`,
      status: 400,
    };
  }

  const data: unknown = JSON.parse(card.data);
  const front =
    (await embedFrontImageUrl(
      gameKey,
      lang,
      cardId,
      data,
      card.imageUrl,
      source.fetchHeaders,
    )) ??
    (card.fallbackImageUrl && card.fallbackImageUrl !== card.imageUrl
      ? await embedFrontImageUrl(
          gameKey,
          lang,
          cardId,
          data,
          card.fallbackImageUrl,
          source.fetchHeaders,
        )
      : null);
  if (!front) {
    return {
      success: false,
      message: `Failed to download card image (GET ${card.imageUrl})`,
      status: 502,
    };
  }
  const backEmbedding = card.backImageUrl
    ? await embedImageUrl(card.backImageUrl, source.fetchHeaders)
    : null;
  const collectorNumber = storedCollectorNumber(gameKey, lang, cardId, data);
  const catalog = catalogColumnsFor(gameKey, lang, cardId, data);

  const markColumns = printingMarkColumns(gameKey, front.marks);
  await db.transaction(async (tx) => {
    const existing = await tx
      .select({ version: cardImageVectors.printingMarkVersion })
      .from(cardImageVectors)
      .where(
        sql`${cardImageVectors.gameKey} = ${gameKey} AND ${cardImageVectors.lang} = ${lang} AND ${cardImageVectors.cardId} = ${cardId}`,
      );
    const markBatch: PrintingMarkBatch = new Map();
    if (existing[0]?.version !== PRINTING_MARK_VERSION) {
      addToPrintingMarkBatch(markBatch, front.marks);
    }
    await tx
      .insert(cardImageVectors)
      .values({
        cardId,
        gameKey,
        lang,
        name: card.name,
        setCode: card.setCode,
        collectorNumber,
        embedding: front.embedding,
        backEmbedding,
        data: sql`${card.data}::jsonb`,
        ...catalog,
        ...markColumns,
      })
      .onConflictDoUpdate({
        target: [
          cardImageVectors.gameKey,
          cardImageVectors.lang,
          cardImageVectors.cardId,
        ],
        set: {
          name: card.name,
          setCode: card.setCode,
          collectorNumber,
          embedding: front.embedding,
          backEmbedding,
          data: sql`${card.data}::jsonb`,
          ...catalog,
          ...markColumns,
          updatedAt: new Date(),
        },
      });
    await persistPrintingMarkBatch(tx, gameKey, markBatch);
  });
  publicGamesCache.invalidate();
  invalidateCardMatchIndex(gameKey);

  return { success: true, message: `Synced: ${card.name}` };
}
