import {
  TRADE_OFFER_PENDING_PER_GUEST_MAX,
  cardPriceFor,
  type StorageLocationCard,
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
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import type { Transaction } from "../db";
import {
  collectionCards,
  collections,
  storageLocations,
  tradeOffers,
} from "../db/schema";
import {
  selectStoredCards,
  toStoredCards,
} from "../routes/storage-locations/shared";
import { logActivity } from "./activity-log";
import { loadOrgPricing } from "./price-source";
import { resolveCardSearchForGame } from "./card-search/resolve";
import { searchCards, searchCardsByIds } from "./card-search/stored-cards";
import type {
  CreateTradeOfferInput,
  CreateTradeOfferResult,
  TradeOfferResponse,
  TradeOfferRow,
  TradeOfferScope,
} from "./interfaces/trade-offers";
import { uuidArraySql } from "./sql-arrays";

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
    groups.set(key, [...(groups.get(key) ?? []), entry]);
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
  const wanted = await loadWantedCards(tx, scope, request.wantedScanIds);
  if (!wanted) return { status: "wanted-not-found" };
  const offered = await loadOfferedCards(request.offered);
  if (!offered) return { status: "offered-not-found" };
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
      wantedCards: wanted,
      offeredCards: offered,
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
      },
    },
  };
}

function toPublicTradeOffer(row: TradeOfferRow): PublicTradeOffer {
  return {
    guid: row.guid,
    status: row.status as TradeOfferStatus,
    wanted: row.wantedCards as TradeOfferWantedCard[],
    offered: row.offeredCards as TradeOfferOfferedCard[],
    createdAt: row.createdAt.toISOString(),
    respondedAt: row.respondedAt ? row.respondedAt.toISOString() : null,
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
): Promise<Map<string, StorageLocationCard>> {
  if (scanIds.length === 0) return new Map();
  const rows = await selectStoredCards(tx).where(
    and(
      sql`${collectionCards.guid} = ANY(${uuidArraySql([...new Set(scanIds)])})`,
      eq(collections.orgId, orgId),
    ),
  );
  const stored = await toStoredCards(rows, false);
  return new Map(stored.map((entry) => [entry.scanId, entry]));
}

async function loadCurrentOfferedCards(
  offered: TradeOfferOfferedCard[],
): Promise<Map<string, PlayingCard>> {
  const groups = new Map<string, TradeOfferOfferedCard[]>();
  for (const card of offered) {
    const key = `${card.gameKey}|${card.lang}`;
    groups.set(key, [...(groups.get(key) ?? []), card]);
  }
  const result = new Map<string, PlayingCard>();
  for (const entries of groups.values()) {
    const resolved = resolveCardSearchForGame(entries[0].gameKey, entries[0].lang);
    if (!resolved) continue;
    const found = await searchCardsByIds(resolved, [...new Set(entries.map((entry) => entry.cardId))]);
    for (const [cardId, card] of found) {
      result.set(`${entries[0].gameKey}|${entries[0].lang}|${cardId}`, card);
    }
  }
  return result;
}

function sumPrices(prices: (number | null)[]): number {
  return Math.round(prices.reduce<number>((sum, price) => sum + (price ?? 0), 0) * 100) / 100;
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
  const wantedCards = await loadCurrentWantedCards(
    tx,
    orgId,
    offers.flatMap((entry) => entry.public.wanted.map((card) => card.scanId)),
  );
  const offeredCards = await loadCurrentOfferedCards(
    offers.flatMap((entry) => entry.public.offered),
  );
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
      offeredPrices,
      wantedValue: sumPrices(wantedPrices),
      offeredValue: sumPrices(offeredPrices),
      priceSource: pricing.source,
      guestName: offer.guestName,
      guestContact: offer.guestContact,
      guestNote: offer.guestNote,
      linkKind: offer.linkKind as TradeOffer["linkKind"],
      sourceName: collectionName ?? locationName ?? null,
    };
  });
}

export async function respondToTradeOffer(
  tx: Transaction,
  orgId: string,
  guid: string,
  status: Exclude<TradeOfferStatus, "pending">,
  userId: string,
): Promise<TradeOfferResponse | null> {
  const [updated] = await tx
    .update(tradeOffers)
    .set({ status, respondedAt: new Date(), respondedByUserId: userId })
    .where(
      and(
        eq(tradeOffers.orgId, orgId),
        eq(tradeOffers.guid, guid),
        eq(tradeOffers.status, "pending"),
      ),
    )
    .returning({ wantedCards: tradeOffers.wantedCards, guestName: tradeOffers.guestName });
  if (!updated) return null;
  if (status !== "accepted") return { removedCards: [], imageKeys: [] };
  const scanIds = (updated.wantedCards as TradeOfferWantedCard[]).map((card) => card.scanId);
  const removed = await tx
    .delete(collectionCards)
    .where(
      and(
        sql`${collectionCards.guid} = ANY(${uuidArraySql(scanIds)})`,
        eq(collectionCards.orgId, orgId),
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
    orgId,
    userId,
    action: "cards.deleted",
    summary: updated.guestName,
    details: { count: removed.length, tradeOfferGuid: guid },
  });
  return {
    removedCards: removed.flatMap((row) => {
      const collectionGuid = collectionGuidById.get(row.collectionId);
      return row.scanId && collectionGuid ? [{ scanId: row.scanId, collectionGuid }] : [];
    }),
    imageKeys: removed.flatMap((row) => [row.imageKey, row.backImageKey]),
  };
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
