import { Hono } from "hono";
import { authQuery } from "../../db";
import { touchDeviceLastSeen } from "../../lib/device-alerts";
import { acquireDeviceLease, releaseDeviceLease } from "../../lib/device-leases";
import { getDeviceByGuid } from "../../lib/devices";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { sorterLimitMessage } from "../../lib/plan-limit-messages";
import { orgConnectedSorterLimit } from "../../lib/plan-config";

export const acquireDeviceLeaseRoute = new Hono<AppEnv>().post(
  "/:guid/lease",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const device = await getDeviceByGuid(tx, orgId, guid);
      if (!device) return { found: false as const, limit: null };
      return {
        found: true as const,
        limit: await orgConnectedSorterLimit(tx, orgId),
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
          message: sorterLimitMessage(result.limit),
        },
        402,
      );
    }
    touchDeviceLastSeen(orgId, guid);
    return c.json({ success: true, message: "Lease held." });
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
