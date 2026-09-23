import { db } from "../../db";
import { cardImageVectors } from "../../db/schema";
import { SYNC_SOURCES } from "../../lib/sync-job";
import { vectorizeCardImage } from "../../lib/vectorize";

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

  const imageRes = await fetch(card.imageUrl, { headers: source.fetchHeaders });
  if (!imageRes.ok) {
    return {
      success: false,
      message: `Failed to download card image (GET ${card.imageUrl})`,
      status: 502,
    };
  }
  const buffer = Buffer.from(await imageRes.arrayBuffer());
  const { embedding } = await vectorizeCardImage(buffer);

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
