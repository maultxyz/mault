import type { ServoCalibration } from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { moduleConfigAudit, moduleConfigs } from "../../db/schema";
import { getDeviceByGuid } from "../../lib/devices";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { buildConfigs } from "./shared";

export const revertModuleConfigRoute = new Hono<AppEnv>().post(
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
        const entry = await tx.query.moduleConfigAudit.findFirst({
          where: (t, { eq, and }) =>
            and(eq(t.guid, entryGuid), eq(t.deviceId, device.id)),
        });
        if (!entry)
          return { success: false, message: "Audit record not found." };

        const calibration: ServoCalibration = {
          bottomClosed: entry.bottomClosed,
          bottomOpen: entry.bottomOpen,
          paddleClosed: entry.paddleClosed,
          paddleOpen: entry.paddleOpen,
          pusherLeft: entry.pusherLeft,
          pusherNeutral: entry.pusherNeutral,
          pusherRight: entry.pusherRight,
          pusherHoldDuration: entry.pusherHoldDuration,
          paddleCloseDelay: entry.paddleCloseDelay,
        };

        await tx
          .insert(moduleConfigs)
          .values({
            moduleNumber: entry.moduleNumber,
            ...calibration,
            orgId,
            deviceId: device.id,
          })
          .onConflictDoUpdate({
            target: [moduleConfigs.deviceId, moduleConfigs.moduleNumber],
            set: { ...calibration, updatedAt: new Date() },
          });

        await tx.insert(moduleConfigAudit).values({
          moduleNumber: entry.moduleNumber,
          ...calibration,
          orgId,
          deviceId: device.id,
        });

        const rows = await tx.query.moduleConfigs.findMany({
          where: (t, { eq }) => eq(t.deviceId, device.id),
        });
        return {
          success: true,
          message: "Reverted module config.",
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
