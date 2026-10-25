import { Hono } from "hono";
import { authQuery } from "../../db";
import { resolveScanImageUrl } from "../../lib/scan-images";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const collectionCardImageRoute = new Hono<AppEnv>().get(
  "/:guid/cards/:scanId/image",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const scanId = c.req.param("scanId");
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const existing = await tx.query.collectionCards.findFirst({
        where: (t, { eq, and }) => and(eq(t.guid, scanId), eq(t.orgId, orgId)),
        columns: { capturedImageDataUrl: true, capturedImageKey: true },
      });
      if (!existing) return { success: false, message: "Card not found." };
      return {
        success: true,
        data: { capturedImageUrl: await resolveScanImageUrl(existing) },
      };
    });
    return c.json(result);
  },
);
