import { and, count, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db";
import { collectionCards, collections } from "../../db/schema";
import type { AppEnv } from "../../middleware/auth";
import { resolveOrgByGuild } from "./shared";

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

  let collectionName: string | undefined;
  if (collectionGuid) {
    const match = await db
      .select({ name: collections.name })
      .from(collections)
      .where(
        and(eq(collections.orgId, orgId), eq(collections.guid, collectionGuid)),
      )
      .limit(1);
    if (!match[0]) {
      return c.json({ success: false, message: "collection_not_found" }, 404);
    }
    collectionName = match[0].name;
  }

  const scopeCondition = collectionGuid
    ? and(eq(collections.orgId, orgId), eq(collections.guid, collectionGuid))
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
      collectionName,
    },
  });
});
