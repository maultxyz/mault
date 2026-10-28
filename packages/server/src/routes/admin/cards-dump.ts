import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db";
import { cardFinishVectors, cardImageVectors } from "../../db/schema";
import { publicGamesCache } from "../../lib/public-games";
import { getStatus } from "../../lib/sync-job";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";

export const cardsDumpRoute = new Hono<AppEnv>().post(
  "/cards/dump",
  requireAuth,
  requireRole("admin"),
  async (c) => {
    if (getStatus().status === "running") {
      return c.json(
        { success: false, message: "Cannot dump while sync is running" },
        409,
      );
    }

    let gameKey: string | undefined;
    try {
      const body = await c.req.json<{ gameKey?: string }>();
      if (body.gameKey) gameKey = body.gameKey;
    } catch {}

    if (gameKey) {
      await db
        .delete(cardImageVectors)
        .where(eq(cardImageVectors.gameKey, gameKey));
      await db
        .delete(cardFinishVectors)
        .where(eq(cardFinishVectors.gameKey, gameKey));
      publicGamesCache.invalidate();
      return c.json({ success: true, message: `Cleared "${gameKey}" cards` });
    }

    await db.delete(cardImageVectors);
    await db.delete(cardFinishVectors);
    publicGamesCache.invalidate();
    return c.json({ success: true, message: "Card database cleared" });
  },
);
