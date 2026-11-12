import {
  OWNED_CARD_SEARCH_DEFAULT_LIMIT,
  OWNED_CARD_SEARCH_MAX_LIMIT,
  OWNED_CARD_SEARCH_QUERY_MAX_LENGTH,
} from "./constants/owned-card-search.constant";

export function normalizeOwnedCardSearchQuery(rawQuery: string | null | undefined): string {
  return (rawQuery ?? "").trim().slice(0, OWNED_CARD_SEARCH_QUERY_MAX_LENGTH).toLowerCase();
}

export function ownedCardSearchLimit(rawLimit: string | null | undefined): number {
  const requestedLimit = Number.parseInt(rawLimit ?? "", 10);
  if (!Number.isFinite(requestedLimit) || requestedLimit < 1) return OWNED_CARD_SEARCH_DEFAULT_LIMIT;
  return Math.min(requestedLimit, OWNED_CARD_SEARCH_MAX_LIMIT);
}
