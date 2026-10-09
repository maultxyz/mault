import type { PlayingCard } from "@magic-vault/shared";

export interface PublicApiCardCursor {
  t?: string;
  i: number;
}

export interface PublicApiCardFilters {
  since: string | null;
  cursor: PublicApiCardCursor | null;
  limit: number;
  collectionGuid: string | null;
  locationGuid: string | null;
  inStorage: boolean | null;
  cardIds: string[] | null;
  name: string | null;
  set: string | null;
  number: string | null;
  foil: boolean | null;
}

export interface RateLimitWindow {
  startedAt: number;
  count: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

export interface PublicApiCardRow {
  id: number;
  scan_id: string;
  card_id: string;
  is_foil: boolean;
  foil_type: string | null;
  needs_review: boolean;
  card: PlayingCard;
  price: number | string | null;
  collection_guid: string;
  collection_name: string;
  lang: string;
  game: string | null;
  location_guid: string | null;
  location_name: string | null;
  location_position: number | null;
  scanned_at: string;
  created_at: string;
  updated_at: string;
  cursor_ts: string;
}

export interface PublicApiCollectionRow {
  guid: string;
  name: string;
  game: string | null;
  lang: string;
  card_count: number;
}

export interface PublicApiLocationRow {
  guid: string;
  name: string;
  card_count: number;
  created_at: string;
}
