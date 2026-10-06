import type { BinHeight } from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { binHeightAudit, binHeights } from "../../db/schema";
import { getDeviceByGuid } from "../../lib/devices";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { toBinHeight } from "./shared";

export const editBinHeightRoute = new Hono<AppEnv>().put(
  "/:binNumber",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const deviceGuid = c.req.param("guid") as string;
    const binNumber = parseInt(c.req.param("binNumber"));
    const { height } = await c.req.json<BinHeight>();
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const device = await getDeviceByGuid(tx, orgId, deviceGuid);
        if (!device) return { success: false, message: "Device not found." };
        const values = {
          binNumber,
          height,
          orgId,
          deviceId: device.id,
        };

        await tx
          .insert(binHeights)
          .values(values)
          .onConflictDoUpdate({
            target: [binHeights.deviceId, binHeights.binNumber],
            set: { ...values, isDeleted: false, updatedAt: new Date() },
          });

        await tx.insert(binHeightAudit).values(values);

        const rows = await tx.query.binHeights.findMany({
          where: (t, { eq, and }) =>
            and(eq(t.deviceId, device.id), eq(t.isDeleted, false)),
        });
        return {
          success: true,
          message: "Saved bin height.",
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
