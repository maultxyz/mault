import type { FieldMeta, FieldRenames, FieldType, Game } from "@magic-vault/shared";
import type { ExportedGame } from "@/schemas/games-export.schema";

export interface GameInput {
  key: string;
  name: string;
  fieldDefinitions: FieldMeta[];
  fieldRenames?: FieldRenames;
  foilTypes: string[];
  apiDocsUrl?: string | null;
  cardThickness?: number | null;
  isActive: boolean;
}

export interface SampleCard {
  name: string;
  raw: unknown;
}

export interface PickedField {
  field: string;
  label: string;
  type: FieldType;
  path: string;
}

export interface GamesImportPlan {
  creates: ExportedGame[];
  updates: { guid: string; game: ExportedGame }[];
}

export interface GamesTransferMenuProps {
  games: Game[];
}
