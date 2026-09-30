import type { MatchedScanDiagnostics } from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const collectionCardDiagnosticsRoute = new Hono<AppEnv>().get(
  "/:guid/cards/:scanId/diagnostics",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const scanId = c.req.param("scanId");
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const existing = await tx.query.collectionCards.findFirst({
          where: (t, { eq, and }) => and(eq(t.guid, scanId), eq(t.orgId, orgId)),
          columns: { diagnostics: true },
        });
        if (!existing) return { success: false, message: "Card not found." };
        return {
          success: true,
          data: (existing.diagnostics as MatchedScanDiagnostics | null) ?? null,
        };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
