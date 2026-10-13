import { sql } from "drizzle-orm";
import { db } from "../../db";
import { cardImageVectors } from "../../db/schema";
import { SYNC_SOURCES } from "../../lib/sync-job";
import { toPortraitCardImage } from "../../lib/card-image";
import { vectorizeCardImage } from "../../lib/vectorize";
import { storedCollectorNumber } from "../../lib/card-search/collector-number";

async function embedImageUrl(
  url: string,
  headers: Record<string, string>,
): Promise<number[] | null> {
  const imageRes = await fetch(url, { headers });
  if (!imageRes.ok) return null;
  const buffer = await toPortraitCardImage(
    Buffer.from(await imageRes.arrayBuffer()),
  );
  const { embedding } = await vectorizeCardImage(buffer);
  return embedding;
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

  const embedding = await embedImageUrl(card.imageUrl, source.fetchHeaders);
  if (!embedding) {
    return {
      success: false,
      message: `Failed to download card image (GET ${card.imageUrl})`,
      status: 502,
    };
  }
  const backEmbedding = card.backImageUrl
    ? await embedImageUrl(card.backImageUrl, source.fetchHeaders)
    : null;
  const collectorNumber = storedCollectorNumber(
    gameKey,
    lang,
    cardId,
    JSON.parse(card.data),
  );

  await db
    .insert(cardImageVectors)
    .values({
      cardId,
      gameKey,
      lang,
      name: card.name,
      setCode: card.setCode,
      collectorNumber,
      embedding,
      backEmbedding,
      data: sql`${card.data}::jsonb`,
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
        embedding,
        backEmbedding,
        data: sql`${card.data}::jsonb`,
        updatedAt: new Date(),
      },
    });

  return { success: true, message: `Synced: ${card.name}` };
}
