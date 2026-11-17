import { STORED_SEARCH_LIMIT } from "../constants/card-search";

export function catalogSearchPageLimit(rawLimit: string | null | undefined): number {
  const requestedLimit = Number.parseInt(rawLimit ?? "", 10);
  if (!Number.isFinite(requestedLimit) || requestedLimit < 1) return STORED_SEARCH_LIMIT;
  return Math.min(requestedLimit, STORED_SEARCH_LIMIT);
}
