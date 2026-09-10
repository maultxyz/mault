import type { FeederCalibration } from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { rowToCalibration } from "./shared";

export const feederHistoryRoute = new Hono<AppEnv>().get(
  "/history",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const rows = await tx.query.feederConfigAudit.findMany({
          where: (t, { eq }) => eq(t.orgId, orgId),
          orderBy: (t, { desc }) => [desc(t.createdAt)],
          limit: 20,
        });
        return {
          success: true,
          message: "Loaded history.",
          data: rows.map((r) => ({
            guid: r.guid!,
            calibration: rowToCalibration(r) satisfies FeederCalibration,
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
