import type { FieldMeta, FieldRenames } from "./sort-bins.interface";

export interface Game {
  guid: string;
  key: string;
  name: string;
  isActive: boolean;
  fieldDefinitions: FieldMeta[];
  foilTypes: string[];
  apiDocsUrl: string | null;
  cardThickness: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicGame {
  key: string;
  name: string;
  cardCount: number;
  languages: string[];
}

export interface GameCoverage {
  guid: string;
  key: string;
  name: string;
  isActive: boolean;
  cardCount: number;
  languages: string[];
  lastUpdated: string | null;
}

export interface GameInput {
  key: string;
  name: string;
  fieldDefinitions: FieldMeta[];
  fieldRenames?: FieldRenames;
  foilTypes?: string[];
  apiDocsUrl?: string | null;
  cardThickness?: number | null;
  isActive?: boolean;
}
