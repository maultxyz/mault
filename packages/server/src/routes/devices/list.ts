import { Hono } from "hono";
import { authQuery } from "../../db";
import { listOrgDevices } from "../../lib/devices";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { toDevice } from "./shared";
import { databaseErrorResponse } from "../../lib/database-error-response";

export const listDevicesRoute = new Hono<AppEnv>().get(
  "/",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const rows = await listOrgDevices(tx, orgId);
        return {
          success: true,
          message: "Loaded devices.",
          data: rows.map(toDevice),
        };
      });
      return c.json(result);
    } catch (err) {
      return databaseErrorResponse(c, err);
    }
  },
);
