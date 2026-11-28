import {
  buildCardSku,
  buildPosExportCsv,
  cardPriceFor,
  groupPosExportItems,
  POS_EXPORT_FILENAMES,
  posExportRequestSchema,
  scanLanguage,
  formatStorageSlotCode,
  PRICE_LABEL_CARDS_MAX,
  PRICE_LABEL_SOURCES,
  roundCurrency,
  toCardCondition,
  type PlayingCardWithDistance,
  type PosExportCopy,
  type PriceLabelCard,
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
import { loadCardSellPrices } from "../../lib/card-pricing";
import { hydrateSavedCards } from "../../lib/saved-cards";
import {
  markRequestAsReadOnly,
  requireAuth,
  requireOrg,
  type AppEnv,
} from "../../middleware/auth";
import { businessQuery, notFound, pricingCurrency, readJson } from "./shared";

const PRICE_LABEL_SOURCE_NOT_FOUND_MESSAGE = "Card source not found.";
const POS_EXPORT_INVALID_REQUEST_MESSAGE = "Invalid export request.";
const HTTPS_URL_PATTERN = /^https:\/\//;

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

async function loadPriceLabelCards(
  tx: Transaction,
  orgId: string,
  source: PriceLabelSource,
  guid: string,
) {
  const scope = await resolvePriceLabelScope(tx, orgId, source, guid);
  if (!scope) return null;
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
      gameName: games.name,
      locationPosition: collectionCards.locationPosition,
      locationName: storageLocations.name,
      locationBatchSize: storageLocations.batchSize,
    })
    .from(collectionCards)
    .innerJoin(collections, eq(collections.id, collectionCards.collectionId))
    .leftJoin(games, eq(games.id, collections.gameId))
    .leftJoin(
      storageLocations,
      and(
        eq(storageLocations.id, collectionCards.locationId),
        eq(storageLocations.isDeleted, false),
      ),
    )
    .where(scope.where)
    .orderBy(...scope.orderBy)
    .limit(PRICE_LABEL_CARDS_MAX);
  const pricing = await loadOrgPricing(tx, orgId);
  const sellPrices = await loadCardSellPrices(
    tx,
    orgId,
    rows.map((row) => row.scanId!),
    pricing,
  );
  const hydratedCards = await hydrateSavedCards(
    rows.map((row) => ({ gameKey: row.gameKey, lang: row.collectionLang, card: row.card })),
    { includeRaw: false },
  );
  const cards = rows.map((row, index) => {
    const card = hydratedCards[index];
    const condition = toCardCondition(row.condition);
    const language = scanLanguage({ language: row.language, card });
    const marketPrice = cardPriceFor(
      card,
      { isFoil: row.isFoil, foilType: row.foilType, stamp: row.stamp },
      pricing.source,
      condition,
      pricing.conditionMultipliers,
    );
    const labelCard: PriceLabelCard = {
      scanId: row.scanId!,
      sku: buildCardSku({
        gameKey: row.gameKey ?? "",
        cardId: card.id,
        setCode: card.set,
        collectorNumber: card.collectorNumber ?? "",
        language,
        isFoil: row.isFoil,
        foilType: row.foilType,
        stamp: row.stamp,
        condition,
      }),
      name: card.name,
      setName: card.setName,
      setCode: card.set,
      collectorNumber: card.collectorNumber,
      isFoil: row.isFoil,
      foilType: row.foilType,
      condition,
      language: row.language,
      marketPrice: marketPrice === null ? null : roundCurrency(marketPrice),
      sellPrice: sellPrices.get(row.scanId!) ?? null,
      storageCode:
        row.locationName != null && row.locationPosition != null
          ? formatStorageSlotCode(row.locationName, row.locationPosition, row.locationBatchSize)
          : null,
    };
    const imageUrl = card.image?.normal ?? null;
    return {
      labelCard,
      gameName: row.gameName ?? "",
      language,
      imageUrl: imageUrl && HTTPS_URL_PATTERN.test(imageUrl) ? imageUrl : null,
    };
  });
  return {
    sourceName: scope.sourceName,
    currency: pricingCurrency(pricing),
    total,
    cards,
  };
}

export const priceLabelsRoute = new Hono<AppEnv>()
  .get("/price-labels/cards", requireAuth, requireOrg, (c) => {
    const source = c.req.query("source") as PriceLabelSource | undefined;
    const guid = c.req.query("guid") ?? "";
    return businessQuery(c, async (tx, access) => {
      if (access.isLocked) return BUSINESS_UPGRADE_REQUIRED_RESULT;
      if (!source || !PRICE_LABEL_SOURCES.includes(source) || !UUID_PATTERN.test(guid)) {
        return notFound(PRICE_LABEL_SOURCE_NOT_FOUND_MESSAGE);
      }
      const loaded = await loadPriceLabelCards(tx, c.get("orgId"), source, guid);
      if (!loaded) return notFound(PRICE_LABEL_SOURCE_NOT_FOUND_MESSAGE);
      const data: PriceLabelCardsResponse = {
        sourceName: loaded.sourceName,
        currency: loaded.currency,
        total: loaded.total,
        cards: loaded.cards.map((entry) => entry.labelCard),
      };
      return { success: true, data };
    });
  })
  .post("/price-labels/pos-export", requireAuth, requireOrg, markRequestAsReadOnly, async (c) => {
    const parsed = posExportRequestSchema.safeParse(await readJson(c));
    if (!parsed.success || !UUID_PATTERN.test(parsed.data.sourceGuid)) {
      return c.json({ success: false, message: POS_EXPORT_INVALID_REQUEST_MESSAGE });
    }
    const request = parsed.data;
    let csv: string | null = null;
    const response = await businessQuery(c, async (tx, access) => {
      if (access.isLocked) return BUSINESS_UPGRADE_REQUIRED_RESULT;
      const loaded = await loadPriceLabelCards(tx, c.get("orgId"), request.source, request.sourceGuid);
      if (!loaded) return notFound(PRICE_LABEL_SOURCE_NOT_FOUND_MESSAGE);
      const deselected = new Set(request.deselectedScanIds);
      const copies: PosExportCopy[] = loaded.cards
        .filter(({ labelCard }) => !deselected.has(labelCard.scanId))
        .map(({ labelCard, gameName, language, imageUrl }) => ({
          sku: labelCard.sku,
          gameName,
          name: labelCard.name,
          setName: labelCard.setName,
          setCode: labelCard.setCode,
          collectorNumber: labelCard.collectorNumber,
          condition: labelCard.condition,
          isFoil: labelCard.isFoil,
          foilType: labelCard.foilType,
          language,
          price: request.customPrices[labelCard.scanId] ?? labelCard.sellPrice,
          imageUrl,
        }));
      csv = buildPosExportCsv(request.format, groupPosExportItems(copies), {
        currency: loaded.currency,
      });
      return { success: true, data: null };
    });
    if (csv === null) return response;
    return c.body(csv, 200, {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${POS_EXPORT_FILENAMES[request.format]}"`,
    });
  });
