import {
  DEFAULT_ORG_PRICING,
  PRICE_SOURCE_FIELDS,
  type CardValueMetrics,
} from "@magic-vault/shared";
import { and, eq, isNotNull, or, sql } from "drizzle-orm";
import { db } from "../db";
import {
  cardPrices,
  collectionCards,
  collections,
  games,
} from "../db/schema";
import { createCachedValue } from "./cached-value";
import {
  collectionCardPriceSql,
  collectionCardPricesJoinOn,
} from "./card-price-sql";

async function computeCardValueMetrics(): Promise<CardValueMetrics> {
  const cardPrice = collectionCardPriceSql(DEFAULT_ORG_PRICING);
  const [row] = await db
    .select({ totalValue: sql<number | null>`sum(${cardPrice})` })
    .from(collectionCards)
    .innerJoin(collections, eq(collections.id, collectionCards.collectionId))
    .innerJoin(games, eq(games.id, collections.gameId))
    .leftJoin(cardPrices, collectionCardPricesJoinOn())
    .where(
      and(
        eq(collections.isDeleted, false),
        or(
          isNotNull(collectionCards.capturedImageKey),
          isNotNull(collectionCards.capturedImageDataUrl),
        ),
      ),
    );
  return {
    totalCardValue: Math.round(Number(row?.totalValue ?? 0)),
    totalCardValueCurrency:
      PRICE_SOURCE_FIELDS[DEFAULT_ORG_PRICING.source].currency,
  };
}

export const cardValueMetricsCache = createCachedValue("publicMetrics.cardValue", computeCardValueMetrics);
