import type { PlayingCard } from "./card.interface";
import type { CardStorageLocation } from "./storage-locations.interface";
import type { API_KEY_SCOPES } from "../constants/api-keys.constant";

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

export interface OrgApiKey {
  guid: string;
  name: string;
  keyPrefix: string;
  scope: ApiKeyScope;
  createdBy: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface OrgApiKeyList {
  keys: OrgApiKey[];
  canManage: boolean;
}

export interface OrgApiKeyInput {
  name: string;
  scope: ApiKeyScope;
}

export interface CreatedOrgApiKey {
  apiKey: OrgApiKey;
  rawKey: string;
}

export interface PublicApiCollection {
  guid: string;
  name: string;
  game: string | null;
  lang: string;
  cardCount: number;
}

export interface PublicApiLocation {
  guid: string;
  name: string;
  cardCount: number;
  createdAt: string;
}

export interface PublicApiCard {
  scanId: string;
  collection: { guid: string; name: string };
  game: string | null;
  lang: string;
  cardId: string;
  name: string;
  set: string;
  setName: string;
  collectorNumber: string;
  rarity: string;
  isFoil: boolean;
  foilType: string | null;
  price: number | null;
  currency: string;
  needsReview: boolean;
  location: CardStorageLocation | null;
  scannedAt: string;
  createdAt: string;
  updatedAt: string;
  card: PlayingCard;
}

export interface PublicApiPage<T> {
  items: T[];
  nextCursor: string | null;
  nextSince: string;
}
