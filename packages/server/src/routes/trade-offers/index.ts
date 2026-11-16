import {
  SHARE_LINK_GUEST_KEY_HEADER,
  TRADE_OFFERS_CHANGED_EVENT,
  TRADE_OFFER_STATUSES,
  tradeOfferAcceptRequestSchema,
  tradeOfferPickedRequestSchema,
  type ClaimOutgoingTradeOffersResult,
  type TradeOffer,
  type TradeOfferPickResult,
  type TradeOfferStatus,
  type TradeOffersChangedEvent,
} from "@magic-vault/shared";
import { Hono, type Context } from "hono";
import { authQuery, db } from "../../db";
import {
  TRADE_OFFER_CLAIM_RATE_LIMITED_MESSAGE,
  TRADE_OFFER_CLAIM_RATE_LIMIT_REQUESTS,
  TRADE_OFFER_CLAIM_RATE_LIMIT_SWEEP_SIZE,
  TRADE_OFFER_CLAIM_RATE_LIMIT_WINDOW_MS,
  TRADE_OFFER_GUEST_KEY_MESSAGE,
  TRADE_OFFER_INVALID_ACCEPT_MESSAGE,
  TRADE_OFFER_INVALID_PICKED_MESSAGE,
  TRADE_OFFER_NOTHING_TO_PICK_MESSAGE,
  TRADE_OFFER_NOT_FOUND_MESSAGE,
  TRADE_OFFER_NOT_PENDING_MESSAGE,
  OWNER_TRADE_OFFERS_CACHE_MAX_ENTRIES,
  OWNER_TRADE_OFFERS_CACHE_TTL_MS,
} from "../../lib/constants/trade-offers";
import { createOrgReadCache } from "../../lib/org-read-cache";
import { guestKeyHashFromHeader } from "../../lib/guest-keys";
import {
  claimGuestTradeOffers,
  listOutgoingTradeOffers,
} from "../../lib/guest-trade-offers";
import type { TradeOfferResponse } from "../../lib/interfaces/trade-offers";
import { createRateLimiter } from "../../lib/public-api/rate-limit";
import { deleteScanImages } from "../../lib/scan-images";
import {
  emitCollectionCardsChanged,
  emitToOrg,
  emitToSession,
} from "../../lib/session-stream";
import {
  listOwnerTradeOffers,
  pickTradeOfferCards,
  respondToTradeOffer,
} from "../../lib/trade-offers";
import {
  rejectWhileImpersonating,
  requireAuth,
  requireOrg,
  type AppEnv,
} from "../../middleware/auth";

const consumeClaimRateLimit = createRateLimiter({
  requests: TRADE_OFFER_CLAIM_RATE_LIMIT_REQUESTS,
  windowMs: TRADE_OFFER_CLAIM_RATE_LIMIT_WINDOW_MS,
  sweepSize: TRADE_OFFER_CLAIM_RATE_LIMIT_SWEEP_SIZE,
});

const ownerTradeOffersCache = createOrgReadCache<TradeOffer[]>(
  OWNER_TRADE_OFFERS_CACHE_TTL_MS,
  OWNER_TRADE_OFFERS_CACHE_MAX_ENTRIES,
);

function publishTradeOfferChanges(orgId: string, response: TradeOfferResponse) {
  deleteScanImages(response.imageKeys);
  const scanIdsByCollection = new Map<string, string[]>();
  for (const card of response.removedCards) {
    scanIdsByCollection.set(card.collectionGuid, [
      ...(scanIdsByCollection.get(card.collectionGuid) ?? []),
      card.scanId,
    ]);
  }
  for (const [collectionGuid, scanIds] of scanIdsByCollection) {
    emitToSession(orgId, collectionGuid, "cards_removed", { scanIds });
    emitCollectionCardsChanged(orgId, collectionGuid);
  }
  const changed: TradeOffersChangedEvent = { createdOffer: null };
  emitToOrg(orgId, TRADE_OFFERS_CHANGED_EVENT, changed);
}

async function respond(
  c: Context<AppEnv>,
  status: Exclude<TradeOfferStatus, "pending">,
) {
  const orgId = c.get("orgId");
  const body = await c.req.json().catch(() => ({}));
  const input = tradeOfferAcceptRequestSchema.safeParse(body ?? {});
  if (!input.success) {
    return c.json({ success: false, message: TRADE_OFFER_INVALID_ACCEPT_MESSAGE }, 400);
  }
  const response = await authQuery(c.get("jwtClaims"), (tx) =>
    respondToTradeOffer(tx, {
      orgId,
      userId: c.get("userId"),
      tradeOfferGuid: c.req.param("guid") ?? "",
      status,
      removeWantedCardsWhenPicked: input.data.removeWantedCardsWhenPicked === true,
    }),
  );
  if (!response) {
    return c.json({ success: false, message: TRADE_OFFER_NOT_PENDING_MESSAGE }, 404);
  }
  publishTradeOfferChanges(orgId, response);
  return c.json({ success: true, data: { removedCount: response.removedCards.length } });
}

async function pick(c: Context<AppEnv>, pickedScanIds: string[] | "all") {
  const orgId = c.get("orgId");
  const result = await authQuery(c.get("jwtClaims"), (tx) =>
    pickTradeOfferCards(tx, {
      orgId,
      userId: c.get("userId"),
      tradeOfferGuid: c.req.param("guid") ?? "",
      pickedScanIds,
    }),
  );
  if (result.status === "not-found") {
    return c.json({ success: false, message: TRADE_OFFER_NOT_FOUND_MESSAGE }, 404);
  }
  if (result.status === "nothing-to-pick") {
    return c.json({ success: false, message: TRADE_OFFER_NOTHING_TO_PICK_MESSAGE }, 409);
  }
  publishTradeOfferChanges(orgId, result.response);
  const data: TradeOfferPickResult = {
    removedCount: result.response.removedCards.length,
    remainingScanIds: result.remainingScanIds,
  };
  return c.json({ success: true, data });
}

export const tradeOffersRouter = new Hono<AppEnv>()
  .get("/outgoing", requireAuth, async (c) => {
    const data = await db.transaction((tx) => listOutgoingTradeOffers(tx, c.get("userId")));
    return c.json({ success: true, data });
  })
  .post("/outgoing/claim", requireAuth, rejectWhileImpersonating, async (c) => {
    const rate = consumeClaimRateLimit(c.get("userId"));
    if (!rate.allowed) {
      c.header("Retry-After", String(Math.max(Math.ceil((rate.resetAt - Date.now()) / 1000), 0)));
      return c.json({ success: false, message: TRADE_OFFER_CLAIM_RATE_LIMITED_MESSAGE }, 429);
    }
    const guestKeyHash = guestKeyHashFromHeader(c.req.header(SHARE_LINK_GUEST_KEY_HEADER));
    if (!guestKeyHash) {
      return c.json({ success: false, message: TRADE_OFFER_GUEST_KEY_MESSAGE }, 400);
    }
    const claimedCount = await db.transaction((tx) =>
      claimGuestTradeOffers(tx, { guestUserId: c.get("userId"), guestKeyHash }),
    );
    const data: ClaimOutgoingTradeOffersResult = { claimedCount };
    return c.json({ success: true, data });
  })
  .get("/", requireAuth, requireOrg, async (c) => {
    const requested = c.req.query("status");
    const status = (TRADE_OFFER_STATUSES as readonly string[]).includes(requested ?? "")
      ? (requested as TradeOfferStatus)
      : null;
    const orgId = c.get("orgId");
    const jwtClaims = c.get("jwtClaims");
    const data = await ownerTradeOffersCache.get(orgId, status ?? "all", () =>
      authQuery(jwtClaims, (tx) => listOwnerTradeOffers(tx, orgId, status)),
    );
    return c.json({ success: true, data });
  })
  .post("/:guid/accept", requireAuth, requireOrg, (c) => respond(c, "accepted"))
  .post("/:guid/decline", requireAuth, requireOrg, (c) => respond(c, "declined"))
  .post("/:guid/picked", requireAuth, requireOrg, async (c) => {
    const input = tradeOfferPickedRequestSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!input.success) {
      return c.json({ success: false, message: TRADE_OFFER_INVALID_PICKED_MESSAGE }, 400);
    }
    return pick(c, input.data.scanIds);
  })
  .post("/:guid/finish-picking", requireAuth, requireOrg, (c) => pick(c, "all"));
