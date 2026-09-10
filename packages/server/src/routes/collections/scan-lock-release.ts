import { Hono } from "hono";
import { releaseLock } from "../../lib/scan-lock";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const releaseScanLockRoute = new Hono<AppEnv>().delete(
  "/:guid/scan-lock",
  requireAuth,
  requireOrg,
  async (c) => {
    const guid = c.req.param("guid");
    const userId = c.get("userId");
    releaseLock(guid, userId); // emits lock_released to org subscribers internally
    return c.json({ success: true, data: null });
  },
);
