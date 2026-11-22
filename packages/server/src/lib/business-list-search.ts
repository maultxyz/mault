import {
  BUSINESS_LIST_SEARCH_MAX_LENGTH,
  BUSINESS_LIST_SEARCH_PARAM,
  BUSINESS_LIST_STATUS_PARAM,
} from "@magic-vault/shared";
import type { Context } from "hono";

export function parseBusinessListSearch(c: Context): string | null {
  const search = (c.req.query(BUSINESS_LIST_SEARCH_PARAM) ?? "")
    .trim()
    .slice(0, BUSINESS_LIST_SEARCH_MAX_LENGTH);
  return search || null;
}

export function parseBusinessListStatus<T extends string>(
  c: Context,
  statuses: readonly T[],
): T | null {
  const status = c.req.query(BUSINESS_LIST_STATUS_PARAM);
  return statuses.find((candidate) => candidate === status) ?? null;
}

export function containsLikePattern(search: string): string {
  return `%${search.replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
}
