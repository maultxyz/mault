import type { ExportableCard, FieldMeta, OrgPricing } from "@magic-vault/shared";

export interface CardExportGame {
  key: string;
  name: string;
  fieldDefinitions: FieldMeta[];
}

export interface CardExportInput {
  format: string;
  combineDuplicates: boolean;
  cards: ExportableCard[];
  gameKeys: (string | null)[];
  game: CardExportGame | null;
  exportName: string;
  pricing: OrgPricing;
}

export type CardExportResult =
  | { success: true; csv: string; filename: string }
  | { success: false; message: string };
