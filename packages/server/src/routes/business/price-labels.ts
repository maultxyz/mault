import {
  cardPriceFor,
  PRICE_LABEL_CARDS_MAX,
  PRICE_LABEL_SOURCES,
  roundCurrency,
  toCardCondition,
  type PlayingCardWithDistance,
  type PriceLabelCardsResponse,
  type PriceLabelSource,
} from "@magic-vault/shared";
import { and, asc, desc, eq, sql, type SQL } from "drizzle-orm";
import { Hono } from "hono";
import type { Transaction } from "../../db";
import {
  collectionCards,
  collections,
  games,
  storageLocations,
} from "../../db/schema";
import { cardWithStoredPricesSql } from "../../lib/card-price-sql";
import { BUSINESS_UPGRADE_REQUIRED_RESULT } from "../../lib/constants/business";
import { UUID_PATTERN } from "../../lib/constants/validation";
import { findIntakeLot, intakeLotCardsWhere } from "../../lib/intake";
import { loadOrgPricing } from "../../lib/price-source";
import { hydrateSavedCards } from "../../lib/saved-cards";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { businessQuery, notFound, pricingCurrency } from "./shared";

const PRICE_LABEL_SOURCE_NOT_FOUND_MESSAGE = "Card source not found.";

async function resolvePriceLabelScope(
  tx: Transaction,
  orgId: string,
  source: PriceLabelSource,
  guid: string,
): Promise<{ sourceName: string; where: SQL | undefined; orderBy: SQL[] } | null> {
  const newestFirst = [desc(collectionCards.scannedAt), desc(collectionCards.id)];
  if (source === "lot") {
    const lot = await findIntakeLot(tx, orgId, guid);
    if (!lot) return null;
    return {
      sourceName: lot.customerName,
      where: intakeLotCardsWhere(lot.id),
      orderBy: newestFirst,
    };
  }
  if (source === "location") {
    const location = await tx.query.storageLocations.findFirst({
      where: and(
        eq(storageLocations.guid, guid),
        eq(storageLocations.orgId, orgId),
        eq(storageLocations.isDeleted, false),
      ),
      columns: { id: true, name: true },
    });
    if (!location) return null;
    return {
      sourceName: location.name,
      where: and(
        eq(collectionCards.locationId, location.id),
        eq(collections.isDeleted, false),
      ),
      orderBy: [asc(collectionCards.locationPosition), asc(collectionCards.id)],
    };
  }
  const collection = await tx.query.collections.findFirst({
    where: and(
      eq(collections.guid, guid),
      eq(collections.orgId, orgId),
      eq(collections.isDeleted, false),
    ),
    columns: { id: true, name: true },
  });
  if (!collection) return null;
  return {
    sourceName: collection.name,
    where: eq(collectionCards.collectionId, collection.id),
    orderBy: newestFirst,
  };
}

export const priceLabelsRoute = new Hono<AppEnv>().get(
  "/price-labels/cards",
  requireAuth,
  requireOrg,
  (c) => {
    const source = c.req.query("source") as PriceLabelSource | undefined;
    const guid = c.req.query("guid") ?? "";
    return businessQuery(c, async (tx, access) => {
      if (access.isLocked) return BUSINESS_UPGRADE_REQUIRED_RESULT;
      if (!source || !PRICE_LABEL_SOURCES.includes(source) || !UUID_PATTERN.test(guid)) {
        return notFound(PRICE_LABEL_SOURCE_NOT_FOUND_MESSAGE);
      }
      const orgId = c.get("orgId");
      const scope = await resolvePriceLabelScope(tx, orgId, source, guid);
      if (!scope) return notFound(PRICE_LABEL_SOURCE_NOT_FOUND_MESSAGE);
      const [{ total }] = await tx
        .select({ total: sql<number>`count(*)::int` })
        .from(collectionCards)
        .innerJoin(collections, eq(collections.id, collectionCards.collectionId))
        .where(scope.where);
      const rows = await tx
        .select({
          scanId: collectionCards.guid,
          card: sql<PlayingCardWithDistance>`${cardWithStoredPricesSql(sql`(${collectionCards.card} - 'raw')`)}`,
          isFoil: collectionCards.isFoil,
          foilType: collectionCards.foilType,
          stamp: collectionCards.stamp,
          condition: collectionCards.condition,
          language: collectionCards.language,
          collectionLang: collections.lang,
          gameKey: games.key,
        })
        .from(collectionCards)
        .innerJoin(collections, eq(collections.id, collectionCards.collectionId))
        .leftJoin(games, eq(games.id, collections.gameId))
        .where(scope.where)
        .orderBy(...scope.orderBy)
        .limit(PRICE_LABEL_CARDS_MAX);
      const pricing = await loadOrgPricing(tx, orgId);
      const cards = await hydrateSavedCards(
        rows.map((row) => ({ gameKey: row.gameKey, lang: row.collectionLang, card: row.card })),
        { includeRaw: false },
      );
      const data: PriceLabelCardsResponse = {
        sourceName: scope.sourceName,
        currency: pricingCurrency(pricing),
        total,
        cards: rows.map((row, index) => {
          const card = cards[index];
          const condition = toCardCondition(row.condition);
          const marketPrice = cardPriceFor(
            card,
            { isFoil: row.isFoil, foilType: row.foilType, stamp: row.stamp },
            pricing.source,
            condition,
            pricing.conditionMultipliers,
          );
          return {
            scanId: row.scanId!,
            name: card.name,
            setName: card.setName,
            setCode: card.set,
            collectorNumber: card.collectorNumber,
            isFoil: row.isFoil,
            foilType: row.foilType,
            condition,
            language: row.language,
            marketPrice: marketPrice === null ? null : roundCurrency(marketPrice),
          };
        }),
      };
      return { success: true, data };
    });
  },
);
