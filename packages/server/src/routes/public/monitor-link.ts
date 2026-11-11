import type { MonitorLinkInfo } from "@magic-vault/shared";
import { Hono, type Context } from "hono";
import { db } from "../../db";
import { verifyMonitorLink } from "../../lib/monitor-links";
import { loadOrgPricing } from "../../lib/price-source";
import { shareLinkRateLimit } from "../../lib/share-link-rate-limit";
import type { MonitorLinkClaims } from "../../lib/interfaces/monitor-links";
import type { AppEnv } from "../../middleware/auth";
import { MONITOR_LINK_INVALID_MESSAGE } from "../../lib/constants/auth";
import { createPublicTradeOffersRoute } from "./trade-offers";
import { createPublicCardBrowseRoute } from "./card-browse";
import { readCardsSummary } from "../collections/cards-read";
import { pricesForShareLink } from "../../lib/share-link-pricing";

async function claimsFor(c: Context<AppEnv>): Promise<MonitorLinkClaims | null> {
  const token = c.req.query("token");
  return token ? verifyMonitorLink(token) : null;
}

export const publicMonitorLinkRoute = new Hono<AppEnv>()
  .use("/monitor-link", shareLinkRateLimit)
  .use("/monitor-link/*", shareLinkRateLimit)
  .route(
    "/monitor-link",
    createPublicTradeOffersRoute(async (c) => {
      const claims = await claimsFor(c);
      return claims
        ? {
            allowsTradeOffers: claims.purpose === "trade",
            scope: {
              kind: "collection",
              orgId: claims.orgId,
              collectionId: claims.collectionId,
            },
          }
        : null;
    }),
  )
  .route(
    "/monitor-link/browse",
    createPublicCardBrowseRoute({
      readsCache: null,
      resolveScope: async (c) => {
        const claims = await claimsFor(c);
        return claims
          ? {
              orgId: claims.orgId,
              collectionIds: [claims.collectionId],
              storageLocationIds: [],
              inventoryOnly: false,
              showsPrices: claims.showsPrices,
              readsCacheKey: null,
            }
          : null;
      },
    }),
  )
  .get("/monitor-link", async (c) => {
    const claims = await claimsFor(c);
    if (!claims) {
      return c.json({ success: false, message: MONITOR_LINK_INVALID_MESSAGE }, 401);
    }
    const pricing = await loadOrgPricing(db, claims.orgId);
    return c.json({
      success: true,
      message: "Valid monitor link.",
      data: {
        collectionGuid: claims.collectionGuid,
        collectionName: claims.collectionName,
        expiresAt: claims.expiresAt.toISOString(),
        priceSource: pricing.source,
        conditionMultipliers: pricing.conditionMultipliers,
        showsPrices: claims.showsPrices,
        purpose: claims.purpose,
      } satisfies MonitorLinkInfo,
    });
  })
  .get("/monitor-link/cards/summary", async (c) => {
    const claims = await claimsFor(c);
    if (!claims) {
      return c.json({ success: false, message: MONITOR_LINK_INVALID_MESSAGE }, 401);
    }
    const data = await readCardsSummary(
      (fn) => db.transaction(fn),
      claims.collectionGuid,
      claims.orgId,
      c.req.query(),
    );
    if (!data) {
      return c.json({ success: false, message: "Collection not found." });
    }
    return c.json({
      success: true,
      data: pricesForShareLink(data, claims.showsPrices),
    });
  });
