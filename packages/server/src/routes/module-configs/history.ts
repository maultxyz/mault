import type { ServoCalibration } from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { getDeviceByGuid } from "../../lib/devices";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const moduleConfigHistoryRoute = new Hono<AppEnv>().get(
  "/history",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const deviceGuid = c.req.param("guid") as string;
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const device = await getDeviceByGuid(tx, orgId, deviceGuid);
        if (!device) return { success: false, message: "Device not found." };
        const rows = await tx.query.moduleConfigAudit.findMany({
          where: (t, { eq }) => eq(t.deviceId, device.id),
          orderBy: (t, { desc }) => [desc(t.createdAt)],
          limit: 30,
        });
        return {
          success: true,
          message: "Loaded history.",
          data: rows.map((r) => ({
            guid: r.guid!,
            moduleNumber: r.moduleNumber,
            calibration: {
              bottomClosed: r.bottomClosed,
              bottomOpen: r.bottomOpen,
              paddleClosed: r.paddleClosed,
              paddleOpen: r.paddleOpen,
              pusherLeft: r.pusherLeft,
              pusherNeutral: r.pusherNeutral,
              pusherRight: r.pusherRight,
              pusherHoldDuration: r.pusherHoldDuration,
              paddleCloseDelay: r.paddleCloseDelay,
            } satisfies ServoCalibration,
            createdAt: r.createdAt.toISOString(),
          })),
        };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
