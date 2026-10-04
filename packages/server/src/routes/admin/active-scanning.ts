import type { ActiveScanningStats } from "@magic-vault/shared";
import { Hono } from "hono";
import { SCAN_LOCK_TTL_MS } from "../../lib/constants/timing";
import { countConnectedSorters } from "../../lib/device-leases";
import { getActiveScanLockStats } from "../../lib/scan-lock";
import { countRecentScans } from "../../lib/scan-stats";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";

export const activeScanningRoute = new Hono<AppEnv>().get(
  "/active-scanning",
  requireAuth,
  requireRole("admin"),
  async (c) => {
    const data: ActiveScanningStats = {
      ...getActiveScanLockStats(),
      connectedSorters: countConnectedSorters(),
      recentScans: await countRecentScans(SCAN_LOCK_TTL_MS),
      windowMinutes: Math.round(SCAN_LOCK_TTL_MS / 60_000),
    };
    return c.json({ success: true, data });
  },
);
