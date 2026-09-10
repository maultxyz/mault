import type { FieldMeta, Game } from "@magic-vault/shared";
import { db } from "../../db";
import { games } from "../../db/schema";

export function toGame(row: typeof games.$inferSelect): Game {
  return {
    guid: row.guid!,
    key: row.key,
    name: row.name,
    isActive: row.isActive,
    fieldDefinitions: row.fieldDefinitions as FieldMeta[],
    apiDocsUrl: row.apiDocsUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export interface GameInput {
  key: string;
  name: string;
  fieldDefinitions: FieldMeta[];
  apiDocsUrl?: string | null;
  isActive?: boolean;
}

export async function keyIsTaken(key: string, excludeGuid?: string): Promise<boolean> {
  const existing = await db.query.games.findFirst({
    where: (t, { eq }) => eq(t.key, key),
    columns: { guid: true },
  });
  if (!existing) return false;
  return existing.guid !== excludeGuid;
}
