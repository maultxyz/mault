import {
  MATCH_VALIDATION_PROGRESS_MAX_AGE_MS,
  MATCH_VALIDATION_REVIEWS_REQUIRED,
  MATCH_VALIDATION_VERDICTS,
  matchValidationStatus,
  type MatchValidationProgress,
  type MatchValidationScan,
  type MatchValidationQueue,
  type MatchValidationRequest,
} from "@magic-vault/shared";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db";
import {
  collectionCards,
  collections,
  games,
  platformMatchValidations,
} from "../../db/schema";
import { createCachedValue } from "../../lib/cached-value";
import { cardCatalogJoinSql } from "../../lib/card-catalog-sql";
import { CC_ALIAS_SQL_COLUMNS } from "../../lib/constants/card-prices";
import {
  MATCH_VALIDATION_QUEUE_LIMIT,
  MATCH_VALIDATION_SCANNED_BEFORE,
  MATCH_VALIDATION_SCANNED_FROM,
} from "../../lib/constants/match-validations";
import { UUID_PATTERN } from "../../lib/constants/validation";
import type {
  MatchValidationScanRow,
  MatchValidationQueueRow,
} from "../../lib/interfaces/match-validations";
import {
  loadMatchValidationCandidates,
  loadMatchValidationTopOrgs,
  loadMatchValidationVotes,
  scanIdArraySql,
} from "../../lib/match-validations";
import {
  candidatesForGame,
  gameProgressOf,
  pickMatchValidationQueue,
  reviewProgressOf,
} from "../../lib/match-validation-queue";
import { parsePageParams } from "../../lib/paging";
import { hydrateSavedCards } from "../../lib/saved-cards";
import { resolveScanImageUrl } from "../../lib/scan-images";
import {
  findOrgMembership,
  requireAuth,
  type AppEnv,
} from "../../middleware/auth";

const matchValidationProgressCache = createCachedValue(
  async (): Promise<MatchValidationProgress> => {
    const [candidates, votes, topValidatorOrgs] = await Promise.all([
      loadMatchValidationCandidates(),
      loadMatchValidationVotes(null),
      loadMatchValidationTopOrgs(),
    ]);
    return {
      scanCount: candidates.length,
      reviewCount: reviewProgressOf(candidates, votes),
      games: gameProgressOf(candidates, votes),
      topValidatorOrgs,
    };
  },
);

const router = new Hono<AppEnv>()
  .get("/progress", requireAuth, async (c) => {
    const data = await matchValidationProgressCache.get(
      MATCH_VALIDATION_PROGRESS_MAX_AGE_MS,
    );
    return c.json({ success: true, data });
  })
  .get("/scans", requireAuth, async (c) => {
    const userId = c.get("userId");
    const { page: requestedPage, pageSize } = parsePageParams(c);
    const [allCandidates, votes] = await Promise.all([
      loadMatchValidationCandidates(),
      loadMatchValidationVotes(userId),
    ]);
    const candidates = candidatesForGame(allCandidates, c.req.query("game"));
    const total = candidates.length;
    const pageCount = Math.max(Math.ceil(total / pageSize), 1);
    const page = Math.min(requestedPage ?? 1, pageCount);
    const pageScanIds = candidates
      .slice((page - 1) * pageSize, page * pageSize)
      .map((candidate) => candidate.scanId);
    const scansResult = pageScanIds.length
      ? await db.execute(sql`
          SELECT
            cc.guid::text AS scan_id,
            cc.card_name,
            cc.card_set AS set_code,
            COALESCE(cat.set_name, cc.card_set_name) AS set_name,
            cc.card_collector_number AS collector_number,
            cc.scanned_at,
            cc.captured_image_key,
            CASE WHEN cc.captured_image_key IS NULL THEN cc.captured_image_data_url END AS captured_image_data_url,
            COALESCE(cat.image_small, cc.card_image_small) AS catalog_image_url
          FROM collection_cards cc
          JOIN collections col ON col.id = cc.collection_id AND col.is_deleted = false
          LEFT JOIN games g ON g.id = col.game_id
          ${cardCatalogJoinSql({ gameKey: sql`g.key`, lang: sql`col.lang` }, CC_ALIAS_SQL_COLUMNS)}
          WHERE cc.guid = ANY(${scanIdArraySql(pageScanIds)})
        `)
      : { rows: [] };
    const rowsByScanId = new Map(
      (scansResult.rows as unknown as MatchValidationScanRow[]).map((row) => [row.scan_id, row]),
    );
    const rows = pageScanIds.flatMap((scanId) => rowsByScanId.get(scanId) ?? []);
    const items: MatchValidationScan[] = await Promise.all(
      rows.map(async (row) => {
        const scanVotes = votes.byScanId.get(row.scan_id);
        const verdictCounts = {
          correctCount: scanVotes?.correct_count ?? 0,
          incorrectCount: scanVotes?.incorrect_count ?? 0,
          badScanCount: scanVotes?.bad_scan_count ?? 0,
        };
        return {
          scanId: row.scan_id,
          cardName: row.card_name,
          setCode: row.set_code,
          setName: row.set_name,
          collectorNumber: row.collector_number,
          scannedAt: new Date(row.scanned_at).toISOString(),
          capturedImageUrl:
            (await resolveScanImageUrl({
              capturedImageKey: row.captured_image_key,
              capturedImageDataUrl: row.captured_image_data_url,
            })) ?? null,
          catalogImageUrl: row.catalog_image_url,
          ...verdictCounts,
          yourVerdict: scanVotes?.your_verdict ?? null,
          status: matchValidationStatus(verdictCounts),
        };
      }),
    );
    return c.json({ success: true, data: { items, total, page, pageSize } });
  })
  .get("/queue", requireAuth, async (c) => {
    const userId = c.get("userId");
    const [candidates, votes] = await Promise.all([
      loadMatchValidationCandidates(),
      loadMatchValidationVotes(userId),
    ]);
    const queueScanIds = pickMatchValidationQueue(
      candidatesForGame(candidates, c.req.query("game")),
      votes,
      MATCH_VALIDATION_QUEUE_LIMIT,
    ).map((candidate) => candidate.scanId);
    const queueResult = queueScanIds.length
      ? await db.execute(sql`
          SELECT
            cc.guid::text AS scan_id,
            g.key AS game_key,
            cc.card_name,
            cc.card_set AS set_code,
            COALESCE(cat.set_name, cc.card_set_name) AS set_name,
            cc.card_collector_number AS collector_number,
            cc.diagnostics ->> 'matchedBy' AS matched_by,
            cc.low_confidence_match,
            cc.scanned_at,
            cc.captured_image_key,
            CASE WHEN cc.captured_image_key IS NULL THEN cc.captured_image_data_url END AS captured_image_data_url,
            COALESCE(cat.image_small, cc.card_image_small) AS catalog_image_url,
            cc.card,
            col.lang AS collection_lang,
            CASE WHEN jsonb_typeof(cc.diagnostics -> 'ocr' -> 'regions') = 'array'
              THEN cc.diagnostics -> 'ocr' -> 'regions' END AS ocr_regions
          FROM collection_cards cc
          JOIN collections col ON col.id = cc.collection_id AND col.is_deleted = false
          LEFT JOIN games g ON g.id = col.game_id
          ${cardCatalogJoinSql({ gameKey: sql`g.key`, lang: sql`col.lang` }, CC_ALIAS_SQL_COLUMNS)}
          WHERE cc.guid = ANY(${scanIdArraySql(queueScanIds)}) AND cc.is_reviewed = false
        `)
      : { rows: [] };
    const queueRowsByScanId = new Map(
      (queueResult.rows as unknown as MatchValidationQueueRow[]).map((row) => [row.scan_id, row]),
    );
    const rows = queueScanIds.flatMap((scanId) => queueRowsByScanId.get(scanId) ?? []);
    const catalogCards = await hydrateSavedCards(
      rows.map((row) => ({
        gameKey: row.game_key,
        lang: row.collection_lang,
        card: row.card,
      })),
      { includeRaw: false },
    );

    const data: MatchValidationQueue = {
      items: await Promise.all(
        rows.map(async (row, index) => ({
          scanId: row.scan_id,
          gameKey: row.game_key,
          cardName: row.card_name,
          setCode: row.set_code,
          setName: row.set_name,
          collectorNumber: row.collector_number,
          matchedBy: row.matched_by,
          lowConfidenceMatch: row.low_confidence_match,
          scannedAt: new Date(row.scanned_at).toISOString(),
          capturedImageUrl:
            (await resolveScanImageUrl({
              capturedImageKey: row.captured_image_key,
              capturedImageDataUrl: row.captured_image_data_url,
            })) ?? null,
          catalogImageUrl:
            catalogCards[index]?.image?.normal ?? row.catalog_image_url,
          ocrRegions: row.ocr_regions,
          reviewCount: votes.byScanId.get(row.scan_id)?.review_count ?? 0,
        })),
      ),
      counts: {
        validatedByYou: votes.validatedByYou,
        validatedByCommunity: votes.validatedByCommunity,
      },
    };
    return c.json({ success: true, data });
  })
  .post("/", requireAuth, async (c) => {
    const { scanId, verdict } = await c.req.json<MatchValidationRequest>();
    if (typeof scanId !== "string" || !UUID_PATTERN.test(scanId)) {
      return c.json({ success: false, message: "Invalid scan id." }, 400);
    }
    if (!MATCH_VALIDATION_VERDICTS.includes(verdict)) {
      return c.json(
        {
          success: false,
          message: "Choose correct, wrong or bad scan.",
        },
        400,
      );
    }

    const [scan] = await db
      .select({
        orgId: collections.orgId,
        gameKey: games.key,
        cardId: collectionCards.cardId,
        cardLang: collectionCards.cardLang,
        capturedImageKey: collectionCards.capturedImageKey,
        matchedBy: sql<string | null>`${collectionCards.diagnostics} ->> 'matchedBy'`,
        lowConfidenceMatch: collectionCards.lowConfidenceMatch,
      })
      .from(collectionCards)
      .innerJoin(
        collections,
        and(
          eq(collections.id, collectionCards.collectionId),
          eq(collections.isDeleted, false),
        ),
      )
      .leftJoin(games, eq(games.id, collections.gameId))
      .where(
        and(
          eq(collectionCards.guid, scanId),
          gte(
            collectionCards.scannedAt,
            sql`${MATCH_VALIDATION_SCANNED_FROM}::timestamp`,
          ),
          lt(
            collectionCards.scannedAt,
            sql`${MATCH_VALIDATION_SCANNED_BEFORE}::timestamp`,
          ),
        ),
      )
      .limit(1);
    if (!scan) {
      return c.json(
        { success: false, message: "That scan is no longer open for checking." },
        404,
      );
    }

    const validatedByUserId = c.get("userId");
    const requestedOrgId = c.req.header("X-Org-Id");
    const validatorOrgId =
      requestedOrgId && (await findOrgMembership(validatedByUserId, requestedOrgId))
        ? requestedOrgId
        : null;
    const validation = {
      ...scan,
      isCorrectMatch: verdict === "badScan" ? null : verdict === "correct",
      isBadScan: verdict === "badScan",
      validatedByUserId,
      validatorOrgId,
    };
    await db
      .insert(platformMatchValidations)
      .values({ scanId, ...validation })
      .onConflictDoUpdate({
        target: [
          platformMatchValidations.scanId,
          platformMatchValidations.validatedByUserId,
        ],
        set: { ...validation, updatedAt: new Date() },
      });
    return c.json({ success: true, message: "Saved." });
  });

export { router as matchValidationsRouter };
