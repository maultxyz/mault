import type { FieldType, Game } from "@magic-vault/shared";
import type { ExportedGame } from "@/schemas/games-export.schema";

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

export interface GameEditorProps {
  game: Game | null;
}

export interface JsonNodeProps {
  path: string;
  keyName: string;
  value: unknown;
  onPick: (field: PickedField) => void;
}

export interface SampleCardBrowserProps {
  gameKey: string;
  onPick: (field: PickedField) => void;
}
