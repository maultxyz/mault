import { Hono } from "hono";
import { authQuery } from "../../db";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

// GET /collections/:guid/cards/:scanId/image — the scanned photo, fetched on
// demand for the card detail view only; the bulk card list/session_init
// payloads omit it since it's stored inline as a base64 data URL and
// including it for every card in a collection's history blows up the
// response size.
export const collectionCardImageRoute = new Hono<AppEnv>().get(
  "/:guid/cards/:scanId/image",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const scanId = c.req.param("scanId");
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const existing = await tx.query.collectionCards.findFirst({
          where: (t, { eq, and }) => and(eq(t.guid, scanId), eq(t.orgId, orgId)),
          columns: { capturedImageDataUrl: true },
        });
        if (!existing) return { success: false, message: "Card not found." };
        return {
          success: true,
          data: { capturedImageUrl: existing.capturedImageDataUrl ?? undefined },
        };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
