import type { CardCondition } from "./card-condition.interface";
import type { FieldMeta } from "./sort-bins.interface";
import type { PlayingCardWithDistance } from "./card.interface";
import type { ScannedCard } from "./scanner.interface";

export interface ExportContext {
  isMtg: boolean;
  fieldDefinitions: FieldMeta[];
  gameKey?: string;
  gameName?: string;
}

export interface GroupedEntry {
  card: PlayingCardWithDistance;
  quantity: number;
  isFoil: boolean;
  foilType?: string;
  condition: CardCondition;
}

export type GroupBy = "card" | "card-foil";

export type ExportableCard = Pick<ScannedCard, "card" | "isFoil" | "foilType" | "condition">;

export interface ExportAdapter {
  key: string;
  label: string;
  filenameSlug: string;
  groupBy: GroupBy;
  games: "all" | string[];
  headers: (ctx: ExportContext) => string[];
  row: (entry: GroupedEntry, ctx: ExportContext) => string[];
}
