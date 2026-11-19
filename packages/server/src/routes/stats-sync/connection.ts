import { STATS_SYNC_KEY_PREFIX, statsSyncConnectFormSchema } from "@magic-vault/shared";
import { Hono } from "hono";
import { API_KEY_VISIBLE_PREFIX_LENGTH } from "../../lib/constants/api-keys";
import {
  STATS_SYNC_CONNECT_FAILED_MESSAGE,
  STATS_SYNC_MANAGER_ROLES,
  STATS_SYNC_MANAGERS_ONLY_MESSAGE,
} from "../../lib/constants/stats-sync";
import {
  connectStatsSync,
  disconnectStatsSync,
  loadStatsSyncConnectionStatus,
  runStatsSync,
} from "../../lib/stats-sync-connection";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

function visibleKeyPrefix(syncKey: string): string {
  return syncKey.slice(0, STATS_SYNC_KEY_PREFIX.length + API_KEY_VISIBLE_PREFIX_LENGTH);
}

export const statsSyncConnectionRoutes = new Hono<AppEnv>()
  .get("/connection", requireAuth, requireOrg, async (c) => {
    const canManage = STATS_SYNC_MANAGER_ROLES.includes(c.get("orgRole"));
    const data = await loadStatsSyncConnectionStatus(c.get("orgId"), canManage);
    return c.json({ success: true, data });
  })
  .put("/connection", requireAuth, requireOrg, async (c) => {
    if (!STATS_SYNC_MANAGER_ROLES.includes(c.get("orgRole"))) {
      return c.json({ success: false, message: STATS_SYNC_MANAGERS_ONLY_MESSAGE });
    }
    const input = statsSyncConnectFormSchema.safeParse(await c.req.json().catch(() => null));
    if (!input.success) {
      return c.json({ success: false, message: STATS_SYNC_CONNECT_FAILED_MESSAGE }, 400);
    }
    const orgId = c.get("orgId");
    const syncKey = input.data.syncKey;
    const outcome = await connectStatsSync(orgId, c.get("userId"), syncKey, visibleKeyPrefix(syncKey));
    if (outcome.kind === "failed" && outcome.errorCode === "invalidKey") {
      return c.json({ success: false, message: STATS_SYNC_CONNECT_FAILED_MESSAGE });
    }
    return c.json({ success: true, data: await loadStatsSyncConnectionStatus(orgId, true) });
  })
  .post("/connection/sync", requireAuth, requireOrg, async (c) => {
    if (!STATS_SYNC_MANAGER_ROLES.includes(c.get("orgRole"))) {
      return c.json({ success: false, message: STATS_SYNC_MANAGERS_ONLY_MESSAGE });
    }
    const orgId = c.get("orgId");
    await runStatsSync(orgId);
    return c.json({ success: true, data: await loadStatsSyncConnectionStatus(orgId, true) });
  })
  .delete("/connection", requireAuth, requireOrg, async (c) => {
    if (!STATS_SYNC_MANAGER_ROLES.includes(c.get("orgRole"))) {
      return c.json({ success: false, message: STATS_SYNC_MANAGERS_ONLY_MESSAGE });
    }
    const orgId = c.get("orgId");
    await disconnectStatsSync(orgId);
    return c.json({ success: true, data: await loadStatsSyncConnectionStatus(orgId, true) });
  });
