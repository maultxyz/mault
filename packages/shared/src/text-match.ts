import type { CardTextSearchResult } from "./interfaces/api.interface";

function textMatchRank(result: CardTextSearchResult | null): number[] {
  if (!result?.data?.length) return [0, 0, 0];
  return [1, result.ocr?.printingConfirmed ? 1 : 0, result.ocr?.nameScore ?? 0];
}

export function isStrongerTextMatch(
  candidate: CardTextSearchResult | null,
  current: CardTextSearchResult | null,
): boolean {
  const a = textMatchRank(candidate);
  const b = textMatchRank(current);
  const index = a.findIndex((value, i) => value !== b[i]);
  return index !== -1 && a[index] > b[index];
}
