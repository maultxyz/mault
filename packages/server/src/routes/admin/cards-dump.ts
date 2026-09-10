import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db";
import { cardImageVectors } from "../../db/schema";
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
    } catch {
      // no/invalid body - dump everything
    }

    if (gameKey) {
      await db
        .delete(cardImageVectors)
        .where(eq(cardImageVectors.gameKey, gameKey));
      return c.json({ success: true, message: `Cleared "${gameKey}" cards` });
    }

    await db.delete(cardImageVectors);
    return c.json({ success: true, message: "Card database cleared" });
  },
);
