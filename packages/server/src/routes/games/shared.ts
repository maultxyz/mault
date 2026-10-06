import type { FieldMeta, FieldRenames, Game } from "@magic-vault/shared";
import { db } from "../../db";
import { games } from "../../db/schema";

export function toGame(row: typeof games.$inferSelect): Game {
  return {
    guid: row.guid!,
    key: row.key,
    name: row.name,
    isActive: row.isActive,
    fieldDefinitions: row.fieldDefinitions as FieldMeta[],
    foilTypes: (row.foilTypes as string[] | null) ?? [],
    apiDocsUrl: row.apiDocsUrl,
    cardThickness: row.cardThickness,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function keyIsTaken(key: string, excludeGuid?: string): Promise<boolean> {
  const existing = await db.query.games.findFirst({
    where: (t, { eq, and }) => and(eq(t.key, key), eq(t.isDeleted, false)),
    columns: { guid: true },
  });
  if (!existing) return false;
  return existing.guid !== excludeGuid;
}
