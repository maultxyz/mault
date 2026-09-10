import { count, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db";
import { collectionCards, collections } from "../../db/schema";
import type { AppEnv } from "../../middleware/auth";
import { resolveOrgByGuild } from "./shared";

export const botListCollectionsRoute = new Hono<AppEnv>().get("/collections", async (c) => {
  const guildId = c.req.query("guildId");
  if (!guildId) {
    return c.json({ success: false, message: "guildId is required." }, 400);
  }
  const orgId = await resolveOrgByGuild(guildId);
  if (!orgId) {
    return c.json({ success: false, message: "not_linked" }, 404);
  }

  const rows = await db
    .select({
      guid: collections.guid,
      name: collections.name,
      cardCount: count(collectionCards.id),
      updatedAt: collections.updatedAt,
    })
    .from(collections)
    .leftJoin(collectionCards, eq(collectionCards.collectionId, collections.id))
    .where(eq(collections.orgId, orgId))
    .groupBy(
      collections.id,
      collections.guid,
      collections.name,
      collections.updatedAt,
    )
    .orderBy(desc(collections.updatedAt));

  return c.json({
    success: true,
    data: rows.map((r) => ({
      guid: r.guid,
      name: r.name,
      cardCount: Number(r.cardCount),
    })),
  });
});
