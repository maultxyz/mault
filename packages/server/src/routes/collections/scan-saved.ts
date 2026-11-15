import { and, eq } from "drizzle-orm";
import { authQuery, orgIdOfJwtClaims } from "../../db";
import { collectionCards, unmatchedCards } from "../../db/schema";

export async function isScanSaved(
  jwtClaims: string,
  table: typeof collectionCards | typeof unmatchedCards,
  scanId: string,
): Promise<boolean> {
  const orgId = orgIdOfJwtClaims(jwtClaims);
  if (!scanId || !orgId) return false;
  return authQuery(jwtClaims, async (tx) => {
    const rows =
      table === collectionCards
        ? await tx
            .select({ id: collectionCards.id })
            .from(collectionCards)
            .where(
              and(
                eq(collectionCards.guid, scanId),
                eq(collectionCards.orgId, orgId),
              ),
            )
            .limit(1)
        : await tx
            .select({ id: unmatchedCards.id })
            .from(unmatchedCards)
            .where(
              and(
                eq(unmatchedCards.guid, scanId),
                eq(unmatchedCards.orgId, orgId),
              ),
            )
            .limit(1);
    return rows.length > 0;
  });
}
