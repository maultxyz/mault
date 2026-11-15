import {
  OUTGOING_TRADE_OFFERS_LIST_MAX,
  type OutgoingTradeOffer,
  type PublicTradeOffer,
  type TradeOfferLinkKind,
  type TradeOfferOfferedCard,
  type TradeOfferStatus,
  type TradeOfferWantedCard,
} from "@magic-vault/shared";
import { and, desc, eq, isNull, type SQL } from "drizzle-orm";
import type { Transaction } from "../db";
import { collections, storageLocations, tradeOffers } from "../db/schema";
import type { ClaimGuestTradeOffersInput, TradeOfferRow } from "./interfaces/trade-offers";

export function toPublicTradeOffer(row: TradeOfferRow): PublicTradeOffer {
  return {
    guid: row.guid,
    status: row.status as TradeOfferStatus,
    wanted: row.wantedCards as TradeOfferWantedCard[],
    offered: row.offeredCards as TradeOfferOfferedCard[],
    offeredCash:
      row.offeredCashAmount != null && row.offeredCashCurrency
        ? { amount: row.offeredCashAmount, currency: row.offeredCashCurrency }
        : null,
    createdAt: row.createdAt.toISOString(),
    respondedAt: row.respondedAt ? row.respondedAt.toISOString() : null,
  };
}

export function toOutgoingTradeOffer(row: TradeOfferRow, sentToName: string | null): OutgoingTradeOffer {
  return {
    ...toPublicTradeOffer(row),
    linkKind: row.linkKind as TradeOfferLinkKind,
    sentToName,
    guestName: row.guestName,
    guestContact: row.guestContact,
    guestNote: row.guestNote,
  };
}

export function outgoingTradeOffersFilter(guestUserId: string): SQL {
  return eq(tradeOffers.guestUserId, guestUserId);
}

export function claimableGuestTradeOffersFilter(guestKeyHash: string): SQL {
  return and(eq(tradeOffers.guestKeyHash, guestKeyHash), isNull(tradeOffers.guestUserId)) as SQL;
}

export async function listOutgoingTradeOffers(
  tx: Transaction,
  guestUserId: string,
): Promise<OutgoingTradeOffer[]> {
  const rows = await tx
    .select({
      offer: tradeOffers,
      collectionName: collections.name,
      locationName: storageLocations.name,
    })
    .from(tradeOffers)
    .leftJoin(
      collections,
      and(
        eq(collections.id, tradeOffers.collectionId),
        eq(collections.orgId, tradeOffers.orgId),
        eq(collections.isDeleted, false),
      ),
    )
    .leftJoin(
      storageLocations,
      and(
        eq(storageLocations.id, tradeOffers.storageLocationId),
        eq(storageLocations.orgId, tradeOffers.orgId),
        eq(storageLocations.isDeleted, false),
      ),
    )
    .where(outgoingTradeOffersFilter(guestUserId))
    .orderBy(desc(tradeOffers.createdAt))
    .limit(OUTGOING_TRADE_OFFERS_LIST_MAX);
  return rows.map((row) =>
    toOutgoingTradeOffer(row.offer, row.collectionName ?? row.locationName ?? null),
  );
}

export async function claimGuestTradeOffers(
  tx: Transaction,
  input: ClaimGuestTradeOffersInput,
): Promise<number> {
  const claimed = await tx
    .update(tradeOffers)
    .set({ guestUserId: input.guestUserId })
    .where(claimableGuestTradeOffersFilter(input.guestKeyHash))
    .returning({ id: tradeOffers.id });
  return claimed.length;
}
