import type { ServoCalibration } from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const moduleConfigHistoryRoute = new Hono<AppEnv>().get(
  "/history",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const rows = await tx.query.moduleConfigAudit.findMany({
          where: (t, { eq }) => eq(t.orgId, orgId),
          orderBy: (t, { desc }) => [desc(t.createdAt)],
          limit: 30,
        });
        return {
          success: true,
          message: "Loaded history.",
          data: rows.map((r) => ({
            guid: r.guid!,
            moduleNumber: r.moduleNumber,
            calibration: {
              bottomClosed: r.bottomClosed,
              bottomOpen: r.bottomOpen,
              paddleClosed: r.paddleClosed,
              paddleOpen: r.paddleOpen,
              pusherLeft: r.pusherLeft,
              pusherNeutral: r.pusherNeutral,
              pusherRight: r.pusherRight,
            } satisfies ServoCalibration,
            createdAt: r.createdAt.toISOString(),
          })),
        };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
