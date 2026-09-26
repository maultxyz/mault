import type { Collection, FieldMeta } from "@magic-vault/shared";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { authProvider } from "../auth";
import { authQuery } from "../db";
import { collectionCards, collections, unmatchedCards } from "../db/schema";
import { applyTcgplayerPricesToScans } from "../lib/card-search/tcgplayer-prices";
import { getLocksForGuids, subscribeOrgLocks } from "../lib/scan-lock";
import {
  getAllSessionViewers,
  getLiveCountsForGuids,
  getSessionViewers,
  subscribeOrgLiveCounts,
  subscribeSession,
} from "../lib/session-stream";
import { subscribeSSE } from "../lib/sync-job";
import { getUserDisplayName, verifyToken, type AppEnv } from "../middleware/auth";
import { toScannedCard, toUnmatchedCard } from "./collections/shared";

// GET /stream — single SSE connection multiplexing everything the app used to
// open separate connections for: org-wide scan locks, org-wide live viewer
// counts, the global admin sync job, and (via ?guids=) per-collection scan
// session events. Session-scoped events are namespaced "session:<guid>:<event>"
// so one connection can safely watch several collections at once.
export const streamRoute = new Hono<AppEnv>().get("/", async (c) => {
  const token = c.req.query("token");
  const orgId = c.req.query("orgId");
  const guidsParam = c.req.query("guids");
  const watchGuids = guidsParam ? guidsParam.split(",").filter(Boolean) : [];

  if (!token) return c.json({ success: false, message: "Unauthorized" }, 401);

  const payload = await verifyToken(token);
  if (!payload?.sub)
    return c.json({ success: false, message: "Unauthorized" }, 401);
  const userId = payload.sub;

  if (orgId) {
    const member = await authProvider.resolveOrgMembership(userId, orgId);
    if (!member) return c.json({ success: false, message: "Forbidden" }, 403);
  }

  const jwtClaims = orgId
    ? JSON.stringify({ sub: userId, role: "authenticated" })
    : null;
  const displayName = await getUserDisplayName(userId);

  return streamSSE(c, async (stream) => {
    const aborted = new Promise<void>((resolve) => stream.onAbort(resolve));
    const write = (event: string, data: unknown) => {
      stream.writeSSE({ event, data: JSON.stringify(data) }).catch(() => {});
    };

    // "error" is EventSource's reserved connection-failure event name, so the
    // sync job's own same-named event is renamed here - a custom "error" event
    // would otherwise also fire every other consumer's connection-error handler.
    const unsubs: Array<() => void> = [
      subscribeSSE((event, data) => write(event === "error" ? "sync_error" : event, data)),
    ];

    if (orgId) {
      unsubs.push(subscribeOrgLocks(orgId, write));
      unsubs.push(subscribeOrgLiveCounts(orgId, write));

      try {
        const guids = await authQuery(jwtClaims!, async (tx) =>
          tx
            .select({ guid: collections.guid })
            .from(collections)
            .where(eq(collections.orgId, orgId)),
        );
        const orgGuids = guids.map((r) => r.guid!).filter(Boolean);
        write("lock_init", { locks: getLocksForGuids(orgGuids) });
        write("live_init", {
          counts: getLiveCountsForGuids(orgGuids),
          viewers: getAllSessionViewers(),
        });
      } catch {
        // non-fatal — subscribers still receive live lock/count events
      }

      for (const guid of watchGuids) {
        const sessionWrite = (event: string, data: unknown) =>
          write(`session:${guid}:${event}`, data);

        unsubs.push(
          subscribeSession(guid, orgId, userId, displayName, sessionWrite),
        );

        try {
          const initial = await authQuery(jwtClaims!, async (tx) => {
            const collection = await tx.query.collections.findFirst({
              where: (t, { eq, and }) =>
                and(eq(t.guid, guid), eq(t.orgId, orgId)),
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
                binNumber: unmatchedCards.binNumber,
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
            const cards = await applyTcgplayerPricesToScans(
              initial.collection.game?.key,
              initial.cards,
            );
            write(`session:${guid}:session_init`, { ...initial, cards });
          }
        } catch {
          // non-fatal — subscriber will still receive live session events
        }
      }
    }

    await aborted;
    for (const unsub of unsubs) unsub();
  });
});
