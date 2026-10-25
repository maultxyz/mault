import { SORTER_LINK_CLOSE_REVOKED } from "@magic-vault/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { devices } from "../../db/schema";
import { isDeviceLeased, releaseDeviceLease } from "../../lib/device-leases";
import { getDeviceByGuid } from "../../lib/devices";
import { closeDeviceLink } from "../../lib/sorter-link";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { databaseErrorResponse } from "../../lib/database-error-response";

export const deleteDeviceRoute = new Hono<AppEnv>().delete(
  "/:guid",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    if (isDeviceLeased(orgId, guid)) {
      return c.json({
        success: false,
        message: "This sorter is connected. Disconnect it before deleting it.",
      });
    }
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const device = await getDeviceByGuid(tx, orgId, guid);
        if (!device) return { success: false, message: "Device not found." };

        await tx
          .update(devices)
          .set({ isDeleted: true })
          .where(eq(devices.id, device.id));
        releaseDeviceLease(orgId, guid);
        closeDeviceLink(guid, SORTER_LINK_CLOSE_REVOKED);

        return { success: true, message: "Deleted device." };
      });
      return c.json(result);
    } catch (err) {
      return databaseErrorResponse(c, err);
    }
  },
);
