import { formatPrice, type PlayingCard } from "@magic-vault/shared";
import { and, count, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "../db";
import {
  cardPrices,
  collectionCards,
  collections,
  games,
} from "../db/schema";
import {
  collectionCardPriceSql,
  collectionCardPricesJoinOn,
} from "./card-price-sql";
import { resolveImageUrl } from "./discord";
import type { BotCollectionStats } from "./interfaces/bot";
import { loadOrgPricing } from "./price-source";

export async function loadBotCollectionStats(
  orgId: string,
  collection: { id: number; name: string } | null,
): Promise<BotCollectionStats> {
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
  return {
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
  };
}
