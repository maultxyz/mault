import type { StorageShareLinkInfo } from "@magic-vault/shared";
import { Hono, type Context } from "hono";
import { db } from "../../db";
import { MONITOR_LINK_INVALID_MESSAGE } from "../../lib/constants/auth";
import type { StorageShareLinkClaims } from "../../lib/interfaces/share-tokens";
import { loadOrgPricing } from "../../lib/price-source";
import { shareLinkRateLimit } from "../../lib/share-link-rate-limit";
import {
  sharedStorageReadsCache,
  sharedStorageReadsKey,
} from "../../lib/shared-storage-reads-cache";
import { verifyStorageShareLink } from "../../lib/storage-share-links";
import { createPublicCardBrowseRoute } from "./card-browse";
import { createPublicTradeOffersRoute } from "./trade-offers";
import type { AppEnv } from "../../middleware/auth";
import { loadLocationCardStats } from "../storage-locations/shared";

async function claimsFor(
  c: Context<AppEnv>,
): Promise<StorageShareLinkClaims | null> {
  const token = c.req.query("token");
  return token ? verifyStorageShareLink(token) : null;
}

export const publicStorageShareLinkRoute = new Hono<AppEnv>()
  .use("/storage-share-link", shareLinkRateLimit)
  .use("/storage-share-link/*", shareLinkRateLimit)
  .route(
    "/storage-share-link",
    createPublicTradeOffersRoute(async (c) => {
      const claims = await claimsFor(c);
      return claims
        ? {
            allowsTradeOffers: claims.purpose === "trade",
            scope: {
              kind: "storage",
              orgId: claims.orgId,
              locationId: claims.locationId,
            },
          }
        : null;
    }),
  )
  .route(
    "/storage-share-link/browse",
    createPublicCardBrowseRoute({
      readsCache: null,
      resolveScope: async (c) => {
        const claims = await claimsFor(c);
        return claims
          ? {
              orgId: claims.orgId,
              collectionIds: [],
              storageLocationIds: [claims.locationId],
              inventoryOnly: false,
              showsPrices: claims.showsPrices,
              readsCacheKey: null,
            }
          : null;
      },
    }),
  )
  .get("/storage-share-link", async (c) => {
    const claims = await claimsFor(c);
    if (!claims) {
      return c.json(
        { success: false, message: MONITOR_LINK_INVALID_MESSAGE },
        401,
      );
    }
    const cacheKey = sharedStorageReadsKey(
      claims.locationGuid,
      claims.showsPrices,
      "info",
      {},
    );
    const tokenInfo = {
      expiresAt: claims.expiresAt.toISOString(),
      purpose: claims.purpose,
    };
    const cachedInfo = sharedStorageReadsCache.get(cacheKey) as
      | StorageShareLinkInfo
      | undefined;
    if (cachedInfo) {
      return c.json({
        success: true,
        message: "Valid share link.",
        data: { ...cachedInfo, ...tokenInfo },
      });
    }
    const data = await db.transaction(async (tx) => {
      const pricing = await loadOrgPricing(tx, claims.orgId);
      const stats = await loadLocationCardStats(tx, claims.locationId, pricing);
      const info: StorageShareLinkInfo = {
        locationGuid: claims.locationGuid,
        locationName: claims.locationName,
        ...tokenInfo,
        cardCount: stats.totalCount,
        totalValue: claims.showsPrices ? stats.totalValue : 0,
        priceSource: pricing.source,
        conditionMultipliers: pricing.conditionMultipliers,
        showsPrices: claims.showsPrices,
      };
      return info;
    });
    sharedStorageReadsCache.set(cacheKey, data);
    return c.json({ success: true, message: "Valid share link.", data });
  });
