import { sql, type SQL } from "drizzle-orm";
import { collectionCards, intakeLots } from "../db/schema";

export function inventoryCardSql(): SQL {
  return sql`(${collectionCards.intakeLotId} IS NULL OR EXISTS (SELECT 1 FROM ${intakeLots} WHERE ${intakeLots.id} = ${collectionCards.intakeLotId} AND ${intakeLots.status} = 'accepted'))`;
}
