import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { binHeights } from "../../db/schema";
import { getDeviceByGuid } from "../../lib/devices";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { toBinHeight } from "./shared";

export const deleteBinHeightRoute = new Hono<AppEnv>().delete(
  "/:binNumber",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const deviceGuid = c.req.param("guid") as string;
    const binNumber = parseInt(c.req.param("binNumber"));
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const device = await getDeviceByGuid(tx, orgId, deviceGuid);
        if (!device) return { success: false, message: "Device not found." };
        await tx
          .delete(binHeights)
          .where(
            and(
              eq(binHeights.deviceId, device.id),
              eq(binHeights.binNumber, binNumber),
            ),
          );

        const rows = await tx.query.binHeights.findMany({
          where: (t, { eq }) => eq(t.deviceId, device.id),
        });
        return {
          success: true,
          message: "Cleared bin height.",
          data: rows.map(toBinHeight),
        };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
