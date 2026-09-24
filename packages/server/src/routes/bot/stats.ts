import { count, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db";
import { collectionCards, collections } from "../../db/schema";
import type { AppEnv } from "../../middleware/auth";
import { resolveOrgByGuild, resolveOrgCollection } from "./shared";

export const botStatsRoute = new Hono<AppEnv>().get("/stats", async (c) => {
  const guildId = c.req.query("guildId");
  const collectionGuid = c.req.query("collection");
  if (!guildId) {
    return c.json({ success: false, message: "guildId is required." }, 400);
  }
  const orgId = await resolveOrgByGuild(guildId);
  if (!orgId) {
    return c.json({ success: false, message: "not_linked" }, 404);
  }

  const collection = collectionGuid
    ? await resolveOrgCollection(orgId, collectionGuid)
    : null;
  if (collectionGuid && !collection) {
    return c.json({ success: false, message: "collection_not_found" }, 404);
  }

  const scopeCondition = collection
    ? eq(collections.id, collection.id)
    : eq(collections.orgId, orgId);

  const [row] = await db
    .select({
      collectionCount: sql<number>`count(distinct ${collections.id})`,
      cardCount: count(collectionCards.id),
      totalValue: sql<
        string | null
      >`sum((${collectionCards.card}->>'price')::numeric)`,
    })
    .from(collections)
    .leftJoin(collectionCards, eq(collectionCards.collectionId, collections.id))
    .where(scopeCondition);

  return c.json({
    success: true,
    data: {
      collectionCount: Number(row?.collectionCount ?? 0),
      cardCount: Number(row?.cardCount ?? 0),
      totalValue: row?.totalValue ? Number(row.totalValue) : 0,
      collectionName: collection?.name,
    },
  });
});
