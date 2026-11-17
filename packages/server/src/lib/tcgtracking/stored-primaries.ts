import { and, eq, notLike } from "drizzle-orm";
import { db } from "../../db";
import { cardImageVectors } from "../../db/schema";
import { TCGTRACKING_FALLBACK_ID_PREFIX } from "../constants/tcgtracking";
import type { SyncSourceCard } from "../interfaces/card-search";

export async function loadStoredPrimaryCards(
  gameKey: string,
  lang: string,
): Promise<SyncSourceCard[]> {
  const rows = await db
    .select({
      cardId: cardImageVectors.cardId,
      name: cardImageVectors.name,
      setCode: cardImageVectors.setCode,
      data: cardImageVectors.data,
    })
    .from(cardImageVectors)
    .where(
      and(
        eq(cardImageVectors.gameKey, gameKey),
        eq(cardImageVectors.lang, lang),
        notLike(cardImageVectors.cardId, `${TCGTRACKING_FALLBACK_ID_PREFIX}%`),
      ),
    );
  return rows.flatMap((row) =>
    row.data
      ? [
          {
            id: row.cardId,
            name: row.name,
            setCode: row.setCode,
            imageUrl: undefined,
            data: JSON.stringify(row.data),
          },
        ]
      : [],
  );
}
