import type { CardTag, CardTagFlags } from "./interfaces/card-tags.interface";

export function cardTagChanges(
  tags: readonly CardTag[],
  enabled: boolean,
): CardTagFlags {
  const changes: CardTagFlags = {};
  if (tags.includes("downloaded")) changes.isDownloaded = enabled;
  if (tags.includes("reviewed")) changes.reviewed = enabled;
  if (tags.includes("corrected")) changes.corrected = enabled;
  if (enabled && (tags.includes("reviewed") || tags.includes("corrected"))) {
    changes.reviewed = true;
    changes.lowConfidenceMatch = false;
  }
  return changes;
}

export function withCardTags<T extends CardTagFlags>(
  card: T,
  tags: readonly CardTag[],
  enabled: boolean,
): T {
  return { ...card, ...cardTagChanges(tags, enabled) };
}

export function cardTagsSetOn(card: CardTagFlags): CardTag[] {
  return [
    ...(card.isDownloaded ? (["downloaded"] as const) : []),
    ...(card.reviewed ? (["reviewed"] as const) : []),
    ...(card.corrected ? (["corrected"] as const) : []),
  ];
}
