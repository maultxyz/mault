import { db } from "../../db";
import { cardImageVectors } from "../../db/schema";
import { SYNC_SOURCES } from "../../lib/sync-job";
import { vectorizeImageFromBuffer } from "../../lib/vectorize";

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

  const card = await source.fetchOne(cardId, baseUrl, lang);
  if (!card) {
    return {
      success: false,
      message: `Card not found via ${source.label}`,
      status: 404,
    };
  }
  if (!card.imageUrl) {
    return {
      success: false,
      message: "No image available for this card",
      status: 400,
    };
  }

  const imageRes = await fetch(card.imageUrl, { headers: source.fetchHeaders });
  if (!imageRes.ok) {
    return {
      success: false,
      message: "Failed to download card image",
      status: 502,
    };
  }
  const buffer = Buffer.from(await imageRes.arrayBuffer());
  const embedding = await vectorizeImageFromBuffer(buffer);

  await db
    .insert(cardImageVectors)
    .values({
      cardId,
      gameKey,
      lang,
      name: card.name,
      setCode: card.setCode,
      embedding,
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
        embedding,
        updatedAt: new Date(),
      },
    });

  return { success: true, message: `Synced: ${card.name}` };
}
