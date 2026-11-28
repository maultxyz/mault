import type { Result } from "@magic-vault/shared";

export function unwrapShopCatalogResult<T>(result: Result<T>, fallback: string): T {
  if (!result.success) throw new Error(result.message || fallback);
  return result.data as T;
}
