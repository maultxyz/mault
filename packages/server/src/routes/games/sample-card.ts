import { PLATFORM_STAFF_ROLES } from "@magic-vault/shared";
import { and, eq, ilike, isNotNull } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db";
import { cardImageVectors } from "../../db/schema";
import { ADAPTERS_BY_GAME_KEY } from "../../lib/card-search/resolve";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";

export const sampleCardRoute = new Hono<AppEnv>().get(
  "/sample-card",
  requireAuth,
  requireRole(...PLATFORM_STAFF_ROLES),
  async (c) => {
    const key = c.req.query("key");
    const query = c.req.query("query");
    if (!key) {
      return c.json({ success: false, message: "key is required." }, 400);
    }
    if (!query?.trim()) {
      return c.json({ success: false, message: "query is required." }, 400);
    }

    const adapter = ADAPTERS_BY_GAME_KEY[key];
    if (!adapter) {
      return c.json(
        { success: false, message: `No card source for game key: ${key}` },
        400,
      );
    }

    const [stored] = await db
      .select({
        cardId: cardImageVectors.cardId,
        lang: cardImageVectors.lang,
        data: cardImageVectors.data,
      })
      .from(cardImageVectors)
      .where(
        and(
          eq(cardImageVectors.gameKey, key),
          ilike(cardImageVectors.name, `%${query.trim()}%`),
          isNotNull(cardImageVectors.data),
        ),
      )
      .limit(1);
    const storedCard = stored
      ? adapter.normalizeStored(stored.data, stored.cardId, stored.lang)
      : null;
    if (!storedCard) {
      return c.json(
        { success: false, message: "No synced card matches that name." },
        404,
      );
    }
    return c.json({
      success: true,
      data: { name: storedCard.name, raw: storedCard.raw },
    });
  },
);
