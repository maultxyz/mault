import { Hono } from "hono";
import { reportServerError } from "../../lib/error-reporting";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";

export const errorReportingTestRoute = new Hono<AppEnv>().post(
  "/error-reporting/test",
  requireAuth,
  requireRole("admin"),
  (c) => {
    const userId = c.get("userId");
    reportServerError(
      new Error("PostHog test error triggered from admin page (server)"),
      { triggeredBy: userId },
      userId,
    );
    return c.json({ success: true, message: "Sent test error to PostHog (server)." });
  },
);
