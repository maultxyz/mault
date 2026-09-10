import type { FeederCalibration } from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { feederConfigAudit, feederConfigs } from "../../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { rowToCalibration } from "./shared";

export const revertFeederRoute = new Hono<AppEnv>().post(
  "/history/:guid/revert",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const entry = await tx.query.feederConfigAudit.findFirst({
          where: (t, { eq, and }) => and(eq(t.guid, guid), eq(t.orgId, orgId)),
        });
        if (!entry) return { success: false, message: "Audit record not found." };

        const calibration: FeederCalibration = rowToCalibration(entry);

        await tx
          .insert(feederConfigs)
          .values({ ...calibration, orgId })
          .onConflictDoUpdate({
            target: [feederConfigs.orgId],
            set: { ...calibration, updatedAt: new Date() },
          });

        await tx.insert(feederConfigAudit).values({ ...calibration, orgId });
        return { success: true, message: "Reverted feeder config.", data: calibration };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
