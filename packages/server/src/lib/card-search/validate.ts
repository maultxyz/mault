import type { Response } from "@magic-vault/shared";
import { CATALOG_SEARCH_MIN_QUERY_LENGTH, QUERY_MIN_LENGTH } from "@magic-vault/shared";

function validateQueryLength(query: string, minimumLength: number): Response | null {
  if (!query || query.trim().length < minimumLength) {
    return {
      message: `Your query must be at least ${minimumLength} characters.`,
      success: false,
    };
  }
  return null;
}

export function validateQuery(query: string): Response | null {
  return validateQueryLength(query, QUERY_MIN_LENGTH);
}

export function validateCatalogQuery(query: string): Response | null {
  return validateQueryLength(query, CATALOG_SEARCH_MIN_QUERY_LENGTH);
}
