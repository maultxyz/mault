import { sql } from "drizzle-orm";

export const PUBLIC_CARD_JOINS = sql`JOIN collections col ON col.id = cc.collection_id AND NOT col.is_deleted
  LEFT JOIN games g ON g.id = col.game_id
  LEFT JOIN intake_lots il ON il.id = cc.intake_lot_id`;

export const PUBLIC_CARD_LANGUAGE = sql`COALESCE(cc.language, cc.card_lang, col.lang)`;

export const PUBLIC_CARD_NOT_FOUND_MESSAGE = "This card is no longer available on this link.";
export const PUBLIC_CARD_LINK_QUERY_PARAMS = ["token", "catalog"];
