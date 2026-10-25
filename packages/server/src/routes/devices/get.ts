import { Hono } from "hono";
import { authQuery } from "../../db";
import { getDeviceByGuid } from "../../lib/devices";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { toDevice } from "./shared";
import { databaseErrorResponse } from "../../lib/database-error-response";

export const getDeviceRoute = new Hono<AppEnv>().get(
  "/:guid",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const device = await getDeviceByGuid(tx, orgId, guid);
        if (!device) return { success: false, message: "Device not found." };
        return {
          success: true,
          message: "Loaded device.",
          data: toDevice(device),
        };
      });
      return c.json(result);
    } catch (err) {
      return databaseErrorResponse(c, err);
    }
  },
);
