import { queryOptions } from "@tanstack/react-query";
import type { BinCardCount, BinConfig, BinContentCard, BinWindow, Result } from "@magic-vault/shared";
import { apiGet, unwrap } from "@/lib/api/client";

export function binWindowsOf(bins: BinConfig[]): BinWindow[] {
  return bins.map((bin) => ({ binNumber: bin.binNumber, lastEmptiedAt: bin.lastEmptiedAt ?? null }));
}

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

export const binCountsQueryOptions = (collectionGuid: string | undefined, bins: BinConfig[]) => {
  const windows = binWindowsOf(bins);
  return queryOptions({
    queryKey: ["bin-counts", collectionGuid, windows] as const,
    queryFn: () => fetchBinCounts(collectionGuid ?? "", windows),
    enabled: !!collectionGuid && windows.length > 0,
  });
};
