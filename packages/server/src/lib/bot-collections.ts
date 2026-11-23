import { and, count, desc, eq } from "drizzle-orm";
import { db } from "../db";
import { collectionCards, collections } from "../db/schema";
import { BOT_CACHE_MAX_ENTRIES, BOT_STATS_CACHE_TTL_MS } from "./constants/discord";
import type { BotCollectionListItem } from "./interfaces/bot";
import { createOrgReadCache } from "./org-read-cache";

const botCollectionListCache = createOrgReadCache<BotCollectionListItem[]>(
  "bot.collectionList",
  BOT_STATS_CACHE_TTL_MS,
  BOT_CACHE_MAX_ENTRIES,
);

async function computeBotCollectionList(orgId: string): Promise<BotCollectionListItem[]> {
  const rows = await db
    .select({
      guid: collections.guid,
      name: collections.name,
      cardCount: count(collectionCards.id),
      updatedAt: collections.updatedAt,
    })
    .from(collections)
    .leftJoin(collectionCards, eq(collectionCards.collectionId, collections.id))
    .where(and(eq(collections.orgId, orgId), eq(collections.isDeleted, false)))
    .groupBy(
      collections.id,
      collections.guid,
      collections.name,
      collections.updatedAt,
    )
    .orderBy(desc(collections.updatedAt));
  return rows.map((row) => ({
    guid: row.guid,
    name: row.name,
    cardCount: Number(row.cardCount),
  }));
}

export function loadBotCollectionList(orgId: string): Promise<BotCollectionListItem[]> {
  return botCollectionListCache.get(orgId, "collections", () =>
    computeBotCollectionList(orgId),
  );
}
