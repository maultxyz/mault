import { Hono } from "hono";
import { authQuery } from "../../db";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { activateScanPreset } from "../../lib/scan-targets";
import { loadSets } from "./shared";

export const setBinSetActiveRoute = new Hono<AppEnv>().put(
  "/:guid/active",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      if (!(await activateScanPreset(tx, orgId, guid)))
        return { success: false, message: "Set not found." };
      return loadSets(tx, orgId);
    });
    return c.json(result);
  },
);
