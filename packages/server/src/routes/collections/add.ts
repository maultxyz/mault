import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { collections } from "../../db/schema";
import {
  collectionLimitMessage,
  countLiveCollections,
  getCollectionLimit,
} from "../../lib/collection-limit";
import { emitToOrg } from "../../lib/session-stream";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { collectionNameTaken, loadCollections } from "./shared";

export const addCollectionRoute = new Hono<AppEnv>().post(
  "/",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const { name, gameGuid, lang, matchAllLanguages } = await c.req.json<{
      name: string;
      gameGuid?: string;
      lang?: string;
      matchAllLanguages?: boolean;
    }>();
    const taken = await authQuery(c.get("jwtClaims"), (tx) =>
      collectionNameTaken(tx, orgId, name),
    );
    if (taken) {
      return c.json(
        {
          success: false,
          message: `A collection named "${name.trim()}" already exists.`,
        },
        409,
      );
    }

    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const limit = await getCollectionLimit(tx, orgId);
      if (limit != null && (await countLiveCollections(tx, orgId)) >= limit) {
        return {
          success: false,
          message: collectionLimitMessage(limit),
          upgradeRequired: true,
        };
      }
      let gameId: number | null = null;
      if (gameGuid) {
        const game = await tx.query.games.findFirst({
          where: (t, { eq, and }) =>
            and(eq(t.guid, gameGuid), eq(t.isDeleted, false)),
          columns: { id: true },
        });
        gameId = game?.id ?? null;
      }

      await tx
        .update(collections)
        .set({ isActive: false })
        .where(
          and(eq(collections.isActive, true), eq(collections.orgId, orgId)),
        );

      await tx.insert(collections).values({
        name,
        isActive: true,
        orgId,
        gameId,
        lang: lang || "en",
        matchAllLanguages: matchAllLanguages === true,
      });

      return loadCollections(tx, orgId);
    });
    if (result.success) emitToOrg(orgId, "collections_changed", {});
    return c.json(result);
  },
);
