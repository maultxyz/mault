import { Hono } from "hono";
import type { AppEnv } from "../../middleware/auth";
import { publicGamesRoute } from "./games";
import { healthRoute } from "./health";
import { pricingRoute } from "./pricing";
import { versionRoute } from "./version";
import { webhookBuyMeACoffeeRoute } from "./webhook-buymeacoffee";
import { webhookStripeRoute } from "./webhook-stripe";

const router = new Hono<AppEnv>()
  .route("/", versionRoute)
  .route("/", publicGamesRoute)
  .route("/", pricingRoute)
  .route("/", healthRoute)
  .route("/", webhookBuyMeACoffeeRoute)
  .route("/", webhookStripeRoute);

export { router as publicRouter };
