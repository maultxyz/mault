import { Hono } from "hono";
import { shareLinkRateLimit } from "../../lib/share-link-rate-limit";
import { shopCatalogReadsCache, verifyShopCatalogLink } from "../../lib/shop-catalogs";
import type { AppEnv } from "../../middleware/auth";
import { createPublicCardBrowseRoute } from "./card-browse";

const shopCatalogBrowseRoute = createPublicCardBrowseRoute({
  readsCache: shopCatalogReadsCache,
  resolveScope: async (c) => {
    const token = c.req.query("token");
    const claims = token ? await verifyShopCatalogLink(token) : null;
    if (!claims) return null;
    return {
      orgId: claims.orgId,
      collectionIds: claims.collectionIds,
      storageLocationIds: claims.storageLocationIds,
      inventoryOnly: true,
      showsPrices: claims.showsPrices,
      readsCacheKey: `${claims.catalogGuid}|${claims.orgId}`,
    };
  },
  infoExtras: async (c) => {
    const claims = await verifyShopCatalogLink(c.req.query("token") ?? "");
    return claims ? { catalogGuid: claims.catalogGuid, name: claims.name } : {};
  },
});

export const publicShopCatalogRoute = new Hono<AppEnv>()
  .use("/shop-catalog", shareLinkRateLimit)
  .use("/shop-catalog/*", shareLinkRateLimit)
  .route("/shop-catalog", shopCatalogBrowseRoute);
