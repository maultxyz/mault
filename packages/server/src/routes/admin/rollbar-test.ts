import { Hono } from "hono";
import { rollbar } from "../../lib/rollbar";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";

export const rollbarTestRoute = new Hono<AppEnv>().post(
  "/rollbar/test",
  requireAuth,
  requireRole("admin"),
  (c) => {
    rollbar.error(new Error("Rollbar test error triggered from admin page (server)"), {
      triggeredBy: c.get("userId"),
    });
    return c.json({ success: true, message: "Sent test error to Rollbar (server)." });
  },
);
