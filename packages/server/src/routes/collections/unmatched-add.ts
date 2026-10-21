import type { ScanSaveRequestFields, UnmatchedCard } from "@magic-vault/shared";
import { Hono } from "hono";
import { saveUnmatchedScan } from "../../lib/save-scan";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const addUnmatchedCardRoute = new Hono<AppEnv>().post(
  "/:guid/unmatched",
  requireAuth,
  requireOrg,
  async (c) => {
    const {
      scanId,
      scannedAt,
      capturedImageUrl,
      binNumber,
      vectorizedOn,
      diagnostics,
      embedding,
      deviceGuid,
      isRetry,
    } = await c.req.json<UnmatchedCard & ScanSaveRequestFields>();
    const result = await saveUnmatchedScan({
      jwtClaims: c.get("jwtClaims"),
      userId: c.get("userId"),
      orgId: c.get("orgId"),
      collectionGuid: c.req.param("guid"),
      scanId,
      scannedAt,
      capturedImageUrl,
      binNumber,
      vectorizedOn,
      diagnostics,
      embedding,
      deviceGuid,
      isRetry,
    });
    if (!result.success && result.binLimitReached) return c.json(result, 409);
    if (!result.success && result.message === "Database error.") {
      return c.json(result, 500);
    }
    return c.json(result);
  },
);
