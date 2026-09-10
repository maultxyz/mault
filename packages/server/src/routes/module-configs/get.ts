import { Hono } from "hono";
import { authQuery } from "../../db";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { buildConfigs, getModuleCount } from "./shared";

export const getModuleConfigsRoute = new Hono<AppEnv>().get(
  "/",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const rows = await tx.query.moduleConfigs.findMany({
          where: (t, { eq }) => eq(t.orgId, orgId),
        });
        const moduleCount = await getModuleCount(tx, orgId);
        return { success: true, message: "Loaded module configs.", data: buildConfigs(rows, moduleCount) };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
