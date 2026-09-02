import type { FieldMeta } from "./sort-bins.interface";

export interface Game {
  guid: string;
  key: string;
  name: string;
  isActive: boolean;
  fieldDefinitions: FieldMeta[];
  // Link to the source TCG API's own documentation, so admins/players can
  // look up what a field's raw values actually mean (e.g. rarity codes,
  // price formats) when writing bin rules against it.
  apiDocsUrl: string | null;
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
