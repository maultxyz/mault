import type { CreatedStatsSyncKey } from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery } from "../../db";
import {
  STATS_SYNC_MANAGER_ROLES,
  STATS_SYNC_MANAGERS_ONLY_MESSAGE,
} from "../../lib/constants/stats-sync";
import {
  generateStatsSyncKey,
  loadStatsSyncKeyStatus,
  revokeStatsSyncKey,
} from "../../lib/stats-sync-keys";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const statsSyncKeyRoutes = new Hono<AppEnv>()
  .get("/key", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    const canManage = STATS_SYNC_MANAGER_ROLES.includes(c.get("orgRole"));
    const data = await authQuery(c.get("jwtClaims"), (tx) =>
      loadStatsSyncKeyStatus(tx, orgId, canManage),
    );
    return c.json({ success: true, data });
  })
  .post("/key", requireAuth, requireOrg, async (c) => {
    if (!STATS_SYNC_MANAGER_ROLES.includes(c.get("orgRole"))) {
      return c.json({ success: false, message: STATS_SYNC_MANAGERS_ONLY_MESSAGE });
    }
    const orgId = c.get("orgId");
    const data: CreatedStatsSyncKey = await authQuery(c.get("jwtClaims"), async (tx) => {
      const rawKey = await generateStatsSyncKey(tx, orgId, c.get("userId"));
      return { rawKey, status: await loadStatsSyncKeyStatus(tx, orgId, true) };
    });
    return c.json({ success: true, data });
  })
  .delete("/key", requireAuth, requireOrg, async (c) => {
    if (!STATS_SYNC_MANAGER_ROLES.includes(c.get("orgRole"))) {
      return c.json({ success: false, message: STATS_SYNC_MANAGERS_ONLY_MESSAGE });
    }
    const orgId = c.get("orgId");
    const data = await authQuery(c.get("jwtClaims"), async (tx) => {
      await revokeStatsSyncKey(tx, orgId);
      return loadStatsSyncKeyStatus(tx, orgId, true);
    });
    return c.json({ success: true, data });
  });
