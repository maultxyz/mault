import { Hono } from "hono";
import { endImpersonationSessions } from "../../lib/impersonation-sessions";
import { requireAuth, type AppEnv } from "../../middleware/auth";

export const stopImpersonationRoute = new Hono<AppEnv>().post(
  "/impersonate/stop",
  requireAuth,
  async (c) => {
    const adminUserId = c.get("impersonatedBy");
    const targetUserId = c.get("userId");

    if (!adminUserId) {
      return c.json(
        { success: false, message: "Not currently impersonating." },
        400,
      );
    }

    await endImpersonationSessions(adminUserId, targetUserId);

    return c.json({ success: true, data: null });
  },
);
