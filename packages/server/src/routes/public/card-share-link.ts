import type { CardShareLinkInfo } from "@magic-vault/shared";
import { Hono, type Context } from "hono";
import { db } from "../../db";
import { verifyCardShareLink } from "../../lib/card-share-links";
import { MONITOR_LINK_INVALID_MESSAGE } from "../../lib/constants/auth";
import type { CardShareLinkClaims } from "../../lib/interfaces/share-tokens";
import { loadOrgPricing } from "../../lib/price-source";
import { shareLinkRateLimit } from "../../lib/share-link-rate-limit";
import { cardShareLinkScope } from "../../lib/share-link-scopes";
import type { AppEnv } from "../../middleware/auth";
import { createPublicCardBrowseRoute } from "./card-browse";

async function claimsFor(c: Context<AppEnv>): Promise<CardShareLinkClaims | null> {
  const token = c.req.query("token");
  return token ? verifyCardShareLink(token) : null;
}

export const publicCardShareLinkRoute = new Hono<AppEnv>()
  .use("/card-share-link", shareLinkRateLimit)
  .use("/card-share-link/*", shareLinkRateLimit)
  .route(
    "/card-share-link/browse",
    createPublicCardBrowseRoute({
      readsCache: null,
      resolveScope: async (c) => {
        const claims = await claimsFor(c);
        return claims ? cardShareLinkScope(claims) : null;
      },
    }),
  )
  .get("/card-share-link", async (c) => {
    const claims = await claimsFor(c);
    if (!claims) {
      return c.json({ success: false, message: MONITOR_LINK_INVALID_MESSAGE }, 401);
    }
    const pricing = await db.transaction((tx) => loadOrgPricing(tx, claims.orgId));
    const data: CardShareLinkInfo = {
      scanId: claims.scanId,
      cardName: claims.cardName,
      priceSource: pricing.source,
      conditionMultipliers: pricing.conditionMultipliers,
      showsPrices: claims.showsPrices,
    };
    return c.json({ success: true, message: "Valid share link.", data });
  });
