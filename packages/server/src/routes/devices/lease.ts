import { Hono } from "hono";
import { authQuery } from "../../db";
import { acquireDeviceLease, releaseDeviceLease } from "../../lib/device-leases";
import { getDeviceByGuid } from "../../lib/devices";
import { getConnectedSorterLimit } from "../../lib/sorter-limit";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

// Taken when a sorter connects and renewed on a heartbeat while it stays
// connected. This is what enforces the free plan's cap on simultaneously
// connected sorters across every browser and computer in the org.
export const acquireDeviceLeaseRoute = new Hono<AppEnv>().post(
  "/:guid/lease",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const device = await getDeviceByGuid(tx, orgId, guid);
        if (!device) return { found: false as const, limit: null };
        return {
          found: true as const,
          limit: await getConnectedSorterLimit(tx, orgId),
        };
      });
      if (!result.found) {
        return c.json({ success: false, message: "Device not found." }, 404);
      }
      if (!acquireDeviceLease(orgId, guid, result.limit)) {
        return c.json(
          {
            success: false,
            sorterLimitReached: true,
            limit: result.limit,
            message: `Your plan allows ${result.limit} connected sorter(s) at a time. Upgrade to Business to connect more.`,
          },
          402,
        );
      }
      return c.json({ success: true, message: "Lease held." });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);

export const releaseDeviceLeaseRoute = new Hono<AppEnv>().delete(
  "/:guid/lease",
  requireAuth,
  requireOrg,
  (c) => {
    releaseDeviceLease(c.get("orgId"), c.req.param("guid"));
    return c.json({ success: true, message: "Lease released." });
  },
);
