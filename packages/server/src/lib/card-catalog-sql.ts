import { sql, type SQL } from "drizzle-orm";
import { CARD_CATALOG_ALIAS } from "./constants/saved-cards";
import type { ScannedCardSqlColumns } from "./interfaces/card-prices";
import type { CatalogJoinScope } from "./interfaces/saved-cards";

export function cardCatalogJoinSql(
  { gameKey, lang }: CatalogJoinScope,
  { cardId, cardLang }: Pick<ScannedCardSqlColumns, "cardId" | "cardLang">,
  alias: string = CARD_CATALOG_ALIAS,
): SQL {
  const cat = sql.raw(alias);
  return sql`LEFT JOIN cards ${cat} ON ${cat}.game_key = ${gameKey} AND ${cat}.lang = COALESCE(${cardLang}, ${lang}) AND ${cat}.card_id = ${cardId}`;
}
