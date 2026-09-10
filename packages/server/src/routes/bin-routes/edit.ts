import type { BinRoute } from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { binRouteAudit, binRoutes } from "../../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { buildRoutes } from "./shared";

export const editBinRouteRoute = new Hono<AppEnv>().put(
  "/:binNumber",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const binNumber = parseInt(c.req.param("binNumber"));
    const route = await c.req.json<BinRoute>();
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const values = { binNumber, module: route.module, direction: route.direction, orgId };

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
        return { success: true, message: "Saved bin route.", data: await buildRoutes(tx, orgId, rows) };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
