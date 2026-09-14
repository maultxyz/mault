import { Hono } from "hono";
import { authQuery } from "../../db";
import { binRouteAudit, binRoutes } from "../../db/schema";
import { getDeviceByGuid } from "../../lib/devices";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { buildRoutes } from "./shared";

export const revertBinRouteRoute = new Hono<AppEnv>().post(
  "/history/:entryGuid/revert",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const deviceGuid = c.req.param("guid") as string;
    const entryGuid = c.req.param("entryGuid");
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const device = await getDeviceByGuid(tx, orgId, deviceGuid);
        if (!device) return { success: false, message: "Device not found." };
        const entry = await tx.query.binRouteAudit.findFirst({
          where: (t, { eq, and }) =>
            and(eq(t.guid, entryGuid), eq(t.deviceId, device.id)),
        });
        if (!entry)
          return { success: false, message: "Audit record not found." };

        const values = {
          binNumber: entry.binNumber,
          module: entry.module,
          direction: entry.direction,
          orgId,
          deviceId: device.id,
        };

        await tx
          .insert(binRoutes)
          .values(values)
          .onConflictDoUpdate({
            target: [binRoutes.deviceId, binRoutes.binNumber],
            set: { ...values, updatedAt: new Date() },
          });

        await tx.insert(binRouteAudit).values(values);

        const rows = await tx.query.binRoutes.findMany({
          where: (t, { eq }) => eq(t.deviceId, device.id),
        });
        return {
          success: true,
          message: "Reverted bin route.",
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
