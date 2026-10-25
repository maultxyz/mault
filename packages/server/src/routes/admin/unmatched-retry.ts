import {
  PLATFORM_STAFF_ROLES,
  CLOSE_MATCH_DELTA,
  OCR_REGIONS_BY_GAME_KEY,
  type AdminUnmatchedOcrResult,
  type AdminUnmatchedRetryRequest,
  type AdminUnmatchedRetryResult,
  type AdminUnmatchedScan,
  type OcrRegionTrace,
  type SearchCandidateDiagnostic,
  type UnmatchedReason,
  type UnmatchedScanDiagnostics,
} from "@magic-vault/shared";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { Hono } from "hono";
import sharp from "sharp";
import { authProvider } from "../../auth";
import { db } from "../../db";
import { collections, games, unmatchedCards } from "../../db/schema";
import {
  ADMIN_OCR_IMAGE_HEIGHT,
  ADMIN_OCR_IMAGE_WIDTH,
  ADMIN_UNMATCHED_LIST_LIMIT,
  ADMIN_UNMATCHED_RETRY_CONCURRENCY,
  ADMIN_UNMATCHED_RETRY_MAX,
} from "../../lib/constants/admin-unmatched";
import type { AdminScanRow } from "../../lib/interfaces/admin-unmatched";
import type {
  CardMatchSearchResult,
  CardTextMatchResult,
} from "../../lib/interfaces/card-search";
import { loadScanImage, resolveScanImageUrl } from "../../lib/scan-images";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";
import {
  attachMatchedCards,
  findCardMatches,
  findCardMatchesByOcr,
} from "../card/shared";

const liveScans = and(
  eq(unmatchedCards.isDeleted, false),
  eq(collections.isDeleted, false),
);

function scanRowColumns(includeImage: boolean) {
  return {
    scanId: unmatchedCards.guid,
    embedding: unmatchedCards.embedding,
    gameKey: games.key,
    lang: collections.lang,
    matchAllLanguages: collections.matchAllLanguages,
    capturedImageKey: unmatchedCards.capturedImageKey,
    capturedImageDataUrl: includeImage
      ? sql<
          string | null
        >`CASE WHEN ${unmatchedCards.capturedImageKey} IS NULL THEN ${unmatchedCards.capturedImageDataUrl} END`
      : sql<string | null>`NULL`,
  };
}

function ocrRegionsFor(row: AdminScanRow) {
  return row.gameKey ? (OCR_REGIONS_BY_GAME_KEY[row.gameKey] ?? []) : [];
}

async function readScanText(
  jwtClaims: string,
  row: AdminScanRow,
  trace?: OcrRegionTrace[],
): Promise<CardTextMatchResult | null> {
  const regions = ocrRegionsFor(row);
  if (!row.gameKey || !row.embedding || regions.length === 0) return null;
  const photo = await loadScanImage(row);
  if (!photo) return null;

  const image = await sharp(photo)
    .resize(ADMIN_OCR_IMAGE_WIDTH, ADMIN_OCR_IMAGE_HEIGHT, { fit: "fill" })
    .png()
    .toBuffer();
  return attachMatchedCards(
    await findCardMatchesByOcr(
      jwtClaims,
      image,
      regions,
      {
        gameKey: row.gameKey,
        lang: row.lang,
        matchAllLanguages: row.matchAllLanguages,
        embeddings: { embedding: row.embedding },
      },
      trace,
    ),
    row.gameKey,
    row.lang,
  );
}

function matchCandidates(
  result: CardMatchSearchResult,
): SearchCandidateDiagnostic[] {
  return (result.data ?? []).map((match) => ({
    cardId: match.cardId,
    name: match.card?.name ?? match.cardId,
    setCode: match.card?.set ?? "",
    distance: match.distance,
  }));
}

function needsTextSearch(result: CardMatchSearchResult): boolean {
  const reason = result.diagnostics?.reason;
  if (reason === "too_far" || reason === "ambiguous") return true;
  const [leader, runnerUp] = result.data ?? [];
  return (
    leader != null &&
    runnerUp != null &&
    runnerUp.distance - leader.distance <= CLOSE_MATCH_DELTA
  );
}

async function retryScan(
  jwtClaims: string,
  row: AdminScanRow,
  withOcr: boolean,
): Promise<AdminUnmatchedRetryResult> {
  const empty = {
    scanId: row.scanId,
    matchedBy: null,
    ocr: null,
    card: null,
    distance: null,
    reason: null,
    runnerUpName: null,
    runnerUpDistance: null,
    candidates: [],
  };
  if (!row.embedding) return { ...empty, status: "no_embedding" };
  if (!row.gameKey) return { ...empty, status: "no_game" };

  const result = await attachMatchedCards(
    await findCardMatches(jwtClaims, {
      gameKey: row.gameKey,
      lang: row.lang,
      matchAllLanguages: row.matchAllLanguages,
      embeddings: { embedding: row.embedding },
    }),
    row.gameKey,
    row.lang,
  );

  const text =
    withOcr && needsTextSearch(result)
      ? await readScanText(jwtClaims, row)
      : null;
  const textLeader = text?.data?.[0];
  if (text && textLeader) {
    return {
      ...empty,
      status: "match",
      matchedBy: "ocr",
      ocr: text.ocr,
      card: textLeader.card ?? null,
      distance: textLeader.distance,
      candidates: matchCandidates(text),
    };
  }

  const ocr = text?.ocr ?? null;
  const leader = result.data?.[0];
  if (leader) {
    return {
      ...empty,
      status: "match",
      matchedBy: "embedding",
      ocr,
      card: leader.card ?? null,
      distance: leader.distance,
      candidates: matchCandidates(result),
    };
  }
  const diagnostics = result.diagnostics;
  return {
    ...empty,
    status: "no_match",
    ocr,
    distance: result.nearestDistance,
    reason: diagnostics?.reason ?? null,
    runnerUpName: diagnostics?.runnerUpName ?? null,
    runnerUpDistance: diagnostics?.runnerUpDistance ?? null,
    candidates: diagnostics?.candidates ?? [],
  };
}

export const unmatchedRetryRoute = new Hono<AppEnv>()
  .get("/unmatched", requireAuth, requireRole(...PLATFORM_STAFF_ROLES), async (c) => {
    try {
      const rows = await db
        .select({
          scanId: unmatchedCards.guid,
          orgId: unmatchedCards.orgId,
          collectionName: collections.name,
          gameKey: games.key,
          lang: collections.lang,
          scannedAt: unmatchedCards.scannedAt,
          capturedImageKey: unmatchedCards.capturedImageKey,
          capturedImageDataUrl: sql<
            string | null
          >`CASE WHEN ${unmatchedCards.capturedImageKey} IS NULL THEN ${unmatchedCards.capturedImageDataUrl} END`,
          hasEmbedding: sql<boolean>`${unmatchedCards.embedding} IS NOT NULL`,
          originalReason: sql<
            string | null
          >`${unmatchedCards.diagnostics}->>'reason'`,
          originalNearestName: sql<
            string | null
          >`${unmatchedCards.diagnostics}->'search'->'candidates'->0->>'name'`,
          originalNearestDistance: sql<
            number | null
          >`(${unmatchedCards.diagnostics}->'search'->>'nearestDistance')::float`,
          diagnostics: unmatchedCards.diagnostics,
        })
        .from(unmatchedCards)
        .innerJoin(collections, eq(collections.id, unmatchedCards.collectionId))
        .leftJoin(games, eq(games.id, collections.gameId))
        .where(liveScans)
        .orderBy(desc(unmatchedCards.scannedAt))
        .limit(ADMIN_UNMATCHED_LIST_LIMIT);

      const orgNames = await authProvider.getOrganisationNames([
        ...new Set(rows.map((row) => row.orgId)),
      ]);
      const data: AdminUnmatchedScan[] = await Promise.all(
        rows.flatMap((row) =>
          row.scanId
            ? [
                (async () => ({
                  scanId: row.scanId!,
                  orgId: row.orgId,
                  orgName: orgNames.get(row.orgId) ?? null,
                  collectionName: row.collectionName,
                  gameKey: row.gameKey,
                  lang: row.lang,
                  scannedAt: row.scannedAt.toISOString(),
                  capturedImageUrl: (await resolveScanImageUrl(row)) ?? null,
                  hasEmbedding: row.hasEmbedding,
                  originalReason: row.originalReason as UnmatchedReason | null,
                  originalNearestName: row.originalNearestName,
                  originalNearestDistance: row.originalNearestDistance,
                  diagnostics:
                    row.diagnostics as UnmatchedScanDiagnostics | null,
                }))(),
              ]
            : [],
        ),
      );
      return c.json({ success: true, data });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  })
  .post("/unmatched/retry", requireAuth, requireRole(...PLATFORM_STAFF_ROLES), async (c) => {
    const { scanIds, withOcr = false } =
      await c.req.json<AdminUnmatchedRetryRequest>();
    if (!Array.isArray(scanIds) || scanIds.length === 0) {
      return c.json({ success: false, message: "No scans to retry." }, 400);
    }
    if (scanIds.length > ADMIN_UNMATCHED_RETRY_MAX) {
      return c.json(
        {
          success: false,
          message: `Retry at most ${ADMIN_UNMATCHED_RETRY_MAX} scans at a time.`,
        },
        400,
      );
    }

    try {
      const rows = await db
        .select(scanRowColumns(withOcr))
        .from(unmatchedCards)
        .innerJoin(collections, eq(collections.id, unmatchedCards.collectionId))
        .leftJoin(games, eq(games.id, collections.gameId))
        .where(and(liveScans, inArray(unmatchedCards.guid, scanIds)));

      const jwtClaims = c.get("jwtClaims");
      const data: AdminUnmatchedRetryResult[] = [];
      for (let i = 0; i < rows.length; i += ADMIN_UNMATCHED_RETRY_CONCURRENCY) {
        const batch = rows.slice(i, i + ADMIN_UNMATCHED_RETRY_CONCURRENCY);
        data.push(
          ...(await Promise.all(
            batch.flatMap((row) =>
              row.scanId
                ? [
                    retryScan(
                      jwtClaims,
                      { ...row, scanId: row.scanId },
                      withOcr,
                    ),
                  ]
                : [],
            ),
          )),
        );
      }
      return c.json({ success: true, data });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  })
  .post(
    "/unmatched/:scanId/ocr",
    requireAuth,
    requireRole(...PLATFORM_STAFF_ROLES),
    async (c) => {
      const scanId = c.req.param("scanId");
      try {
        const [found] = await db
          .select(scanRowColumns(true))
          .from(unmatchedCards)
          .innerJoin(collections, eq(collections.id, unmatchedCards.collectionId))
          .leftJoin(games, eq(games.id, collections.gameId))
          .where(and(liveScans, eq(unmatchedCards.guid, scanId)))
          .limit(1);
        if (!found) {
          return c.json({ success: false, message: "Scan not found." }, 404);
        }
        const row: AdminScanRow = { ...found, scanId };

        if (ocrRegionsFor(row).length === 0) {
          const data: AdminUnmatchedOcrResult = {
            scanId,
            supported: false,
            regions: [],
            ocr: null,
            card: null,
            distance: null,
          };
          return c.json({ success: true, data });
        }
        if (!row.embedding) {
          return c.json(
            { success: false, message: "This scan has no saved embedding." },
            400,
          );
        }

        const trace: OcrRegionTrace[] = [];
        const result = await readScanText(c.get("jwtClaims"), row, trace);
        if (!result) {
          return c.json(
            { success: false, message: "This scan has no saved photo." },
            400,
          );
        }
        const leader = result.data?.[0];
        const data: AdminUnmatchedOcrResult = {
          scanId,
          supported: true,
          regions: trace,
          ocr: result.ocr,
          card: leader?.card ?? null,
          distance: leader?.distance ?? null,
        };
        return c.json({ success: true, data });
      } catch (err) {
        console.error(err);
        return c.json({ success: false, message: "OCR failed." }, 500);
      }
    },
  );
