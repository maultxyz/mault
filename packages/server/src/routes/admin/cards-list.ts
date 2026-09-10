import { count, ilike } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db";
import { cardImageVectors } from "../../db/schema";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";

export const cardsListRoute = new Hono<AppEnv>().get(
  "/cards",
  requireAuth,
  requireRole("admin"),
  async (c) => {
    const page = Math.max(1, Number(c.req.query("page") ?? 1));
    const limit = Math.min(100, Math.max(1, Number(c.req.query("limit") ?? 50)));
    const search = (c.req.query("search") ?? "").trim();
    const offset = (page - 1) * limit;
    const where = search
      ? ilike(cardImageVectors.name, `%${search}%`)
      : undefined;

    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          id: cardImageVectors.id,
          cardId: cardImageVectors.cardId,
          gameKey: cardImageVectors.gameKey,
          lang: cardImageVectors.lang,
          name: cardImageVectors.name,
          setCode: cardImageVectors.setCode,
          updatedAt: cardImageVectors.updatedAt,
        })
        .from(cardImageVectors)
        .where(where)
        .orderBy(cardImageVectors.name)
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(cardImageVectors).where(where),
    ]);

    return c.json({ success: true, data: { cards: rows, total, page, limit } });
  },
);
