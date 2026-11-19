import type { FeatureHighlightMonthGroup } from "@/lib/interfaces/feature-highlights";
import type { FeatureHighlight } from "@magic-vault/shared";

export function groupFeatureHighlightsByMonth(
  highlights: FeatureHighlight[],
): FeatureHighlightMonthGroup[] {
  const groups: FeatureHighlightMonthGroup[] = [];
  const groupsByKey = new Map<string, FeatureHighlightMonthGroup>();
  const seenIds = new Set<string>();
  for (const highlight of highlights) {
    if (seenIds.has(highlight.id)) continue;
    seenIds.add(highlight.id);
    const publishedAt = new Date(highlight.publishedAt);
    const key = `${publishedAt.getFullYear()}-${publishedAt.getMonth() + 1}`;
    let group = groupsByKey.get(key);
    if (!group) {
      group = {
        key,
        monthStart: new Date(publishedAt.getFullYear(), publishedAt.getMonth(), 1),
        highlights: [],
      };
      groupsByKey.set(key, group);
      groups.push(group);
    }
    group.highlights.push(highlight);
  }
  return groups;
}
