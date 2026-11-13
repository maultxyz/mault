import { Hono } from "hono";
import type { AppEnv } from "../../middleware/auth";
import { accuracyRoute } from "./accuracy";
import { activityRoute } from "./activity";
import { fleetRoute } from "./fleet";
import { intakeRoute } from "./intake";
import { ordersRoute } from "./orders";
import { reportsRoute } from "./reports";
import { businessSettingsRoute } from "./settings";
import { shopCatalogsRoute } from "./shop-catalogs";

const router = new Hono<AppEnv>()
  .route("/", businessSettingsRoute)
  .route("/", intakeRoute)
  .route("/", ordersRoute)
  .route("/", reportsRoute)
  .route("/", activityRoute)
  .route("/", accuracyRoute)
  .route("/", fleetRoute)
  .route("/", shopCatalogsRoute);

export { router as businessRouter };
