import type { ServoCalibration } from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { moduleConfigAudit, moduleConfigs } from "../../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { buildConfigs, getModuleCount } from "./shared";

export const editModuleConfigRoute = new Hono<AppEnv>().put(
  "/:moduleNumber",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const moduleNumber = parseInt(c.req.param("moduleNumber"));
    const calibration = await c.req.json<ServoCalibration>();
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        await tx
          .insert(moduleConfigs)
          .values({ moduleNumber, ...calibration, orgId })
          .onConflictDoUpdate({
            target: [moduleConfigs.orgId, moduleConfigs.moduleNumber],
            set: { ...calibration, updatedAt: new Date() },
          });

        await tx.insert(moduleConfigAudit).values({ moduleNumber, ...calibration, orgId });

        const rows = await tx.query.moduleConfigs.findMany({
          where: (t, { eq }) => eq(t.orgId, orgId),
        });
        const moduleCount = await getModuleCount(tx, orgId);
        return { success: true, message: "Saved module config.", data: buildConfigs(rows, moduleCount) };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
