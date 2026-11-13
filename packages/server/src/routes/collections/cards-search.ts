import { Hono } from "hono";
import { sql } from "drizzle-orm";
import {
  normalizeOwnedCardSearchQuery,
  ownedCardSearchLimit,
  type OwnedCardSearchResult,
} from "@magic-vault/shared";
import { authQuery } from "../../db";
import { cardCatalogJoinSql } from "../../lib/card-catalog-sql";
import { CC_ALIAS_SQL_COLUMNS } from "../../lib/constants/card-prices";
import { INVENTORY_CARD_FILTER } from "../../lib/constants/storage-locations";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import type { OwnedCardSearchRow } from "../../lib/interfaces/owned-card-search";

export const searchOwnedCardsRoute = new Hono<AppEnv>().get(
  "/cards/search",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const query = normalizeOwnedCardSearchQuery(c.req.query("q"));
    if (!query) return c.json({ success: true, data: [] as OwnedCardSearchResult[] });
    const limit = ownedCardSearchLimit(c.req.query("limit"));
    const rows = await authQuery(c.get("jwtClaims"), async (tx) => {
      const result = await tx.execute(sql`
        SELECT
          cc.guid::text AS scan_id,
          col.guid::text AS collection_guid,
          col.name AS collection_name,
          cc.card_name,
          cc.card_set AS set_code,
          COALESCE(cat.set_name, cc.card_set_name) AS set_name,
          cc.card_collector_number AS collector_number,
          COALESCE(cat.image_small, cc.card_image_small) AS image_url,
          cc.is_foil,
          sl.guid::text AS location_guid,
          sl.name AS location_name,
          CASE WHEN sl.id IS NULL THEN NULL ELSE cc.location_position END AS location_position
        FROM collection_cards cc
        JOIN collections col ON col.id = cc.collection_id AND col.is_deleted = false
        LEFT JOIN games g ON g.id = col.game_id
        LEFT JOIN intake_lots il ON il.id = cc.intake_lot_id
        LEFT JOIN storage_locations sl ON sl.id = cc.location_id AND sl.is_deleted = false
        ${cardCatalogJoinSql({ gameKey: sql`g.key`, lang: sql`col.lang` }, CC_ALIAS_SQL_COLUMNS)}
        WHERE cc.org_id = ${orgId}
          AND ${INVENTORY_CARD_FILTER}
          AND strpos(lower(cc.card_name), ${query}) > 0
        ORDER BY
          CASE WHEN starts_with(lower(cc.card_name), ${query}) THEN 0 ELSE 1 END,
          cc.card_name,
          col.name,
          cc.scanned_at DESC
        LIMIT ${limit}
      `);
      return result.rows as unknown as OwnedCardSearchRow[];
    });
    const data: OwnedCardSearchResult[] = rows.map((row) => ({
      scanId: row.scan_id,
      collectionGuid: row.collection_guid,
      collectionName: row.collection_name,
      cardName: row.card_name ?? "",
      setCode: row.set_code,
      setName: row.set_name,
      collectorNumber: row.collector_number,
      imageUrl: row.image_url,
      isFoil: row.is_foil,
      locationGuid: row.location_guid,
      locationName: row.location_name,
      locationPosition: row.location_position,
    }));
    return c.json({ success: true, data });
  },
);
