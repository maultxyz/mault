import { Hono } from "hono";
import { getOwnAuth } from "../../auth/own-auth-instance";
import { requireAuth, type AppEnv } from "../../middleware/auth";

export const listApiKeysRoute = new Hono<AppEnv>().get("/api-keys", requireAuth, async (c) => {
  const keys = await getOwnAuth().listApiKeys({ actorUserId: c.get("userId") });
  return c.json({ success: true, data: keys });
});
