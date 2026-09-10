import { Hono } from "hono";
import { authQuery } from "../../db";
import { binRouteAudit, binRoutes } from "../../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { buildRoutes } from "./shared";

export const revertBinRouteRoute = new Hono<AppEnv>().post(
  "/history/:guid/revert",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const entry = await tx.query.binRouteAudit.findFirst({
          where: (t, { eq, and }) => and(eq(t.guid, guid), eq(t.orgId, orgId)),
        });
        if (!entry) return { success: false, message: "Audit record not found." };

        const values = {
          binNumber: entry.binNumber,
          module: entry.module,
          direction: entry.direction,
          orgId,
        };

        await tx
          .insert(binRoutes)
          .values(values)
          .onConflictDoUpdate({
            target: [binRoutes.orgId, binRoutes.binNumber],
            set: { ...values, updatedAt: new Date() },
          });

        await tx.insert(binRouteAudit).values(values);

        const rows = await tx.query.binRoutes.findMany({
          where: (t, { eq }) => eq(t.orgId, orgId),
        });
        return { success: true, message: "Reverted bin route.", data: await buildRoutes(tx, orgId, rows) };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
