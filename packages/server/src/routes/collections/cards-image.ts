import { SCAN_IMAGE_SIDE_QUERY_PARAM, parseScanImageSide } from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { brandedScanImageResponse } from "../../lib/branded-scan-image";
import {
  loadScanImageSide,
  resolveBackScanImageUrl,
  resolveScanImageUrl,
} from "../../lib/scan-images";
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
        columns: {
          capturedImageDataUrl: true,
          capturedImageKey: true,
          capturedBackImageDataUrl: true,
          capturedBackImageKey: true,
        },
      });
      if (!existing) return { success: false, message: "Card not found." };
      return {
        success: true,
        data: {
          capturedImageUrl: await resolveScanImageUrl(existing),
          capturedBackImageUrl: await resolveBackScanImageUrl(existing),
        },
      };
    });
    return c.json(result);
  },
).get(
  "/:guid/cards/:scanId/image/download",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const scanId = c.req.param("scanId");
    const side = parseScanImageSide(c.req.query(SCAN_IMAGE_SIDE_QUERY_PARAM));
    const existing = await authQuery(c.get("jwtClaims"), (tx) =>
      tx.query.collectionCards.findFirst({
        where: (t, { eq, and }) => and(eq(t.guid, scanId), eq(t.orgId, orgId)),
        columns: {
          capturedImageDataUrl: true,
          capturedImageKey: true,
          capturedBackImageDataUrl: true,
          capturedBackImageKey: true,
        },
      }),
    );
    return brandedScanImageResponse(
      c,
      existing ? await loadScanImageSide(existing, side) : null,
    );
  },
);
