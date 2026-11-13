import type { Collection, StorageLocation } from "@magic-vault/shared";
import { GLOBAL_SEARCH_MAX_LOCAL_RESULTS } from "@/lib/constants/search";
import type { GlobalSearchLocalResults } from "@/lib/interfaces/search";
import type { SettingsSectionLink } from "@/lib/interfaces/settings";

function matchRank(text: string, normalizedQuery: string): number | null {
  const normalizedText = text.toLowerCase();
  if (normalizedText.startsWith(normalizedQuery)) return 0;
  return normalizedText.includes(normalizedQuery) ? 1 : null;
}

function rankedMatches<T>(items: T[], textOf: (item: T) => string, normalizedQuery: string): T[] {
  return items
    .map((item) => ({ item, rank: matchRank(textOf(item), normalizedQuery) }))
    .filter((entry): entry is { item: T; rank: number } => entry.rank !== null)
    .sort((first, second) => first.rank - second.rank || textOf(first.item).localeCompare(textOf(second.item)))
    .slice(0, GLOBAL_SEARCH_MAX_LOCAL_RESULTS)
    .map((entry) => entry.item);
}

export function searchLocally(
  query: string,
  collections: Collection[],
  locations: StorageLocation[],
  settingsSections: SettingsSectionLink[],
  settingsSectionTitle: (section: SettingsSectionLink) => string,
): GlobalSearchLocalResults {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return { collections: [], locations: [], settingsSections: [] };
  return {
    collections: rankedMatches(collections, (collection) => collection.name, normalizedQuery),
    locations: rankedMatches(locations, (location) => location.name, normalizedQuery),
    settingsSections: rankedMatches(settingsSections, settingsSectionTitle, normalizedQuery),
  };
}
