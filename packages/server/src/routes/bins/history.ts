import type { BinConfig } from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const binSetHistoryRoute = new Hono<AppEnv>().get(
  "/history",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const setGuid = c.req.query("setGuid");
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const rows = await tx.query.binSetAudit.findMany({
          where: setGuid
            ? (t, { eq, and }) =>
                and(eq(t.binSetGuid, setGuid), eq(t.orgId, orgId))
            : (t, { eq }) => eq(t.orgId, orgId),
          columns: {
            guid: true,
            binSetGuid: true,
            snapshot: true,
            createdAt: true,
          },
          orderBy: (t, { desc }) => [desc(t.createdAt)],
          limit: 20,
        });
        return {
          success: true,
          message: "Loaded history.",
          data: rows.map((r) => ({
            guid: r.guid!,
            binSetGuid: r.binSetGuid,
            snapshot: r.snapshot as BinConfig[],
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
