import { Hono } from "hono";
import { authQuery } from "../../db";
import { resolveDeviceByHardwareId } from "../../lib/devices";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { toDevice } from "./shared";
import { HARDWARE_ID_PATTERN } from "../../lib/constants/validation";
import { databaseErrorResponse } from "../../lib/database-error-response";

export const resolveDeviceRoute = new Hono<AppEnv>().post(
  "/resolve",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const body = await c.req
      .json<{ hardwareId?: string }>()
      .catch(() => ({ hardwareId: undefined }));
    const hardwareId = body.hardwareId?.trim().toUpperCase();
    if (!hardwareId || !HARDWARE_ID_PATTERN.test(hardwareId)) {
      return c.json({ success: false, message: "Invalid hardware id." }, 400);
    }
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const device = await resolveDeviceByHardwareId(tx, orgId, hardwareId);
        return {
          success: true,
          message: "Resolved device.",
          data: toDevice(device),
        };
      });
      return c.json(result);
    } catch (err) {
      return databaseErrorResponse(c, err);
    }
  },
);
