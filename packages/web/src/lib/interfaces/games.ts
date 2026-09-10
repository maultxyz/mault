import type { FieldMeta, FieldType } from "@magic-vault/shared";

export interface GameInput {
  key: string;
  name: string;
  fieldDefinitions: FieldMeta[];
  apiDocsUrl?: string | null;
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
