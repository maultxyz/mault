import type { ScanSaveRequestFields, ScannedCard } from "@magic-vault/shared";
import { Hono } from "hono";
import { saveMatchedScan } from "../../lib/save-scan";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const addCollectionCardRoute = new Hono<AppEnv>().post(
  "/:guid/cards",
  requireAuth,
  requireOrg,
  async (c) => {
    const {
      scanId,
      card,
      scannedAt,
      binNumber,
      capturedImageUrl,
      isFoil,
      foilType,
      alternativeMatches,
      lowConfidenceMatch,
      diagnostics,
      vectorizedOn,
      deviceGuid,
      isRetry,
    } = await c.req.json<ScannedCard & ScanSaveRequestFields>();
    const result = await saveMatchedScan({
      jwtClaims: c.get("jwtClaims"),
      userId: c.get("userId"),
      orgId: c.get("orgId"),
      collectionGuid: c.req.param("guid"),
      scanId,
      card,
      scannedAt,
      binNumber,
      capturedImageUrl,
      isFoil,
      foilType,
      alternativeMatches,
      lowConfidenceMatch,
      diagnostics,
      vectorizedOn,
      deviceGuid,
      isRetry,
    });
    if (!result.success && result.scanInUse) return c.json(result, 423);
    if (
      !result.success &&
      (result.scanLimitReached || result.sorterLimitReached)
    ) {
      return c.json(result, 402);
    }
    if (!result.success && result.binLimitReached) return c.json(result, 409);
    if (!result.success && result.message === "Database error.") {
      return c.json(result, 500);
    }
    return c.json(result);
  },
);
