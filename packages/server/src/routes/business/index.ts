import { Hono } from "hono";
import type { AppEnv } from "../../middleware/auth";
import { accuracyRoute } from "./accuracy";
import { activityRoute } from "./activity";
import { fleetRoute } from "./fleet";
import { intakeRoute } from "./intake";
import { ordersRoute } from "./orders";
import { reportsRoute } from "./reports";
import { businessSettingsRoute } from "./settings";

const router = new Hono<AppEnv>()
  .route("/", businessSettingsRoute)
  .route("/", intakeRoute)
  .route("/", ordersRoute)
  .route("/", reportsRoute)
  .route("/", activityRoute)
  .route("/", accuracyRoute)
  .route("/", fleetRoute);

export { router as businessRouter };
