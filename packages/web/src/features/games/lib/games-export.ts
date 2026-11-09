import { DEFAULT_OPERATORS_BY_FIELD_TYPE } from "@magic-vault/shared";
import { GAMES_EXPORT_FORMAT_VERSION } from "@/lib/constants/games";
import type { GamesImportPlan } from "@/lib/interfaces/games";
import {
  gamesExportSchema,
  type ExportedGame,
  type GamesExport,
} from "@/schemas/games-export.schema";
import type { Game, GameInput } from "@magic-vault/shared";

export function buildGamesExport(games: Game[]): GamesExport {
  return {
    formatVersion: GAMES_EXPORT_FORMAT_VERSION,
    games: games.map((g) => ({
      key: g.key,
      name: g.name,
      apiDocsUrl: g.apiDocsUrl,
      cardThickness: g.cardThickness,
      isActive: g.isActive,
      fieldDefinitions: g.fieldDefinitions.map((f) => ({
        field: f.field,
        label: f.label,
        type: f.type,
        path: f.path,
        ...(f.options?.length ? { options: f.options } : {}),
      })),
    })),
  };
}

export function parseGamesExport(text: string): GamesExport {
  return gamesExportSchema.parse(JSON.parse(text));
}

export function toGameInput(game: ExportedGame): GameInput {
  return {
    key: game.key,
    name: game.name,
    apiDocsUrl: game.apiDocsUrl,
    cardThickness: game.cardThickness,
    isActive: game.isActive,
    fieldDefinitions: game.fieldDefinitions.map((f) => ({
      field: f.field,
      label: f.label,
      type: f.type,
      path: f.path,
      operators: DEFAULT_OPERATORS_BY_FIELD_TYPE[f.type],
      ...(f.options?.length ? { options: f.options } : {}),
    })),
  };
}

export function planGamesImport(
  data: GamesExport,
  existing: Game[],
): GamesImportPlan {
  const byKey = new Map(existing.map((g) => [g.key, g]));
  return {
    creates: data.games.filter((g) => !byKey.has(g.key)),
    updates: data.games.flatMap((g) => {
      const target = byKey.get(g.key);
      return target ? [{ guid: target.guid, game: g }] : [];
    }),
  };
}

export function downloadGamesExport(data: GamesExport, fileSlug: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `magic-vault-games-${fileSlug}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
