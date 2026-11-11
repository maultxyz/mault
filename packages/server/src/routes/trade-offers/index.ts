import {
  TRADE_OFFERS_CHANGED_EVENT,
  TRADE_OFFER_STATUSES,
  type TradeOfferStatus,
  type TradeOffersChangedEvent,
} from "@magic-vault/shared";
import { Hono, type Context } from "hono";
import { authQuery } from "../../db";
import { TRADE_OFFER_NOT_PENDING_MESSAGE } from "../../lib/constants/trade-offers";
import { deleteScanImages } from "../../lib/scan-images";
import {
  emitCollectionCardsChanged,
  emitToOrg,
  emitToSession,
} from "../../lib/session-stream";
import { listOwnerTradeOffers, respondToTradeOffer } from "../../lib/trade-offers";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

async function respond(
  c: Context<AppEnv>,
  status: Exclude<TradeOfferStatus, "pending">,
) {
  const orgId = c.get("orgId");
  const response = await authQuery(c.get("jwtClaims"), (tx) =>
    respondToTradeOffer(tx, orgId, c.req.param("guid") ?? "", status, c.get("userId")),
  );
  if (!response) {
    return c.json({ success: false, message: TRADE_OFFER_NOT_PENDING_MESSAGE }, 404);
  }
  deleteScanImages(response.imageKeys);
  const scanIdsByCollection = new Map<string, string[]>();
  for (const card of response.removedCards) {
    scanIdsByCollection.set(card.collectionGuid, [
      ...(scanIdsByCollection.get(card.collectionGuid) ?? []),
      card.scanId,
    ]);
  }
  for (const [collectionGuid, scanIds] of scanIdsByCollection) {
    emitToSession(collectionGuid, "cards_removed", { scanIds });
    emitCollectionCardsChanged(orgId, collectionGuid);
  }
  const changed: TradeOffersChangedEvent = { createdOffer: null };
  emitToOrg(orgId, TRADE_OFFERS_CHANGED_EVENT, changed);
  return c.json({ success: true, data: { removedCount: response.removedCards.length } });
}

export const tradeOffersRouter = new Hono<AppEnv>()
  .get("/", requireAuth, requireOrg, async (c) => {
    const requested = c.req.query("status");
    const status = (TRADE_OFFER_STATUSES as readonly string[]).includes(requested ?? "")
      ? (requested as TradeOfferStatus)
      : null;
    const data = await authQuery(c.get("jwtClaims"), (tx) =>
      listOwnerTradeOffers(tx, c.get("orgId"), status),
    );
    return c.json({ success: true, data });
  })
  .post("/:guid/accept", requireAuth, requireOrg, (c) => respond(c, "accepted"))
  .post("/:guid/decline", requireAuth, requireOrg, (c) => respond(c, "declined"));
