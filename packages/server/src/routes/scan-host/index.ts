import { OCR_REGIONS_BY_GAME_KEY } from "@magic-vault/shared";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { collections } from "../../db/schema";
import { MATCH_GAME_KEYS_MAX } from "../../lib/constants/card-search";
import { findBestMatchAcrossGames, tagWithGame } from "../../lib/card-search/match-games";
import { ADAPTERS_BY_GAME_KEY } from "../../lib/card-search/resolve";
import type { CollectionMatchScope } from "../../lib/interfaces/card-search";
import type {
  ScanHostApplyTargetRequest,
  ScanHostContextRequest,
  ScanHostGiftRevealRequest,
  ScanHostLockRequest,
  ScanHostMatchRequest,
  ScanHostOcrRequest,
} from "../../lib/interfaces/scan-host";
import { emitPiScanGiftReveal } from "../../lib/pi-scan/gift-reveal";
import { PiScanStartError } from "../../lib/pi-scan/errors";
import { loadScanHostContext } from "../../lib/scan-host/context";
import { acquireHostScanLock, releaseHostScanLock } from "../../lib/scan-lock";
import { activateScanCollection, activateScanPreset } from "../../lib/scan-targets";
import { emitToOrg } from "../../lib/session-stream";
import {
  getUserDisplayName,
  markRequestAsReadOnly,
  rejectWhileImpersonating,
  requireAuth,
  requireOrg,
  type AppEnv,
} from "../../middleware/auth";
import { PI_SCAN_PENDING_SAVE_EVENT } from "../../lib/constants/pi-scan";
import { toPendingSaveEvent } from "../../lib/scan-host/pending-save";
import { loadSets } from "../bins/shared";
import { attachMatchedCards, findCardMatches, findCardMatchesByOcr } from "../card/shared";
import { loadCollections } from "../collections/shared";

function startErrorResponse(c: Context, error: unknown): Response {
  if (error instanceof PiScanStartError)
    return c.json({ success: false, message: error.message, code: error.code }, error.status);
  throw error;
}

function isKnownScope(scope: unknown): scope is CollectionMatchScope {
  if (!scope || typeof scope !== "object") return false;
  const candidate = scope as CollectionMatchScope;
  return (
    typeof candidate.gameKey === "string" &&
    candidate.gameKey in ADAPTERS_BY_GAME_KEY &&
    typeof candidate.lang === "string" &&
    typeof candidate.matchAllLanguages === "boolean"
  );
}

async function collectionBelongsToOrg(c: Context<AppEnv>, collectionGuid: string): Promise<boolean> {
  const orgId = c.get("orgId");
  const [row] = await authQuery(c.get("jwtClaims"), (tx) =>
    tx
      .select({ id: collections.id })
      .from(collections)
      .where(
        and(
          eq(collections.guid, collectionGuid),
          eq(collections.orgId, orgId),
          eq(collections.isDeleted, false),
        ),
      )
      .limit(1),
  );
  return !!row;
}

export const scanHostRouter = new Hono<AppEnv>()
  .use("*", requireAuth, requireOrg, rejectWhileImpersonating)
  .post("/context", markRequestAsReadOnly, async (c) => {
    const body = await c.req.json<ScanHostContextRequest>();
    const orgId = c.get("orgId");
    try {
      const data = await authQuery(c.get("jwtClaims"), (tx) =>
        loadScanHostContext(tx, orgId, body.collectionGuid, body.hardwareId),
      );
      return c.json({ success: true, data });
    } catch (error) {
      return startErrorResponse(c, error);
    }
  })
  .post("/match", markRequestAsReadOnly, async (c) => {
    const body = await c.req.json<ScanHostMatchRequest>();
    const scopes = Array.isArray(body.scopes) ? body.scopes.filter(isKnownScope) : [];
    if (scopes.length === 0 || scopes.length > MATCH_GAME_KEYS_MAX + 1 || !Array.isArray(body.embeddings?.embedding))
      return c.json({ success: false, message: "Invalid match request." }, 400);
    const { result: nearest, scope } = await findBestMatchAcrossGames(scopes, (matchScope) =>
      findCardMatches({
        ...matchScope,
        embeddings: body.embeddings,
        preferredSetCodes: body.preferredSetCodes ?? [],
        skipsUnloadedIndex: matchScope.gameKey !== body.primaryGameKey,
        printingMarkGrids: matchScope.gameKey === body.primaryGameKey ? body.printingMarkGrids : null,
        printedLanguageCode: matchScope.gameKey === body.primaryGameKey ? body.printedLanguageCode : null,
      }),
    );
    const attached = await attachMatchedCards(nearest, scope.gameKey, scope.lang);
    return c.json({ success: true, data: scopes.length > 1 ? tagWithGame(attached, scope.gameKey) : attached });
  })
  .post("/ocr", markRequestAsReadOnly, async (c) => {
    const body = await c.req.json<ScanHostOcrRequest>();
    if (!isKnownScope(body.scope) || !Array.isArray(body.embedding) || typeof body.imageBase64 !== "string")
      return c.json({ success: false, message: "Invalid text search request." }, 400);
    const regions = OCR_REGIONS_BY_GAME_KEY[body.scope.gameKey] ?? [];
    if (regions.length === 0) return c.json({ success: true, data: null });
    const result = await findCardMatchesByOcr(Buffer.from(body.imageBase64, "base64"), regions, {
      ...body.scope,
      embeddings: { embedding: body.embedding },
      preferredSetCodes: body.preferredSetCodes ?? [],
    });
    const attached = await attachMatchedCards(result, body.scope.gameKey, body.scope.lang);
    const data = body.tagsGame ? tagWithGame(attached, body.scope.gameKey) : attached;
    return c.json({ success: true, data: { ...data, ocr: result.ocr ?? null } });
  })
  .post("/targets", markRequestAsReadOnly, async (c) => {
    const orgId = c.get("orgId");
    const data = await authQuery(c.get("jwtClaims"), async (tx) => ({
      collections: (await loadCollections(tx, orgId)).data ?? [],
      presets: (await loadSets(tx, orgId)).data ?? [],
    }));
    return c.json({ success: true, data });
  })
  .post("/apply-target", async (c) => {
    const body = await c.req.json<ScanHostApplyTargetRequest>();
    const orgId = c.get("orgId");
    try {
      const data = await authQuery(c.get("jwtClaims"), async (tx) => {
        if (body.presetGuid && !(await activateScanPreset(tx, orgId, body.presetGuid)))
          throw new PiScanStartError("Preset not found.", "invalid", 400);
        if (body.activatesCollection && !(await activateScanCollection(tx, orgId, body.collectionGuid)))
          throw new PiScanStartError("Collection not found.", "invalid", 400);
        return loadScanHostContext(tx, orgId, body.collectionGuid, body.hardwareId);
      });
      if (body.activatesCollection) emitToOrg(orgId, "collections_changed", { guid: body.collectionGuid });
      return c.json({ success: true, data });
    } catch (error) {
      return startErrorResponse(c, error);
    }
  })
  .post("/lock", markRequestAsReadOnly, async (c) => {
    const body = await c.req.json<ScanHostLockRequest>();
    if (typeof body.collectionGuid !== "string" || !(await collectionBelongsToOrg(c, body.collectionGuid)))
      return c.json({ success: false, message: "That collection was not found." }, 404);
    const userId = c.get("userId");
    const lock = acquireHostScanLock(body.collectionGuid, userId, c.get("orgId"), await getUserDisplayName(userId));
    if (!lock.ok)
      return c.json({ success: false, message: "Another org member is currently scanning into this collection." }, 409);
    return c.json({ success: true });
  })
  .post("/unlock", markRequestAsReadOnly, async (c) => {
    const body = await c.req.json<ScanHostLockRequest>();
    if (typeof body.collectionGuid === "string") releaseHostScanLock(body.collectionGuid, c.get("userId"));
    return c.json({ success: true });
  })
  .post("/pending-save", markRequestAsReadOnly, async (c) => {
    const orgId = c.get("orgId");
    const pendingSave = toPendingSaveEvent(await c.req.json().catch(() => null), orgId);
    if (!pendingSave || !(await collectionBelongsToOrg(c, pendingSave.collectionGuid)))
      return c.json({ success: false, message: "Invalid pending save." }, 400);
    emitToOrg(orgId, PI_SCAN_PENDING_SAVE_EVENT, pendingSave);
    return c.json({ success: true });
  })
  .post("/gift-reveal", markRequestAsReadOnly, async (c) => {
    const body = await c.req.json<ScanHostGiftRevealRequest>();
    if (typeof body.collectionGuid !== "string" || !(await collectionBelongsToOrg(c, body.collectionGuid)))
      return c.json({ success: false, message: "That collection was not found." }, 404);
    await emitPiScanGiftReveal(c.get("orgId"), body.collectionGuid, body.record);
    return c.json({ success: true });
  });
