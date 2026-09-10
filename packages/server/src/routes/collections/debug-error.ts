import { Hono } from "hono";
import { emitToSession } from "../../lib/session-stream";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

// POST /collections/:guid/debug/error — emit a test scan_error to session watchers (admin only)
export const debugErrorRoute = new Hono<AppEnv>().post(
  "/:guid/debug/error",
  requireAuth,
  requireOrg,
  async (c) => {
    const guid = c.req.param("guid");
    emitToSession(guid, "scan_error", {
      message: "Debug: forced error triggered.",
      timestamp: Date.now(),
    });
    return c.json({ success: true, data: null });
  },
);
