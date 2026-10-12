import { eq } from "drizzle-orm";
import { authQuery } from "../../db";
import { collectionCards, unmatchedCards } from "../../db/schema";

export async function isScanSaved(
  jwtClaims: string,
  table: typeof collectionCards | typeof unmatchedCards,
  scanId: string,
): Promise<boolean> {
  if (!scanId) return false;
  return authQuery(jwtClaims, async (tx) => {
    const rows =
      table === collectionCards
        ? await tx
            .select({ id: collectionCards.id })
            .from(collectionCards)
            .where(eq(collectionCards.guid, scanId))
            .limit(1)
        : await tx
            .select({ id: unmatchedCards.id })
            .from(unmatchedCards)
            .where(eq(unmatchedCards.guid, scanId))
            .limit(1);
    return rows.length > 0;
  });
}
