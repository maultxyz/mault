import { Hono } from "hono";
import { authQuery } from "../../db";
import { getDeviceByGuid } from "../../lib/devices";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { toBinHeight } from "./shared";

export const binHeightHistoryRoute = new Hono<AppEnv>().get(
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
        const rows = await tx.query.binHeightAudit.findMany({
          where: (t, { eq }) => eq(t.deviceId, device.id),
          orderBy: (t, { desc }) => [desc(t.createdAt)],
          limit: 30,
        });
        return {
          success: true,
          message: "Loaded history.",
          data: rows.map((r) => ({
            guid: r.guid!,
            height: toBinHeight(r),
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
