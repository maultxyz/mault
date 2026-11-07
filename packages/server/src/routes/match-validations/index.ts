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
  MatchValidationCountsRow,
  MatchValidationProgressRow,
  MatchValidationScanRow,
  MatchValidationTotalRow,
  MatchValidationQueueRow,
} from "../../lib/interfaces/match-validations";
import { parsePageParams } from "../../lib/paging";
import { hydrateSavedCards } from "../../lib/saved-cards";
import { resolveScanImageUrl } from "../../lib/scan-images";
import { requireAuth, type AppEnv } from "../../middleware/auth";

const reviewCountSql = sql`(SELECT count(*)::int FROM platform_match_validations v WHERE v.scan_id = cc.guid)`;

const scansInValidationSql = sql`
  cc.scanned_at >= ${MATCH_VALIDATION_SCANNED_FROM}::timestamp
  AND cc.scanned_at < ${MATCH_VALIDATION_SCANNED_BEFORE}::timestamp
  AND cc.is_reviewed = false
  AND (cc.captured_image_key IS NOT NULL OR cc.captured_image_data_url IS NOT NULL)
`;

function scansOpenToUserSql(userId: string) {
  return sql`
    ${scansInValidationSql}
    AND NOT EXISTS (
      SELECT 1 FROM platform_match_validations v
      WHERE v.scan_id = cc.guid AND v.validated_by_user_id = ${userId}
    )
    AND ${reviewCountSql} < ${MATCH_VALIDATION_REVIEWS_REQUIRED}
  `;
}

const matchValidationProgressCache = createCachedValue(
  async (): Promise<MatchValidationProgress> => {
    const progressResult = await db.execute(sql`
      SELECT
        count(*)::int AS scan_count,
        COALESCE(sum(LEAST(review_count, ${MATCH_VALIDATION_REVIEWS_REQUIRED})), 0)::int AS review_count
      FROM (
        SELECT ${reviewCountSql} AS review_count
        FROM collection_cards cc
        JOIN collections col ON col.id = cc.collection_id AND col.is_deleted = false
        WHERE ${scansInValidationSql}
      ) scans
    `);
    const progress = progressResult.rows[0] as unknown as MatchValidationProgressRow;
    return {
      scanCount: progress.scan_count,
      reviewCount: progress.review_count,
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
    const totalResult = await db.execute(sql`
      SELECT count(*)::int AS total
      FROM collection_cards cc
      JOIN collections col ON col.id = cc.collection_id AND col.is_deleted = false
      WHERE ${scansInValidationSql}
    `);
    const { total } = totalResult.rows[0] as unknown as MatchValidationTotalRow;
    const pageCount = Math.max(Math.ceil(total / pageSize), 1);
    const page = Math.min(requestedPage ?? 1, pageCount);
    const scansResult = await db.execute(sql`
      SELECT
        cc.guid::text AS scan_id,
        cc.card_name,
        cc.card_set AS set_code,
        COALESCE(cat.set_name, cc.card_set_name) AS set_name,
        cc.card_collector_number AS collector_number,
        cc.scanned_at,
        cc.captured_image_key,
        CASE WHEN cc.captured_image_key IS NULL THEN cc.captured_image_data_url END AS captured_image_data_url,
        COALESCE(cat.image_small, cc.card_image_small) AS catalog_image_url,
        COALESCE(votes.correct_count, 0) AS correct_count,
        COALESCE(votes.incorrect_count, 0) AS incorrect_count,
        COALESCE(votes.bad_scan_count, 0) AS bad_scan_count,
        votes.your_verdict
      FROM collection_cards cc
      JOIN collections col ON col.id = cc.collection_id AND col.is_deleted = false
      LEFT JOIN games g ON g.id = col.game_id
      ${cardCatalogJoinSql({ gameKey: sql`g.key`, lang: sql`col.lang` }, CC_ALIAS_SQL_COLUMNS)}
      LEFT JOIN LATERAL (
        SELECT
          (count(*) FILTER (WHERE v.is_correct_match AND NOT v.is_bad_scan))::int AS correct_count,
          (count(*) FILTER (WHERE NOT v.is_correct_match AND NOT v.is_bad_scan))::int AS incorrect_count,
          (count(*) FILTER (WHERE v.is_bad_scan))::int AS bad_scan_count,
          max(
            CASE
              WHEN v.validated_by_user_id <> ${userId} THEN NULL
              WHEN v.is_bad_scan THEN 'badScan'
              WHEN v.is_correct_match THEN 'correct'
              ELSE 'incorrect'
            END
          ) AS your_verdict
        FROM platform_match_validations v
        WHERE v.scan_id = cc.guid
      ) votes ON true
      WHERE ${scansInValidationSql}
      ORDER BY cc.scanned_at DESC, cc.id DESC
      LIMIT ${pageSize}
      OFFSET ${(page - 1) * pageSize}
    `);
    const rows = scansResult.rows as unknown as MatchValidationScanRow[];
    const items: MatchValidationScan[] = await Promise.all(
      rows.map(async (row) => {
        const verdictCounts = {
          correctCount: row.correct_count,
          incorrectCount: row.incorrect_count,
          badScanCount: row.bad_scan_count,
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
          yourVerdict: row.your_verdict,
          status: matchValidationStatus(verdictCounts),
        };
      }),
    );
    return c.json({ success: true, data: { items, total, page, pageSize } });
  })
  .get("/queue", requireAuth, async (c) => {
    const userId = c.get("userId");
    const openToUserSql = scansOpenToUserSql(userId);
    const queueResult = await db.execute(sql`
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
          THEN cc.diagnostics -> 'ocr' -> 'regions' END AS ocr_regions,
        ${reviewCountSql} AS review_count
      FROM collection_cards cc
      JOIN collections col ON col.id = cc.collection_id AND col.is_deleted = false
      LEFT JOIN games g ON g.id = col.game_id
      ${cardCatalogJoinSql({ gameKey: sql`g.key`, lang: sql`col.lang` }, CC_ALIAS_SQL_COLUMNS)}
      WHERE ${openToUserSql}
      ORDER BY
        review_count DESC,
        cc.low_confidence_match DESC,
        cc.scanned_at DESC
      LIMIT ${MATCH_VALIDATION_QUEUE_LIMIT}
    `);
    const rows = queueResult.rows as unknown as MatchValidationQueueRow[];
    const catalogCards = await hydrateSavedCards(
      rows.map((row) => ({
        gameKey: row.game_key,
        lang: row.collection_lang,
        card: row.card,
      })),
      { includeRaw: false },
    );

    const countsResult = await db.execute(sql`
      SELECT
        (SELECT count(*)::int FROM platform_match_validations
          WHERE validated_by_user_id = ${userId}) AS validated_by_you,
        (SELECT count(*)::int FROM platform_match_validations) AS validated_by_community
    `);
    const counts = countsResult.rows[0] as unknown as MatchValidationCountsRow;

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
          reviewCount: row.review_count,
        })),
      ),
      counts: {
        validatedByYou: counts.validated_by_you,
        validatedByCommunity: counts.validated_by_community,
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

    const validation = {
      ...scan,
      isCorrectMatch: verdict === "badScan" ? null : verdict === "correct",
      isBadScan: verdict === "badScan",
      validatedByUserId: c.get("userId"),
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
