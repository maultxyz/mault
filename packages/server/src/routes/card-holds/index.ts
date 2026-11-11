import { Hono } from "hono";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const cardHoldsRouter = new Hono<AppEnv>().get("/", requireAuth, requireOrg, (c) =>
  c.json({ success: true, data: [] }),
);
