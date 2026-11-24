import { sql, type AnyColumn, type SQL } from "drizzle-orm";
import { collectionCards, intakeLots } from "../db/schema";

export function inventoryCardSql(
  intakeLotIdColumn: SQL | AnyColumn = collectionCards.intakeLotId,
): SQL {
  return sql`(${intakeLotIdColumn} IS NULL OR EXISTS (SELECT 1 FROM ${intakeLots} WHERE ${intakeLots.id} = ${intakeLotIdColumn} AND ${intakeLots.status} = 'accepted'))`;
}
