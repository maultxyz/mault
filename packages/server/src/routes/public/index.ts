import { Hono } from "hono";
import { recordPublicRouteUsage } from "../../lib/api-usage";
import { usageEndpointOf } from "../../lib/public-api/usage-endpoint";
import type { AppEnv } from "../../middleware/auth";
import { firmwareReleasesRoute } from "./firmware-releases";
import { publicGamesRoute } from "./games";
import { healthRoute } from "./health";
import { publicMetricsRoute } from "./metrics";
import { publicMonitorLinkRoute } from "./monitor-link";
import { pricingRoute } from "./pricing";
import { publicShopCatalogRoute } from "./shop-catalog";
import { publicStorageShareLinkRoute } from "./storage-share-link";
import { versionRoute } from "./version";
import { webhookBuyMeACoffeeRoute } from "./webhook-buymeacoffee";
import { webhookStripeRoute } from "./webhook-stripe";

const router = new Hono<AppEnv>()
  .use("*", async (c, next) => {
    await next();
    recordPublicRouteUsage(
      usageEndpointOf(c.req.method, c.req.path),
      c.res.status === 429,
    );
  })
  .route("/", versionRoute)
  .route("/", publicGamesRoute)
  .route("/", firmwareReleasesRoute)
  .route("/", publicMetricsRoute)
  .route("/", publicMonitorLinkRoute)
  .route("/", publicStorageShareLinkRoute)
  .route("/", publicShopCatalogRoute)
  .route("/", pricingRoute)
  .route("/", healthRoute)
  .route("/", webhookBuyMeACoffeeRoute)
  .route("/", webhookStripeRoute);

export { router as publicRouter };
