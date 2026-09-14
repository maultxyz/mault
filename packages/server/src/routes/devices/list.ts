import { Hono } from "hono";
import { authQuery } from "../../db";
import { getOrCreateDevice } from "../../lib/devices";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { toDevice } from "./shared";

export const listDevicesRoute = new Hono<AppEnv>().get(
  "/",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const device = await getOrCreateDevice(tx, orgId);
        return {
          success: true,
          message: "Loaded devices.",
          data: [toDevice(device)],
        };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
