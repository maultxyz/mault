import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { collections } from "../../db/schema";
import { emitToOrg } from "../../lib/session-stream";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { collectionNameTaken, loadCollections } from "./shared";

// POST /collections — create and activate
export const addCollectionRoute = new Hono<AppEnv>().post(
  "/",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const { name, gameGuid, lang } = await c.req.json<{
      name: string;
      gameGuid?: string;
      lang?: string;
    }>();
    try {
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
        let gameId: number | null = null;
        if (gameGuid) {
          const game = await tx.query.games.findFirst({
            where: (t, { eq }) => eq(t.guid, gameGuid),
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

        await tx
          .insert(collections)
          .values({ name, isActive: true, orgId, gameId, lang: lang || "en" });

        return loadCollections(tx, orgId);
      });
      if (result.success) emitToOrg(orgId, "collections_changed", {});
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
