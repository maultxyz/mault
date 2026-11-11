import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { cardImageVectors, collections, games } from "../../db/schema";
import { warmCardMatchSegments } from "../../lib/card-match-index";
import { clearCollectionMatchScopeCache } from "../../lib/card-search/resolve";
import { emitToOrg } from "../../lib/session-stream";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { collectionNameTaken, loadCollections } from "./shared";

export const editCollectionRoute = new Hono<AppEnv>().put(
  "/:guid",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const { name, lang, matchAllLanguages } = await c.req.json<{
      name: string;
      lang?: string;
      matchAllLanguages?: boolean;
    }>();
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const [target] = await tx
        .select({
          id: collections.id,
          lang: collections.lang,
          matchAllLanguages: collections.matchAllLanguages,
          gameKey: games.key,
        })
        .from(collections)
        .leftJoin(games, eq(games.id, collections.gameId))
        .where(
          and(
            eq(collections.guid, guid),
            eq(collections.orgId, orgId),
            eq(collections.isDeleted, false),
          ),
        )
        .limit(1);
      if (!target) return { success: false, message: "Collection not found." };
      if (await collectionNameTaken(tx, orgId, name, guid)) {
        return {
          success: false,
          message: `A collection named "${name.trim()}" already exists.`,
          nameTaken: true,
        };
      }
      const nextLang = lang || target.lang;
      if (nextLang !== target.lang) {
        if (!target.gameKey) {
          return { success: false, message: "Collection has no game." };
        }
        const [syncedCard] = await tx
          .select({ id: cardImageVectors.id })
          .from(cardImageVectors)
          .where(
            and(
              eq(cardImageVectors.gameKey, target.gameKey),
              eq(cardImageVectors.lang, nextLang),
            ),
          )
          .limit(1);
        if (!syncedCard) {
          return {
            success: false,
            message: `No cards are synced in language: ${nextLang}`,
          };
        }
      }
      const nextMatchAllLanguages =
        matchAllLanguages ?? target.matchAllLanguages;
      await tx
        .update(collections)
        .set({
          name,
          lang: nextLang,
          matchAllLanguages: nextMatchAllLanguages,
          updatedAt: new Date(),
        })
        .where(eq(collections.id, target.id));
      const matchScopeChanged =
        nextLang !== target.lang ||
        nextMatchAllLanguages !== target.matchAllLanguages;
      return {
        ...(await loadCollections(tx, orgId)),
        changedMatchScope:
          matchScopeChanged && target.gameKey
            ? { gameKey: target.gameKey, lang: nextLang }
          : null,
      };
    });
    if ("changedMatchScope" in result) {
      const { changedMatchScope, ...response } = result;
      if (changedMatchScope) {
        clearCollectionMatchScopeCache();
        warmCardMatchSegments([
          { ...changedMatchScope, matchAllLanguages: false },
        ]);
      }
      if (response.success) emitToOrg(orgId, "collections_changed", { guid });
      return c.json(response);
    }
    return c.json(
      result,
      "nameTaken" in result && result.nameTaken ? 409 : 200,
    );
  },
);
