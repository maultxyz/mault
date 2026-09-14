import type { FeederCalibration } from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { feederConfigAudit, feederConfigs } from "../../db/schema";
import { getDeviceByGuid } from "../../lib/devices";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { rowToCalibration } from "./shared";

export const revertFeederRoute = new Hono<AppEnv>().post(
  "/history/:entryGuid/revert",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const deviceGuid = c.req.param("guid");
    const entryGuid = c.req.param("entryGuid");
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const device = await getDeviceByGuid(tx, orgId, deviceGuid);
        if (!device) return { success: false, message: "Device not found." };
        const entry = await tx.query.feederConfigAudit.findFirst({
          where: (t, { eq, and }) =>
            and(eq(t.guid, entryGuid), eq(t.deviceId, device.id)),
        });
        if (!entry)
          return { success: false, message: "Audit record not found." };

        const calibration: FeederCalibration = rowToCalibration(entry);

        await tx
          .insert(feederConfigs)
          .values({ ...calibration, orgId, deviceId: device.id })
          .onConflictDoUpdate({
            target: [feederConfigs.deviceId],
            set: { ...calibration, updatedAt: new Date() },
          });

        await tx
          .insert(feederConfigAudit)
          .values({ ...calibration, orgId, deviceId: device.id });
        return {
          success: true,
          message: "Reverted feeder config.",
          data: calibration,
        };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
