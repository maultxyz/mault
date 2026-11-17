import { sql } from "drizzle-orm";
import type { CatalogJoinScope } from "../interfaces/saved-cards";

export const STORED_CARD_CATALOG_SCOPE: CatalogJoinScope = {
  gameKey: sql`g.key`,
  lang: sql`col.lang`,
};

export const STORED_CARD_COLLECTION_JOINS = sql`JOIN collections col ON col.id = cc.collection_id AND NOT col.is_deleted LEFT JOIN games g ON g.id = col.game_id`;

export const STORED_CARD_POSITION_ORDER = sql`COALESCE(cc.location_position, 0), cc.id`;

export const WANTED_LINE_NAME_MATCH = sql`(lower(cc.card_name) = w.name OR lower(split_part(cc.card_name, ' // ', 1)) = w.name)`;

export const INVENTORY_CARD_JOINS = sql`JOIN storage_locations sl ON sl.id = cc.location_id AND NOT sl.is_deleted
  JOIN collections col ON col.id = cc.collection_id AND NOT col.is_deleted
  LEFT JOIN intake_lots il ON il.id = cc.intake_lot_id`;

export const INVENTORY_CARD_FILTER = sql`(il.id IS NULL OR il.status = 'accepted')`;
