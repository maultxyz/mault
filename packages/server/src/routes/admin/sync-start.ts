import { Hono } from "hono";
import { getStatus } from "../../lib/sync-job";
import {
  requestSyncStart,
  toSyncStartRequest,
} from "../../lib/sync-job/start-request";
import type { SyncStartBody } from "../../lib/interfaces/sync-job";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";

export const syncStartRoute = new Hono<AppEnv>().post(
  "/sync",
  requireAuth,
  requireRole("admin"),
  async (c) => {
    const body = await c.req.json<SyncStartBody>().catch(() => ({}));
    const outcome = await requestSyncStart(
      c.req.header("X-Org-Id"),
      toSyncStartRequest(body),
    );
    if (!outcome.success) {
      return c.json(
        { success: false, message: outcome.message },
        outcome.status,
      );
    }
    return c.json({ success: true, data: getStatus() });
  },
);
