import { Hono } from "hono";
import type { AppEnv } from "../../middleware/auth";
import { accuracyRoute } from "./accuracy";
import { activityRoute } from "./activity";
import { fleetRoute } from "./fleet";
import { buysRoute } from "./buys";
import { intakeRoute } from "./intake";
import { ordersRoute } from "./orders";
import { overviewRoute } from "./overview";
import { cardPricingRoute } from "./card-pricing";
import { pickRunsRoute } from "./pick-runs";
import { priceLabelsRoute } from "./price-labels";
import { reportsRoute } from "./reports";
import { reservationsRoute } from "./reservations";
import { businessSettingsRoute } from "./settings";
import { shopCatalogsRoute } from "./shop-catalogs";

const router = new Hono<AppEnv>()
  .route("/", businessSettingsRoute)
  .route("/", buysRoute)
  .route("/", intakeRoute)
  .route("/", ordersRoute)
  .route("/", overviewRoute)
  .route("/", cardPricingRoute)
  .route("/", pickRunsRoute)
  .route("/", priceLabelsRoute)
  .route("/", reportsRoute)
  .route("/", activityRoute)
  .route("/", accuracyRoute)
  .route("/", fleetRoute)
  .route("/", shopCatalogsRoute)
  .route("/", reservationsRoute);

export { router as businessRouter };
