import { Hono } from "hono";
import type { AppEnv } from "../../middleware/auth";
import { serialEventNotificationRoute } from "./serial-event";
import { testNotificationRoute } from "./test";

const router = new Hono<AppEnv>()
  .route("/", testNotificationRoute)
  .route("/", serialEventNotificationRoute);

export { router as notificationsRouter };
