import type {
  API_FINISHES,
  API_KEY_SCOPES,
} from "../constants/api-keys.constant";

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

export type ApiErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "rate_limited"
  | "internal_error";

export interface ApiError {
  object: "error";
  code: ApiErrorCode;
  status: number;
  details: string;
}

export interface ApiList<T> {
  object: "list";
  has_more: boolean;
  next_page: string | null;
  data: T[];
}

export interface ApiScannedCardList extends ApiList<ApiScannedCard> {
  next_since: string;
}

export interface ApiCollectionRef {
  object: "collection";
  id: string;
  name: string;
}

export interface ApiCollection extends ApiCollectionRef {
  game: string | null;
  lang: string;
  card_count: number;
}

export interface ApiLocationRef {
  object: "location";
  id: string;
  name: string;
}

export interface ApiCardLocation extends ApiLocationRef {
  position: number;
}

export interface ApiLocation extends ApiLocationRef {
  card_count: number;
  created_at: string;
}

export interface ApiPrices {
  usd: string | null;
  usd_foil: string | null;
  eur: string | null;
  eur_foil: string | null;
}

export type ApiFinish = (typeof API_FINISHES)[number];

export interface ApiScannedCard {
  object: "scanned_card";
  id: string;
  card_id: string;
  name: string;
  set: string;
  set_name: string;
  collector_number: string;
  rarity: string;
  lang: string;
  game: string | null;
  finish: ApiFinish;
  foil_type: string | null;
  prices: ApiPrices;
  location: ApiCardLocation | null;
  collection: ApiCollectionRef;
  needs_review: boolean;
  scanned_at: string;
  created_at: string;
  updated_at: string;
}
