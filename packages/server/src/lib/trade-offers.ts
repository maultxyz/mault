import {
  PRICE_SOURCE_FIELDS,
  TRADE_OFFER_PENDING_PER_GUEST_MAX,
  cardPriceFor,
  tradeOfferOfferedCash,
  initialTradeOfferPickScanIds,
  splitTradeOfferPickScanIds,
  type PlayingCard,
  type PublicTradeOffer,
  type TradeOffer,
  type TradeOfferCardOption,
  type TradeOfferCardOptionPage,
  type TradeOfferOfferedCard,
  type TradeOfferRequest,
  type TradeOfferStatus,
  type TradeOfferWantedCard,
} from "@magic-vault/shared";
import { and, count, desc, eq, gt, inArray, sql } from "drizzle-orm";
import type { Transaction } from "../db";
import {
  collectionCards,
  collections,
  storageLocations,
  tradeOffers,
} from "../db/schema";
import {
  selectStoredCards,
  selectStoredCardsWithPlacements,
  toStoredCards,
} from "../routes/storage-locations/shared";
import { logActivity } from "./activity-log";
import { toPublicTradeOffer } from "./guest-trade-offers";
import { loadOrgPricing } from "./price-source";
import { resolveCardSearchForGame } from "./card-search/resolve";
import { searchCards, searchCardsByIds } from "./card-search/stored-cards";
import type {
  CreateTradeOfferInput,
  CurrentTradeOfferWantedCards,
  CreateTradeOfferResult,
  PickTradeOfferCardsInput,
  PickTradeOfferCardsResult,
  RemoveTradeOfferWantedCardsInput,
  RespondToTradeOfferInput,
  TradeOfferResponse,
  TradeOfferScope,
} from "./interfaces/trade-offers";
import { notReservedByOpenPicksSql } from "./order-reservations";
import { uuidArraySql } from "./sql-arrays";
import {
  TRADE_OFFER_PENDING_PER_ORG_HOURLY_MAX,
  TRADE_OFFER_PENDING_PER_ORG_WINDOW_MS,
} from "./constants/trade-offers";

function scopeColumns(scope: TradeOfferScope) {
  return scope.kind === "collection"
    ? { collectionId: scope.collectionId, storageLocationId: null }
    : { collectionId: null, storageLocationId: scope.locationId };
}

function scopeTradeOffersSql(scope: TradeOfferScope) {
  return scope.kind === "collection"
    ? eq(tradeOffers.collectionId, scope.collectionId)
    : eq(tradeOffers.storageLocationId, scope.locationId);
}

function cardImageUrl(card: Pick<PlayingCard, "image">): string | null {
  return card.image?.small || card.image?.normal || null;
}

export function toTradeOfferCardOption(card: PlayingCard, gameKey: string): TradeOfferCardOption {
  return {
    gameKey,
    lang: card.lang ?? "en",
    cardId: card.id,
    name: card.name,
    setCode: card.set,
    setName: card.setName,
    collectorNumber: card.collectorNumber,
    imageUrl: cardImageUrl(card),
  };
}

async function loadWantedCards(
  tx: Transaction,
  scope: TradeOfferScope,
  scanIds: string[],
): Promise<TradeOfferWantedCard[] | null> {
  const uniqueScanIds = [...new Set(scanIds)];
  const rows = await selectStoredCards(tx).where(
    and(
      sql`${collectionCards.guid} = ANY(${uuidArraySql(uniqueScanIds)})`,
      eq(collections.orgId, scope.orgId),
      eq(collections.isDeleted, false),
      scope.kind === "collection"
        ? eq(collectionCards.collectionId, scope.collectionId)
        : eq(collectionCards.locationId, scope.locationId),
      notReservedByOpenPicksSql(scope.orgId, sql`${collectionCards.guid}`),
    ),
  );
  if (rows.length !== uniqueScanIds.length) return null;
  const stored = await toStoredCards(rows, false);
  return stored.map((entry, index) => ({
    scanId: entry.scanId,
    gameKey: rows[index].gameKey,
    name: entry.card.name,
    setCode: entry.card.set,
    setName: entry.card.setName,
    collectorNumber: entry.card.collectorNumber,
    imageUrl: cardImageUrl(entry.card),
    condition: entry.condition,
    isFoil: entry.isFoil,
    foilType: entry.foilType,
  }));
}

async function loadOfferedCards(
  offered: TradeOfferRequest["offered"],
): Promise<TradeOfferOfferedCard[] | null> {
  const groups = new Map<string, TradeOfferRequest["offered"]>();
  for (const entry of offered) {
    const key = `${entry.gameKey}|${entry.lang}`;
    const existingEntries = groups.get(key);
    if (existingEntries) existingEntries.push(entry);
    else groups.set(key, [entry]);
  }
  const cardsByKey = new Map<string, PlayingCard>();
  for (const entries of groups.values()) {
    const resolved = resolveCardSearchForGame(entries[0].gameKey, entries[0].lang);
    if (!resolved) return null;
    const found = await searchCardsByIds(
      resolved,
      entries.map((entry) => entry.cardId),
    );
    for (const [cardId, card] of found) {
      cardsByKey.set(`${entries[0].gameKey}|${entries[0].lang}|${cardId}`, card);
    }
  }
  const result: TradeOfferOfferedCard[] = [];
  for (const entry of offered) {
    const card = cardsByKey.get(`${entry.gameKey}|${entry.lang}|${entry.cardId}`);
    if (!card) return null;
    result.push({
      ...toTradeOfferCardOption(card, entry.gameKey),
      lang: entry.lang,
      quantity: entry.quantity,
      condition: entry.condition,
      isFoil: entry.isFoil,
    });
  }
  return result;
}

export async function createTradeOffer(
  tx: Transaction,
  input: CreateTradeOfferInput,
): Promise<CreateTradeOfferResult> {
  const { scope, request } = input;
  const [pending] = await tx
    .select({ total: count() })
    .from(tradeOffers)
    .where(
      and(
        eq(tradeOffers.orgId, scope.orgId),
        eq(tradeOffers.guestKeyHash, input.guestKeyHash),
        eq(tradeOffers.status, "pending"),
      ),
    );
  if ((pending?.total ?? 0) >= TRADE_OFFER_PENDING_PER_GUEST_MAX) {
    return { status: "guest-limit-reached" };
  }
  const [recentPendingForOrg] = await tx
    .select({ total: count() })
    .from(tradeOffers)
    .where(
      and(
        eq(tradeOffers.orgId, scope.orgId),
        eq(tradeOffers.status, "pending"),
        gt(
          tradeOffers.createdAt,
          new Date(Date.now() - TRADE_OFFER_PENDING_PER_ORG_WINDOW_MS),
        ),
      ),
    );
  if (
    (recentPendingForOrg?.total ?? 0) >= TRADE_OFFER_PENDING_PER_ORG_HOURLY_MAX
  ) {
    return { status: "guest-limit-reached" };
  }
  const wanted = await loadWantedCards(tx, scope, request.wantedScanIds);
  if (!wanted) return { status: "wanted-not-found" };
  const offered = await loadOfferedCards(request.offered);
  if (!offered) return { status: "offered-not-found" };
  const offeredCash = request.offeredCashAmount
    ? {
        amount: Math.round(request.offeredCashAmount * 100) / 100,
        currency: PRICE_SOURCE_FIELDS[(await loadOrgPricing(tx, scope.orgId)).source].currency,
      }
    : null;
  const [created] = await tx
    .insert(tradeOffers)
    .values({
      orgId: scope.orgId,
      linkKind: scope.kind,
      ...scopeColumns(scope),
      guestName: request.guestName,
      guestContact: request.guestContact,
      guestNote: request.guestNote || null,
      guestKeyHash: input.guestKeyHash,
      guestUserId: input.guestUserId,
      wantedCards: wanted,
      offeredCards: offered,
      offeredCashAmount: offeredCash?.amount ?? null,
      offeredCashCurrency: offeredCash?.currency ?? null,
    })
    .returning({ guid: tradeOffers.guid });
  return {
    status: "created",
    guid: created.guid,
    changed: {
      createdOffer: {
        guestName: request.guestName,
        wantedCount: wanted.length,
        offeredCount: offered.reduce((sum, card) => sum + card.quantity, 0),
        offeredCash,
      },
    },
  };
}

export async function listGuestTradeOffers(
  tx: Transaction,
  scope: TradeOfferScope,
  guestKeyHash: string,
): Promise<PublicTradeOffer[]> {
  const rows = await tx
    .select()
    .from(tradeOffers)
    .where(
      and(
        eq(tradeOffers.orgId, scope.orgId),
        eq(tradeOffers.guestKeyHash, guestKeyHash),
        scopeTradeOffersSql(scope),
      ),
    )
    .orderBy(desc(tradeOffers.createdAt));
  return rows.map(toPublicTradeOffer);
}

async function loadCurrentWantedCards(
  tx: Transaction,
  orgId: string,
  scanIds: string[],
): Promise<CurrentTradeOfferWantedCards> {
  if (scanIds.length === 0) {
    return { cardsByScanId: new Map(), placementsByScanId: new Map() };
  }
  const rows = await selectStoredCardsWithPlacements(tx).where(
    and(
      sql`${collectionCards.guid} = ANY(${uuidArraySql([...new Set(scanIds)])})`,
      eq(collections.orgId, orgId),
      eq(collectionCards.orgId, orgId),
    ),
  );
  const stored = await toStoredCards(rows, false);
  return {
    cardsByScanId: new Map(stored.map((entry) => [entry.scanId, entry])),
    placementsByScanId: new Map(
      rows.flatMap((row) =>
        row.scanId && !row.collectionIsDeleted
          ? [
              [
                row.scanId,
                {
                  collectionName: row.collectionName,
                  storageLocationGuid: row.storageLocationGuid ?? null,
                  storageLocationName: row.storageLocationName ?? null,
                  storagePosition: row.storageLocationName != null ? row.locationPosition : null,
                  binNumber: row.storageLocationName == null && row.binEmptiedAt == null ? row.binNumber : null,
                },
              ] as const,
            ]
          : [],
      ),
    ),
  };
}

async function loadCurrentOfferedCards(
  offered: TradeOfferOfferedCard[],
): Promise<Map<string, PlayingCard>> {
  const groups = new Map<string, TradeOfferOfferedCard[]>();
  for (const card of offered) {
    const key = `${card.gameKey}|${card.lang}`;
    const existingEntries = groups.get(key);
    if (existingEntries) existingEntries.push(card);
    else groups.set(key, [card]);
  }
  const result = new Map<string, PlayingCard>();
  const foundByGroup = await Promise.all(
    [...groups.values()].map(async (entries) => {
      const resolved = resolveCardSearchForGame(entries[0].gameKey, entries[0].lang);
      if (!resolved) return null;
      const found = await searchCardsByIds(resolved, [...new Set(entries.map((entry) => entry.cardId))]);
      return { entries, found };
    }),
  );
  for (const group of foundByGroup) {
    if (!group) continue;
    for (const [cardId, card] of group.found) {
      result.set(`${group.entries[0].gameKey}|${group.entries[0].lang}|${cardId}`, card);
    }
  }
  return result;
}

function sumPrices(prices: (number | null)[]): number {
  return Math.round(prices.reduce<number>((sum, price) => sum + (price ?? 0), 0) * 100) / 100;
}

function offeredCashInCurrency(offer: PublicTradeOffer, currency: string): number | null {
  const cash = tradeOfferOfferedCash(offer);
  return cash && cash.currency === currency ? cash.amount : null;
}

export async function listOwnerTradeOffers(
  tx: Transaction,
  orgId: string,
  status: TradeOfferStatus | null,
): Promise<TradeOffer[]> {
  const rows = await tx
    .select({
      offer: tradeOffers,
      collectionName: collections.name,
      locationName: storageLocations.name,
    })
    .from(tradeOffers)
    .leftJoin(collections, eq(collections.id, tradeOffers.collectionId))
    .leftJoin(storageLocations, eq(storageLocations.id, tradeOffers.storageLocationId))
    .where(
      and(
        eq(tradeOffers.orgId, orgId),
        status ? eq(tradeOffers.status, status) : undefined,
      ),
    )
    .orderBy(desc(tradeOffers.createdAt));
  const offers = rows.map((row) => ({ ...row, public: toPublicTradeOffer(row.offer) }));
  const pricing = await loadOrgPricing(tx, orgId);
  const wantedScanIds = offers.flatMap((entry) => entry.public.wanted.map((card) => card.scanId));
  const [{ cardsByScanId: wantedCards, placementsByScanId: wantedPlacements }, offeredCards] =
    await Promise.all([
      loadCurrentWantedCards(tx, orgId, wantedScanIds),
      loadCurrentOfferedCards(offers.flatMap((entry) => entry.public.offered)),
    ]);
  return offers.map(({ offer, collectionName, locationName, public: publicOffer }) => {
    const wantedPrices = publicOffer.wanted.map((card) => {
      const current = wantedCards.get(card.scanId);
      return current
        ? cardPriceFor(
            current.card,
            { isFoil: current.isFoil, foilType: current.foilType ?? undefined, stamp: current.stamp ?? undefined },
            pricing.source,
            current.condition,
            pricing.conditionMultipliers,
          )
        : null;
    });
    const offeredPrices = publicOffer.offered.map((card) => {
      const current = offeredCards.get(`${card.gameKey}|${card.lang}|${card.cardId}`);
      const unitPrice = current
        ? cardPriceFor(current, card.isFoil, pricing.source, card.condition, pricing.conditionMultipliers)
        : null;
      return unitPrice == null ? null : Math.round(unitPrice * card.quantity * 100) / 100;
    });
    return {
      ...publicOffer,
      wantedPrices,
      wantedPlacements: publicOffer.wanted.map((card) => wantedPlacements.get(card.scanId) ?? null),
      offeredPrices,
      wantedValue: sumPrices(wantedPrices),
      offeredValue: sumPrices([
        ...offeredPrices,
        offeredCashInCurrency(publicOffer, PRICE_SOURCE_FIELDS[pricing.source].currency),
      ]),
      priceSource: pricing.source,
      guestName: offer.guestName,
      guestContact: offer.guestContact,
      guestNote: offer.guestNote,
      linkKind: offer.linkKind as TradeOffer["linkKind"],
      sourceName: collectionName ?? locationName ?? null,
      remainingPickScanIds: offer.remainingPickScanIds ?? null,
    };
  });
}

export async function removeTradeOfferWantedCards(
  tx: Transaction,
  input: RemoveTradeOfferWantedCardsInput,
): Promise<TradeOfferResponse> {
  if (input.scanIds.length === 0) return { removedCards: [], imageKeys: [] };
  const removed = await tx
    .delete(collectionCards)
    .where(
      and(
        sql`${collectionCards.guid} = ANY(${uuidArraySql(input.scanIds)})`,
        eq(collectionCards.orgId, input.orgId),
      ),
    )
    .returning({
      scanId: collectionCards.guid,
      collectionId: collectionCards.collectionId,
      imageKey: collectionCards.capturedImageKey,
      backImageKey: collectionCards.capturedBackImageKey,
    });
  if (removed.length === 0) return { removedCards: [], imageKeys: [] };
  const collectionRows = await tx
    .select({ id: collections.id, guid: collections.guid })
    .from(collections)
    .where(inArray(collections.id, [...new Set(removed.map((row) => row.collectionId))]));
  const collectionGuidById = new Map(collectionRows.map((row) => [row.id, row.guid]));
  await logActivity(tx, {
    orgId: input.orgId,
    userId: input.userId,
    action: "cards.deleted",
    summary: input.guestName,
    details: { count: removed.length, tradeOfferGuid: input.tradeOfferGuid },
  });
  return {
    removedCards: removed.flatMap((row) => {
      const collectionGuid = collectionGuidById.get(row.collectionId);
      return row.scanId && collectionGuid ? [{ scanId: row.scanId, collectionGuid }] : [];
    }),
    imageKeys: removed.flatMap((row) => [row.imageKey, row.backImageKey]),
  };
}

export async function respondToTradeOffer(
  tx: Transaction,
  input: RespondToTradeOfferInput,
): Promise<TradeOfferResponse | null> {
  const [offer] = await tx
    .select({ wantedCards: tradeOffers.wantedCards, guestName: tradeOffers.guestName })
    .from(tradeOffers)
    .where(
      and(
        eq(tradeOffers.orgId, input.orgId),
        eq(tradeOffers.guid, input.tradeOfferGuid),
        eq(tradeOffers.status, "pending"),
      ),
    )
    .for("update");
  if (!offer) return null;
  const wantedScanIds = (offer.wantedCards as TradeOfferWantedCard[]).map((card) => card.scanId);
  const defersRemovalToPickList = input.status === "accepted" && input.removeWantedCardsWhenPicked;
  await tx
    .update(tradeOffers)
    .set({
      status: input.status,
      respondedAt: new Date(),
      respondedByUserId: input.userId,
      remainingPickScanIds: defersRemovalToPickList
        ? initialTradeOfferPickScanIds(offer.wantedCards as TradeOfferWantedCard[])
        : null,
    })
    .where(and(eq(tradeOffers.orgId, input.orgId), eq(tradeOffers.guid, input.tradeOfferGuid)));
  if (input.status !== "accepted" || defersRemovalToPickList) return { removedCards: [], imageKeys: [] };
  return removeTradeOfferWantedCards(tx, {
    orgId: input.orgId,
    userId: input.userId,
    tradeOfferGuid: input.tradeOfferGuid,
    guestName: offer.guestName,
    scanIds: wantedScanIds,
  });
}

export async function pickTradeOfferCards(
  tx: Transaction,
  input: PickTradeOfferCardsInput,
): Promise<PickTradeOfferCardsResult> {
  const [offer] = await tx
    .select({
      status: tradeOffers.status,
      guestName: tradeOffers.guestName,
      remainingPickScanIds: tradeOffers.remainingPickScanIds,
    })
    .from(tradeOffers)
    .where(and(eq(tradeOffers.orgId, input.orgId), eq(tradeOffers.guid, input.tradeOfferGuid)))
    .for("update");
  if (!offer) return { status: "not-found" };
  if (offer.status !== "accepted" || !offer.remainingPickScanIds?.length) {
    return { status: "nothing-to-pick" };
  }
  const split = splitTradeOfferPickScanIds(offer.remainingPickScanIds, input.pickedScanIds);
  await tx
    .update(tradeOffers)
    .set({ remainingPickScanIds: split.remainingScanIds.length > 0 ? split.remainingScanIds : null })
    .where(and(eq(tradeOffers.orgId, input.orgId), eq(tradeOffers.guid, input.tradeOfferGuid)));
  const response = await removeTradeOfferWantedCards(tx, {
    orgId: input.orgId,
    userId: input.userId,
    tradeOfferGuid: input.tradeOfferGuid,
    guestName: offer.guestName,
    scanIds: split.pickedScanIds,
  });
  return { status: "picked", response, remainingScanIds: split.remainingScanIds };
}

export async function searchTradeOfferCards(
  gameKey: string,
  lang: string,
  query: string,
  offset: number,
): Promise<TradeOfferCardOptionPage | null> {
  const resolved = resolveCardSearchForGame(gameKey, lang);
  if (!resolved) return null;
  const result = await searchCards(resolved, query, offset);
  if (!result.success || !result.data) return { cards: [], nextOffset: null };
  return {
    cards: result.data.cards.map((card) => toTradeOfferCardOption(card, gameKey)),
    nextOffset: result.data.nextOffset,
  };
}
