import { Hono } from "hono";
import type { AppEnv } from "../../middleware/auth";
import { statsSyncConnectionRoutes } from "./connection";
import { statsSyncKeyRoutes } from "./keys";
import { statsSyncPushRoute } from "./push";

export const hostedStatsSyncRouter = new Hono<AppEnv>()
  .route("/", statsSyncKeyRoutes)
  .route("/", statsSyncPushRoute);

export const selfHostedStatsSyncRouter = new Hono<AppEnv>().route(
  "/",
  statsSyncConnectionRoutes,
);
