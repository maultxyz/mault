import type {
  AdminFoilLabelQueue,
  AdminFoilLabelRequest,
} from "@magic-vault/shared";
import { eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { authProvider } from "../../auth";
import { db } from "../../db";
import { collectionCards, collections, games, platformFoilLabels } from "../../db/schema";
import { cardCatalogJoinSql } from "../../lib/card-catalog-sql";
import {
  ADMIN_FOIL_LABEL_GAME_KEYS,
  ADMIN_FOIL_LABEL_QUEUE_LIMIT,
} from "../../lib/constants/admin-foil-labels";
import { CC_ALIAS_SQL_COLUMNS } from "../../lib/constants/card-prices";
import { UUID_PATTERN } from "../../lib/constants/validation";
import type {
  AdminFoilLabelCountsRow,
  AdminFoilLabelQueueRow,
} from "../../lib/interfaces/admin-foil-labels";
import { resolveScanImageUrl } from "../../lib/scan-images";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";

const labelledGameKeysSql = sql.join(
  ADMIN_FOIL_LABEL_GAME_KEYS.map((gameKey) => sql`${gameKey}`),
  sql`, `,
);

const unlabelledFoilScansSql = sql`
  g.key IN (${labelledGameKeysSql})
  AND cc.is_foil = true
  AND (cc.captured_image_key IS NOT NULL OR cc.captured_image_data_url IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM platform_foil_labels l WHERE l.scan_id = cc.guid)
`;

export const foilLabelsRoute = new Hono<AppEnv>()
  .get("/foil-labels/queue", requireAuth, requireRole("admin"), async (c) => {
    const queueResult = await db.execute(sql`
      SELECT
        cc.guid::text AS scan_id,
        col.org_id,
        col.name AS collection_name,
        g.key AS game_key,
        cc.card_name,
        cc.card_set AS set_code,
        COALESCE(cat.set_name, cc.card_set_name) AS set_name,
        cc.card_collector_number AS collector_number,
        cc.foil_type AS saved_foil_type,
        (cc.diagnostics -> 'foilDetection' ->> 'foilScore')::float8 AS foil_score,
        COALESCE(cc.diagnostics -> 'foilDetection' ->> 'method', CASE WHEN cc.diagnostics ? 'foilDetection' THEN 'rainbow' END) AS foil_detection_method,
        cc.scanned_at,
        cc.captured_image_key,
        CASE WHEN cc.captured_image_key IS NULL THEN cc.captured_image_data_url END AS captured_image_data_url,
        COALESCE(cat.image_small, cc.card_image_small) AS catalog_image_url
      FROM collection_cards cc
      JOIN collections col ON col.id = cc.collection_id AND col.is_deleted = false
      LEFT JOIN games g ON g.id = col.game_id
      ${cardCatalogJoinSql({ gameKey: sql`g.key`, lang: sql`col.lang` }, CC_ALIAS_SQL_COLUMNS)}
      WHERE ${unlabelledFoilScansSql}
      ORDER BY cc.scanned_at DESC
      LIMIT ${ADMIN_FOIL_LABEL_QUEUE_LIMIT}
    `);
    const rows = queueResult.rows as unknown as AdminFoilLabelQueueRow[];

    const countsResult = await db.execute(sql`
      SELECT
        (SELECT count(*)::int FROM collection_cards cc
          JOIN collections col ON col.id = cc.collection_id AND col.is_deleted = false
          JOIN games g ON g.id = col.game_id
          WHERE ${unlabelledFoilScansSql}) AS remaining,
        (SELECT count(*)::int FROM platform_foil_labels
          WHERE is_foil AND game_key IN (${labelledGameKeysSql})) AS labelled_foil,
        (SELECT count(*)::int FROM platform_foil_labels
          WHERE NOT is_foil AND game_key IN (${labelledGameKeysSql})) AS labelled_not_foil
    `);
    const counts = countsResult.rows[0] as unknown as AdminFoilLabelCountsRow;

    const orgNames = await authProvider.getOrganisationNames([
      ...new Set(rows.map((row) => row.org_id)),
    ]);
    const data: AdminFoilLabelQueue = {
      items: await Promise.all(
        rows.map(async (row) => ({
          scanId: row.scan_id,
          orgName: orgNames.get(row.org_id) ?? null,
          collectionName: row.collection_name,
          gameKey: row.game_key,
          cardName: row.card_name,
          setCode: row.set_code,
          setName: row.set_name,
          collectorNumber: row.collector_number,
          savedFoilType: row.saved_foil_type,
          foilScore: row.foil_score,
          foilDetectionMethod: row.foil_detection_method,
          scannedAt: new Date(row.scanned_at).toISOString(),
          capturedImageUrl:
            (await resolveScanImageUrl({
              capturedImageKey: row.captured_image_key,
              capturedImageDataUrl: row.captured_image_data_url,
            })) ?? null,
          catalogImageUrl: row.catalog_image_url,
        })),
      ),
      counts: {
        remaining: counts.remaining,
        labelledFoil: counts.labelled_foil,
        labelledNotFoil: counts.labelled_not_foil,
      },
    };
    return c.json({ success: true, data });
  })
  .post("/foil-labels", requireAuth, requireRole("admin"), async (c) => {
    const { scanId, isFoil } = await c.req.json<AdminFoilLabelRequest>();
    if (typeof scanId !== "string" || !UUID_PATTERN.test(scanId)) {
      return c.json({ success: false, message: "Invalid scan id." }, 400);
    }
    if (typeof isFoil !== "boolean") {
      return c.json({ success: false, message: "Choose foil or not foil." }, 400);
    }

    const [scan] = await db
      .select({
        orgId: collections.orgId,
        gameKey: games.key,
        cardId: collectionCards.cardId,
        cardLang: collectionCards.cardLang,
        capturedImageKey: collectionCards.capturedImageKey,
        savedIsFoil: collectionCards.isFoil,
        savedFoilType: collectionCards.foilType,
        foilScore: sql<number | null>`(${collectionCards.diagnostics} -> 'foilDetection' ->> 'foilScore')::float8`,
      })
      .from(collectionCards)
      .innerJoin(collections, eq(collections.id, collectionCards.collectionId))
      .leftJoin(games, eq(games.id, collections.gameId))
      .where(eq(collectionCards.guid, scanId))
      .limit(1);
    if (!scan) {
      return c.json({ success: false, message: "That scan no longer exists." }, 404);
    }

    const label = {
      ...scan,
      isFoil,
      labelledByUserId: c.get("userId"),
    };
    await db
      .insert(platformFoilLabels)
      .values({ scanId, ...label })
      .onConflictDoUpdate({
        target: [platformFoilLabels.scanId],
        set: { ...label, updatedAt: new Date() },
      });
    return c.json({ success: true, message: "Saved." });
  });
