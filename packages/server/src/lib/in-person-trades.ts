import {
  PRICE_SOURCE_FIELDS,
  pickedCardLanguage,
  toTradeOfferCardOption,
  tradeOfferCardImageUrl,
  type InPersonTradeQuoteRequest,
  type InPersonTradeRequest,
  type PlayingCard,
  type PlayingCardWithDistance,
  type TradeOfferOfferedCard,
  type TradeOfferQuote,
  type TradeOfferWantedCard,
} from "@magic-vault/shared";
import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import type { Transaction } from "../db";
import { collectionCards, collections, games, tradeOffers } from "../db/schema";
import { selectStoredCards, toStoredCards } from "../routes/storage-locations/shared";
import { logActivity } from "./activity-log";
import { resolveCardSearchForGame } from "./card-search/resolve";
import { searchCardsByIds } from "./card-search/stored-cards";
import { findOpenIntakeLotId } from "./intake";
import type {
  InPersonTradeCollection,
  RecordInPersonTradeInput,
  RecordInPersonTradeResult,
} from "./interfaces/in-person-trades";
import { inventoryCardSql } from "./inventory-sql";
import { notReservedByOpenPicksSql } from "./order-reservations";
import { loadOrgPricing } from "./price-source";
import { toSavedCardSnapshots } from "./saved-cards";
import { uuidArraySql } from "./sql-arrays";
import {
  offeredCardPrices,
  removeTradeOfferWantedCards,
  storedCardPrice,
  sumPrices,
} from "./trade-offers";

async function loadGivenStoredCards(tx: Transaction, orgId: string, scanIds: string[]) {
  const uniqueScanIds = [...new Set(scanIds)];
  const rows = await selectStoredCards(tx).where(
    and(
      sql`${collectionCards.guid} = ANY(${uuidArraySql(uniqueScanIds)})`,
      eq(collectionCards.orgId, orgId),
      eq(collections.orgId, orgId),
      eq(collections.isDeleted, false),
      inventoryCardSql(),
      notReservedByOpenPicksSql(orgId, sql`${collectionCards.guid}`),
    ),
  );
  return { rows, stored: await toStoredCards(rows, false), uniqueScanIds };
}

async function findReceiveCollection(
  tx: Transaction,
  orgId: string,
  collectionGuid: string | undefined,
): Promise<InPersonTradeCollection | null> {
  if (!collectionGuid) return null;
  const [collection] = await tx
    .select({
      id: collections.id,
      guid: collections.guid,
      lang: collections.lang,
      gameKey: games.key,
    })
    .from(collections)
    .innerJoin(games, eq(games.id, collections.gameId))
    .where(
      and(
        eq(collections.guid, collectionGuid),
        eq(collections.orgId, orgId),
        eq(collections.isDeleted, false),
      ),
    )
    .limit(1);
  return collection ?? null;
}

async function loadReceivedCatalogCards(
  collection: InPersonTradeCollection | null,
  received: InPersonTradeQuoteRequest["received"],
): Promise<Map<string, PlayingCard>> {
  if (!collection || received.length === 0) return new Map();
  const resolved = resolveCardSearchForGame(collection.gameKey, collection.lang);
  if (!resolved) return new Map();
  return searchCardsByIds(resolved, [...new Set(received.map((card) => card.cardId))]);
}

function receivedAsOfferedInputs(
  collection: InPersonTradeCollection | null,
  received: InPersonTradeQuoteRequest["received"],
) {
  return received.map((card) => ({
    ...card,
    gameKey: collection?.gameKey ?? "",
    lang: collection?.lang ?? "",
  }));
}

function catalogCardsByOfferedKey(
  collection: InPersonTradeCollection | null,
  cards: Map<string, PlayingCard>,
): Map<string, PlayingCard> {
  if (!collection) return new Map();
  return new Map(
    [...cards].map(([cardId, card]) => [`${collection.gameKey}|${collection.lang}|${cardId}`, card]),
  );
}

export async function quoteInPersonTrade(
  tx: Transaction,
  orgId: string,
  request: InPersonTradeQuoteRequest,
): Promise<TradeOfferQuote> {
  const pricing = await loadOrgPricing(tx, orgId);
  const collection = await findReceiveCollection(tx, orgId, request.receiveCollectionGuid);
  const [{ stored }, catalogCards] = await Promise.all([
    loadGivenStoredCards(tx, orgId, request.givenScanIds),
    loadReceivedCatalogCards(collection, request.received),
  ]);
  const storedByScanId = new Map(stored.map((entry) => [entry.scanId, entry]));
  const wantedPrices = request.givenScanIds.map((scanId) => {
    const entry = storedByScanId.get(scanId);
    return entry ? storedCardPrice(entry, pricing) : null;
  });
  const offeredPrices = offeredCardPrices(
    receivedAsOfferedInputs(collection, request.received),
    catalogCardsByOfferedKey(collection, catalogCards),
    pricing,
  );
  return {
    priceSource: pricing.source,
    wantedPrices,
    offeredPrices,
    wantedValue: sumPrices(wantedPrices),
    offeredCardsValue: sumPrices(offeredPrices),
  };
}

export async function recordInPersonTrade(
  tx: Transaction,
  input: RecordInPersonTradeInput,
): Promise<RecordInPersonTradeResult> {
  const { orgId, userId, request } = input;
  const pricing = await loadOrgPricing(tx, orgId);
  const currency = PRICE_SOURCE_FIELDS[pricing.source].currency;
  const collection = await findReceiveCollection(tx, orgId, request.receiveCollectionGuid);
  if (request.received.length > 0 && !collection) return { status: "collection-not-found" };

  const given = await loadGivenStoredCards(tx, orgId, request.givenScanIds);
  if (given.rows.length !== given.uniqueScanIds.length) return { status: "given-not-found" };
  const givenCards: TradeOfferWantedCard[] = given.stored.map((entry, index) => ({
    scanId: entry.scanId,
    gameKey: given.rows[index].gameKey,
    name: entry.card.name,
    setCode: entry.card.set,
    setName: entry.card.setName,
    collectorNumber: entry.card.collectorNumber,
    imageUrl: tradeOfferCardImageUrl(entry.card),
    condition: entry.condition,
    isFoil: entry.isFoil,
    foilType: entry.foilType,
    priceAtTrade: storedCardPrice(entry, pricing),
  }));

  const catalogCards = await loadReceivedCatalogCards(collection, request.received);
  const receivedCards: TradeOfferOfferedCard[] = [];
  for (const card of request.received) {
    const catalogCard = catalogCards.get(card.cardId);
    if (!catalogCard || !collection) return { status: "received-not-found" };
    receivedCards.push({
      ...toTradeOfferCardOption(catalogCard, collection.gameKey),
      lang: collection.lang,
      quantity: card.quantity,
      condition: card.condition,
      isFoil: card.isFoil,
    });
  }

  const cashAmount = request.cashAmount ? Math.round(request.cashAmount * 100) / 100 : null;
  const receivesCash = cashAmount != null && request.cashDirection === "received";
  const givesCash = cashAmount != null && request.cashDirection === "given";
  const respondedAt = new Date();
  const [created] = await tx
    .insert(tradeOffers)
    .values({
      orgId,
      linkKind: "inPerson",
      collectionId: collection?.id ?? null,
      storageLocationId: null,
      guestName: request.partnerName,
      guestContact: request.partnerContact,
      guestNote: request.note || null,
      guestKeyHash: "",
      guestUserId: null,
      wantedCards: givenCards,
      offeredCards: receivedCards,
      offeredCashAmount: receivesCash ? cashAmount : null,
      offeredCashCurrency: receivesCash ? currency : null,
      givenCashAmount: givesCash ? cashAmount : null,
      givenCashCurrency: givesCash ? currency : null,
      status: "accepted",
      respondedAt,
      respondedByUserId: userId,
    })
    .returning({ guid: tradeOffers.guid });

  const removal = await removeTradeOfferWantedCards(tx, {
    orgId,
    userId,
    tradeOfferGuid: created.guid,
    guestName: request.partnerName,
    scanIds: givenCards.map((card) => card.scanId),
  });

  const addedScanIds: string[] = [];
  if (collection && request.received.length > 0) {
    const intakeLotId = await findOpenIntakeLotId(tx, collection.id);
    const rows = [];
    for (const card of request.received) {
      const catalogCard = catalogCards.get(card.cardId)!;
      const added: PlayingCardWithDistance = { ...catalogCard, distance: 0, confidence: 1 };
      const saved = await toSavedCardSnapshots(
        { gameKey: collection.gameKey, lang: collection.lang },
        added,
        null,
      );
      for (let copy = 0; copy < card.quantity; copy += 1) {
        const scanId = randomUUID();
        addedScanIds.push(scanId);
        rows.push({
          guid: scanId,
          collectionId: collection.id,
          cardId: added.id,
          card: saved.card,
          scannedAt: respondedAt,
          isFoil: card.isFoil,
          condition: card.condition,
          language: pickedCardLanguage(added),
          isReviewed: true,
          scannedByUserId: userId,
          intakeLotId,
          orgId,
        });
      }
    }
    await tx.insert(collectionCards).values(rows);
    await tx
      .update(collections)
      .set({ updatedAt: respondedAt })
      .where(eq(collections.id, collection.id));
  }

  await logActivity(tx, {
    orgId,
    userId,
    action: "trade.recorded",
    summary: request.partnerName || null,
    details: {
      tradeOfferGuid: created.guid,
      givenCount: givenCards.length,
      receivedCount: addedScanIds.length,
    },
  });

  return {
    status: "recorded",
    guid: created.guid,
    removal,
    receiveCollectionGuid: collection?.guid ?? null,
    addedCount: addedScanIds.length,
  };
}
