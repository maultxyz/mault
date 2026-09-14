import type { ServoCalibration } from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { moduleConfigAudit, moduleConfigs } from "../../db/schema";
import { getDeviceByGuid } from "../../lib/devices";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { buildConfigs } from "./shared";

export const editModuleConfigRoute = new Hono<AppEnv>().put(
  "/:moduleNumber",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const deviceGuid = c.req.param("guid");
    const moduleNumber = parseInt(c.req.param("moduleNumber"));
    const calibration = await c.req.json<ServoCalibration>();
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const device = await getDeviceByGuid(tx, orgId, deviceGuid);
        if (!device) return { success: false, message: "Device not found." };

        await tx
          .insert(moduleConfigs)
          .values({ moduleNumber, ...calibration, orgId, deviceId: device.id })
          .onConflictDoUpdate({
            target: [moduleConfigs.deviceId, moduleConfigs.moduleNumber],
            set: { ...calibration, updatedAt: new Date() },
          });

        await tx
          .insert(moduleConfigAudit)
          .values({ moduleNumber, ...calibration, orgId, deviceId: device.id });

        const rows = await tx.query.moduleConfigs.findMany({
          where: (t, { eq }) => eq(t.deviceId, device.id),
        });
        return {
          success: true,
          message: "Saved module config.",
          data: buildConfigs(rows, device.moduleCount),
        };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
