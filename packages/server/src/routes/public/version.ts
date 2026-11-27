import { Hono } from "hono";
import { serverVersionInfo } from "../../lib/server-version";
import { isBillingEnabled } from "../../lib/stripe";
import type { AppEnv } from "../../middleware/auth";

export const versionRoute = new Hono<AppEnv>().get("/version", (c) =>
  c.json({ success: true, data: serverVersionInfo(isBillingEnabled()) }),
);
