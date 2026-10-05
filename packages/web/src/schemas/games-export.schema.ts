import { GAME_KEY_PATTERN } from "@/lib/constants/games";
import { z } from "zod";

const exportedFieldSchema = z.object({
  field: z.string().trim().min(1),
  label: z.string().trim().min(1),
  type: z.enum(["string", "numeric", "enum", "set"]),
  path: z.string().trim().min(1),
  options: z
    .array(z.object({ value: z.string().min(1), label: z.string().min(1) }))
    .optional(),
});

const exportedGameSchema = z.object({
  key: z.string().trim().regex(GAME_KEY_PATTERN),
  name: z.string().trim().min(1),
  apiDocsUrl: z.string().trim().url().nullable().default(null),
  foilTypes: z.array(z.string().trim().min(1)).default([]),
  cardThickness: z.number().positive().nullable().default(null),
  isActive: z.boolean().default(true),
  fieldDefinitions: z
    .array(exportedFieldSchema)
    .min(1)
    .refine(
      (fields) => new Set(fields.map((f) => f.field)).size === fields.length,
    ),
});

export const gamesExportSchema = z.object({
  formatVersion: z.literal(1),
  games: z
    .array(exportedGameSchema)
    .min(1)
    .refine(
      (games) => new Set(games.map((g) => g.key)).size === games.length,
    ),
});

export type GamesExport = z.infer<typeof gamesExportSchema>;
export type ExportedGame = GamesExport["games"][number];
