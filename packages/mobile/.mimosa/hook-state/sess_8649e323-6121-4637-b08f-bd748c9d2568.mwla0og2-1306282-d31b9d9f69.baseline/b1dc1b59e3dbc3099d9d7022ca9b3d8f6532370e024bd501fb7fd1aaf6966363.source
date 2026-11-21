import { rankGlobalSearchMatches, type Collection, type StorageLocation } from "@magic-vault/shared";
import type { GlobalSearchLocalResults } from "@/lib/interfaces/search";
import type { SettingsSectionLink } from "@/lib/interfaces/settings";

export function searchLocally(
  query: string,
  collections: Collection[],
  locations: StorageLocation[],
  settingsSections: SettingsSectionLink[],
  settingsSectionTitle: (section: SettingsSectionLink) => string,
): GlobalSearchLocalResults {
  return {
    collections: rankGlobalSearchMatches(collections, (collection) => collection.name, query),
    locations: rankGlobalSearchMatches(locations, (location) => location.name, query),
    settingsSections: rankGlobalSearchMatches(settingsSections, settingsSectionTitle, query),
  };
}
