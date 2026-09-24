import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import {
  binHeights,
  binRoutes,
  devices,
  feederConfigs,
  moduleConfigs,
} from "../../db/schema";
import { releaseDeviceLease } from "../../lib/device-leases";
import { getDeviceByGuid } from "../../lib/devices";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const deleteDeviceRoute = new Hono<AppEnv>().delete(
  "/:guid",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const device = await getDeviceByGuid(tx, orgId, guid);
        if (!device) return { success: false, message: "Device not found." };

        await tx
          .delete(moduleConfigs)
          .where(eq(moduleConfigs.deviceId, device.id));
        await tx.delete(binRoutes).where(eq(binRoutes.deviceId, device.id));
        await tx.delete(binHeights).where(eq(binHeights.deviceId, device.id));
        await tx
          .delete(feederConfigs)
          .where(eq(feederConfigs.deviceId, device.id));
        await tx.delete(devices).where(eq(devices.id, device.id));
        releaseDeviceLease(orgId, guid);

        return { success: true, message: "Deleted device." };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
