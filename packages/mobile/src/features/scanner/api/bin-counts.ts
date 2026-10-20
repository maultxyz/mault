import type { BinCardCount, BinContentCard, BinWindow, Result } from "@magic-vault/shared";
import { apiGet, unwrap } from "@/lib/api/client";

export function fetchBinCounts(collectionGuid: string, bins: BinWindow[]): Promise<BinCardCount[]> {
  const params = new URLSearchParams({ bins: JSON.stringify(bins) });
  return unwrap(
    apiGet<Result<BinCardCount[]>>(`/api/collections/${collectionGuid}/cards/bin-counts?${params}`),
  );
}

export function fetchBinContents(collectionGuid: string, bins: BinWindow[]): Promise<BinContentCard[]> {
  const params = new URLSearchParams({ bins: JSON.stringify(bins) });
  return unwrap(
    apiGet<Result<BinContentCard[]>>(`/api/collections/${collectionGuid}/cards/bin-contents?${params}`),
  );
}
