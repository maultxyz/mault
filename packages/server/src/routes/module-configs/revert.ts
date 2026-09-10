import type { ServoCalibration } from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { moduleConfigAudit, moduleConfigs } from "../../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { buildConfigs, getModuleCount } from "./shared";

export const revertModuleConfigRoute = new Hono<AppEnv>().post(
  "/history/:guid/revert",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const entry = await tx.query.moduleConfigAudit.findFirst({
          where: (t, { eq, and }) => and(eq(t.guid, guid), eq(t.orgId, orgId)),
        });
        if (!entry) return { success: false, message: "Audit record not found." };

        const calibration: ServoCalibration = {
          bottomClosed: entry.bottomClosed,
          bottomOpen: entry.bottomOpen,
          paddleClosed: entry.paddleClosed,
          paddleOpen: entry.paddleOpen,
          pusherLeft: entry.pusherLeft,
          pusherNeutral: entry.pusherNeutral,
          pusherRight: entry.pusherRight,
        };

        await tx
          .insert(moduleConfigs)
          .values({ moduleNumber: entry.moduleNumber, ...calibration, orgId })
          .onConflictDoUpdate({
            target: [moduleConfigs.orgId, moduleConfigs.moduleNumber],
            set: { ...calibration, updatedAt: new Date() },
          });

        await tx.insert(moduleConfigAudit).values({ moduleNumber: entry.moduleNumber, ...calibration, orgId });

        const rows = await tx.query.moduleConfigs.findMany({
          where: (t, { eq }) => eq(t.orgId, orgId),
        });
        const moduleCount = await getModuleCount(tx, orgId);
        return { success: true, message: "Reverted module config.", data: buildConfigs(rows, moduleCount) };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
