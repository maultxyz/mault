import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { binRoutes } from "../../db/schema";
import { getDeviceByGuid } from "../../lib/devices";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { buildRoutes } from "./shared";

export const deleteBinRouteRoute = new Hono<AppEnv>().delete(
  "/:binNumber",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const deviceGuid = c.req.param("guid");
    const binNumber = parseInt(c.req.param("binNumber"));
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const device = await getDeviceByGuid(tx, orgId, deviceGuid);
        if (!device) return { success: false, message: "Device not found." };
        await tx
          .delete(binRoutes)
          .where(and(eq(binRoutes.deviceId, device.id), eq(binRoutes.binNumber, binNumber)));

        const rows = await tx.query.binRoutes.findMany({
          where: (t, { eq }) => eq(t.deviceId, device.id),
        });
        return {
          success: true,
          message: "Reset bin route.",
          data: buildRoutes(device.moduleCount, rows),
        };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
