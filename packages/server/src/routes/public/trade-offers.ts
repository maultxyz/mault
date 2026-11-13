import {
  SHARE_LINK_GUEST_KEY_HEADER,
  TRADE_OFFERS_CHANGED_EVENT,
  TRADE_OFFER_SEARCH_QUERY_MAX_LENGTH,
  tradeOfferRequestSchema,
} from "@magic-vault/shared";
import { Hono, type Context } from "hono";
import { db } from "../../db";
import { guestKeyHashFromHeader } from "../../lib/guest-keys";
import { MONITOR_LINK_INVALID_MESSAGE } from "../../lib/constants/auth";
import {
  TRADE_OFFER_GUEST_KEY_MESSAGE,
  TRADE_OFFER_GUEST_LIMIT_MESSAGE,
  TRADE_OFFER_INVALID_MESSAGE,
  TRADE_OFFER_OFFERED_NOT_FOUND_MESSAGE,
  TRADE_OFFER_UNKNOWN_GAME_MESSAGE,
  TRADE_OFFER_WANTED_NOT_FOUND_MESSAGE,
  TRADE_OFFERS_NOT_ALLOWED_MESSAGE,
} from "../../lib/constants/trade-offers";
import type { PublicTradeOfferLink } from "../../lib/interfaces/trade-offers";
import { emitToOrg } from "../../lib/session-stream";
import {
  createTradeOffer,
  listGuestTradeOffers,
  searchTradeOfferCards,
} from "../../lib/trade-offers";
import type { AppEnv } from "../../middleware/auth";

export function createPublicTradeOffersRoute(
  resolveLink: (c: Context<AppEnv>) => Promise<PublicTradeOfferLink | null>,
) {
  const invalidLink = (c: Context<AppEnv>) =>
    c.json({ success: false, message: MONITOR_LINK_INVALID_MESSAGE }, 401);
  const notTradeLink = (c: Context<AppEnv>) =>
    c.json({ success: false, message: TRADE_OFFERS_NOT_ALLOWED_MESSAGE }, 403);

  return new Hono<AppEnv>()
    .get("/trade-offers/card-search", async (c) => {
      const link = await resolveLink(c);
      if (!link) return invalidLink(c);
      if (!link.allowsTradeOffers) return notTradeLink(c);
      const query = (c.req.query("q") ?? "").trim().slice(0, TRADE_OFFER_SEARCH_QUERY_MAX_LENGTH);
      const offset = Math.max(Number.parseInt(c.req.query("offset") ?? "0", 10) || 0, 0);
      const data = await searchTradeOfferCards(
        c.req.query("game") ?? "",
        c.req.query("lang") || "en",
        query,
        offset,
      );
      if (!data) {
        return c.json({ success: false, message: TRADE_OFFER_UNKNOWN_GAME_MESSAGE }, 400);
      }
      return c.json({ success: true, data });
    })
    .get("/trade-offers", async (c) => {
      const link = await resolveLink(c);
      if (!link) return invalidLink(c);
      if (!link.allowsTradeOffers) return notTradeLink(c);
      const guestKeyHash = guestKeyHashFromHeader(c.req.header(SHARE_LINK_GUEST_KEY_HEADER));
      if (!guestKeyHash) return c.json({ success: true, data: [] });
      const data = await db.transaction((tx) =>
        listGuestTradeOffers(tx, link.scope, guestKeyHash),
      );
      return c.json({ success: true, data });
    })
    .post("/trade-offers", async (c) => {
      const link = await resolveLink(c);
      if (!link) return invalidLink(c);
      if (!link.allowsTradeOffers) return notTradeLink(c);
      const guestKeyHash = guestKeyHashFromHeader(c.req.header(SHARE_LINK_GUEST_KEY_HEADER));
      if (!guestKeyHash) {
        return c.json({ success: false, message: TRADE_OFFER_GUEST_KEY_MESSAGE }, 400);
      }
      const parsed = tradeOfferRequestSchema.safeParse(await c.req.json().catch(() => null));
      if (!parsed.success) {
        return c.json({ success: false, message: TRADE_OFFER_INVALID_MESSAGE }, 400);
      }
      const result = await db.transaction((tx) =>
        createTradeOffer(tx, { scope: link.scope, request: parsed.data, guestKeyHash }),
      );
      switch (result.status) {
        case "guest-limit-reached":
          return c.json({ success: false, message: TRADE_OFFER_GUEST_LIMIT_MESSAGE }, 429);
        case "wanted-not-found":
          return c.json({ success: false, message: TRADE_OFFER_WANTED_NOT_FOUND_MESSAGE }, 409);
        case "offered-not-found":
          return c.json({ success: false, message: TRADE_OFFER_OFFERED_NOT_FOUND_MESSAGE }, 400);
        case "created":
          emitToOrg(link.scope.orgId, TRADE_OFFERS_CHANGED_EVENT, result.changed);
          return c.json({ success: true, data: { guid: result.guid } });
      }
    });
}
