import type { FieldMeta, FieldRenames, FieldType } from "@magic-vault/shared";

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
