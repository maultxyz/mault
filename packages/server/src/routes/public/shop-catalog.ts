import { SHOP_CATALOG_GUID_PARAM } from "@magic-vault/shared";
import { Hono, type Context } from "hono";
import { createMiddleware } from "hono/factory";
import type { ShopCatalogClaims } from "../../lib/interfaces/share-tokens";
import { rejectWhenShareLinkRateLimited } from "../../lib/share-link-rate-limit";
import {
  shopCatalogReadsCache,
  verifyPublicShopCatalog,
  verifyShopCatalogLink,
} from "../../lib/shop-catalogs";
import { PUBLIC_SHOP_CATALOG_CACHE_PREFIX } from "../../lib/constants/shop-catalogs";
import type { AppEnv } from "../../middleware/auth";
import { createPublicCardBrowseRoute } from "./card-browse";

function claimsFor(c: Context<AppEnv>): Promise<ShopCatalogClaims | null> {
  const token = c.req.query("token");
  if (token) return verifyShopCatalogLink(token);
  const catalogGuid = c.req.query(SHOP_CATALOG_GUID_PARAM);
  return catalogGuid ? verifyPublicShopCatalog(catalogGuid) : Promise.resolve(null);
}

const shopCatalogRateLimit = createMiddleware<AppEnv>(async (c, next) => {
  const token = c.req.query("token");
  const catalogGuid = c.req.query(SHOP_CATALOG_GUID_PARAM);
  const limitKey = token ?? (catalogGuid ? `${PUBLIC_SHOP_CATALOG_CACHE_PREFIX}${catalogGuid}` : null);
  if (limitKey) {
    const rejection = rejectWhenShareLinkRateLimited(c, limitKey);
    if (rejection) return rejection;
  }
  await next();
});

const shopCatalogBrowseRoute = createPublicCardBrowseRoute({
  readsCache: shopCatalogReadsCache,
  resolveScope: async (c) => {
    const claims = await claimsFor(c);
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
    const claims = await claimsFor(c);
    return claims ? { catalogGuid: claims.catalogGuid, name: claims.name } : {};
  },
});

export const publicShopCatalogRoute = new Hono<AppEnv>()
  .use("/shop-catalog", shopCatalogRateLimit)
  .use("/shop-catalog/*", shopCatalogRateLimit)
  .route("/shop-catalog", shopCatalogBrowseRoute);
