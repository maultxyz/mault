import type { BinCardCount, BinWindow, Result } from "@magic-vault/shared";
import { apiGet, unwrap } from "@/lib/api/client";

export function fetchBinCounts(collectionGuid: string, bins: BinWindow[]): Promise<BinCardCount[]> {
  const params = new URLSearchParams({ bins: JSON.stringify(bins) });
  return unwrap(
    apiGet<Result<BinCardCount[]>>(`/api/collections/${collectionGuid}/cards/bin-counts?${params}`),
  );
}
