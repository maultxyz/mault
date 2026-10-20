import { formatPrice, type PlayingCard } from "@magic-vault/shared";
import { and, count, desc, eq, isNotNull, sql } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db";
import {
  cardPrices,
  collectionCards,
  collections,
  games,
} from "../../db/schema";
import {
  collectionCardPriceSql,
  collectionCardPricesJoinOn,
} from "../../lib/card-price-sql";
import { resolveImageUrl } from "../../lib/discord";
import { loadOrgPricing } from "../../lib/price-source";
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

  const pricing = await loadOrgPricing(db, orgId);
  const priceSource = pricing.source;
  const cardPrice = collectionCardPriceSql(pricing);
  const scopeCondition = collection
    ? eq(collections.id, collection.id)
    : and(eq(collections.orgId, orgId), eq(collections.isDeleted, false));

  const [row] = await db
    .select({
      collectionCount: sql<number>`count(distinct ${collections.id})`,
      cardCount: count(collectionCards.id),
      totalValue: sql<number | null>`sum(${cardPrice})`,
    })
    .from(collections)
    .leftJoin(collectionCards, eq(collectionCards.collectionId, collections.id))
    .leftJoin(games, eq(games.id, collections.gameId))
    .leftJoin(cardPrices, collectionCardPricesJoinOn())
    .where(scopeCondition);

  const [top] = await db
    .select({
      card: collectionCards.card,
      isFoil: collectionCards.isFoil,
      foilType: collectionCards.foilType,
      collectionName: collections.name,
      price: cardPrice,
    })
    .from(collectionCards)
    .innerJoin(collections, eq(collections.id, collectionCards.collectionId))
    .leftJoin(games, eq(games.id, collections.gameId))
    .leftJoin(cardPrices, collectionCardPricesJoinOn())
    .where(and(scopeCondition, isNotNull(cardPrice)))
    .orderBy(desc(cardPrice))
    .limit(1);

  const topCard = top?.card as PlayingCard | undefined;
  const totalValue = row?.totalValue ? Number(row.totalValue) : 0;
  return c.json({
    success: true,
    data: {
      collectionCount: Number(row?.collectionCount ?? 0),
      cardCount: Number(row?.cardCount ?? 0),
      totalValue,
      totalValueDisplay: formatPrice(totalValue, priceSource),
      collectionName: collection?.name,
      topCard:
        top && topCard
          ? {
              name: topCard.name,
              setName: topCard.setName || null,
              foil: top.isFoil ? (top.foilType ?? "Foil") : null,
              collectionName: top.collectionName,
              priceDisplay: formatPrice(Number(top.price), priceSource),
              imageUrl: topCard.image?.normal
                ? resolveImageUrl(topCard.image.normal)
                : null,
            }
          : null,
    },
  });
});
