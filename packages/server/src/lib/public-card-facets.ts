import type { PublicCardFacetCount } from "@magic-vault/shared";
import type {
  PublicCardFacetBreakdown,
  PublicCardFacetBreakdownRow,
} from "./interfaces/public-cards";

function toFacetCounts(countsByKey: Map<string, number>): PublicCardFacetCount[] {
  return [...countsByKey.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((left, right) => right.count - left.count);
}

function addCount(countsByKey: Map<string, number>, key: string, count: number) {
  countsByKey.set(key, (countsByKey.get(key) ?? 0) + count);
}

export function summarizePublicCardFacetRows(
  rows: PublicCardFacetBreakdownRow[],
): PublicCardFacetBreakdown {
  const conditionCounts = new Map<string, number>();
  const languageCounts = new Map<string, number>();
  let foilCount = 0;
  let nonFoilCount = 0;
  for (const row of rows) {
    const count = Number(row.count);
    addCount(conditionCounts, row.condition, count);
    addCount(languageCounts, row.language, count);
    if (row.is_foil) foilCount += count;
    else nonFoilCount += count;
  }
  return {
    conditions: toFacetCounts(conditionCounts),
    languages: toFacetCounts(languageCounts),
    foilCount,
    nonFoilCount,
  };
}
