import type { Collection, FieldMeta } from "@magic-vault/shared";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { authProvider } from "../../auth";
import { authQuery } from "../../db";
import { collectionCards, unmatchedCards } from "../../db/schema";
import { getSessionViewers, subscribeSession } from "../../lib/session-stream";
import { getUserDisplayName, verifyToken, type AppEnv } from "../../middleware/auth";
import { toScannedCard, toUnmatchedCard } from "./shared";

// GET /collections/:guid/stream — SSE, auth via ?token= and ?orgId= query params
export const collectionStreamRoute = new Hono<AppEnv>().get("/:guid/stream", async (c) => {
  const guid = c.req.param("guid");
  const token = c.req.query("token");
  const orgId = c.req.query("orgId");

  if (!token || !orgId)
    return c.json({ success: false, message: "Unauthorized" }, 401);

  const payload = await verifyToken(token);
  if (!payload?.sub)
    return c.json({ success: false, message: "Unauthorized" }, 401);

  const member = await authProvider.resolveOrgMembership(payload.sub, orgId);
  if (!member) return c.json({ success: false, message: "Forbidden" }, 403);

  const jwtClaims = JSON.stringify({ sub: payload.sub, role: "authenticated" });

  const viewerDisplayName = await getUserDisplayName(payload.sub);

  return streamSSE(c, async (stream) => {
    const aborted = new Promise<void>((resolve) => stream.onAbort(resolve));

    const writer = (event: string, data: unknown) => {
      stream.writeSSE({ event, data: JSON.stringify(data) }).catch(() => {});
    };

    const unsubscribe = subscribeSession(
      guid,
      orgId,
      payload.sub!,
      viewerDisplayName,
      writer,
    );

    try {
      const initial = await authQuery(jwtClaims, async (tx) => {
        const collection = await tx.query.collections.findFirst({
          where: (t, { eq, and }) => and(eq(t.guid, guid), eq(t.orgId, orgId)),
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
            card: collectionCards.card,
            scannedAt: collectionCards.scannedAt,
            binNumber: collectionCards.binNumber,
            isFoil: collectionCards.isFoil,
            foilType: collectionCards.foilType,
            isDownloaded: collectionCards.isDownloaded,
            alternativeMatches: collectionCards.alternativeMatches,
          })
          .from(collectionCards)
          .where(eq(collectionCards.collectionId, collection.id))
          .orderBy(desc(collectionCards.scannedAt));

        const unmatchedRows = await tx
          .select({
            guid: unmatchedCards.guid,
            capturedImageDataUrl: unmatchedCards.capturedImageDataUrl,
            scannedAt: unmatchedCards.scannedAt,
          })
          .from(unmatchedCards)
          .where(
            and(
              eq(unmatchedCards.collectionId, collection.id),
              eq(unmatchedCards.isDeleted, false),
            ),
          )
          .orderBy(desc(unmatchedCards.scannedAt));

        return {
          collection: {
            guid: collection.guid!,
            name: collection.name,
            isActive: collection.isActive,
            cardCount: cardRows.length,
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
                }
              : null,
            createdAt: collection.createdAt,
            updatedAt: collection.updatedAt,
          } satisfies Collection,
          cards: cardRows.map(toScannedCard),
          unmatchedCards: unmatchedRows.map(toUnmatchedCard),
          viewers: getSessionViewers(guid),
        };
      });

      if (initial) {
        await stream.writeSSE({
          event: "session_init",
          data: JSON.stringify(initial),
        });
      }
    } catch {
      // non-fatal — subscriber will still receive live events
    }

    await aborted;

    unsubscribe();
  });
});
