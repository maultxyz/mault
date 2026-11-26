import { ORG_PROFILE_SHOWCASE_CARDS_MAX, type OrgProfileShowcaseCard } from "@magic-vault/shared";
import type { OrgProfileShowcaseCardsById, ShowcasePick } from "@/lib/interfaces/org-profile";

const listeners = new Set<() => void>();
let pick: ShowcasePick = { scanIds: [], cardsById: {} };

function update(next: ShowcasePick): void {
  pick = next;
  for (const listener of listeners) listener();
}

export function subscribeToShowcasePick(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function readShowcasePick(): ShowcasePick {
  return pick;
}

export function startShowcasePick(scanIds: string[], cardsById: OrgProfileShowcaseCardsById): void {
  update({ scanIds, cardsById });
}

export function toggleShowcaseCard(card: OrgProfileShowcaseCard): void {
  const isPicked = pick.scanIds.includes(card.scanId);
  if (!isPicked && pick.scanIds.length >= ORG_PROFILE_SHOWCASE_CARDS_MAX) return;
  update({
    scanIds: isPicked ? pick.scanIds.filter((scanId) => scanId !== card.scanId) : [...pick.scanIds, card.scanId],
    cardsById: { ...pick.cardsById, [card.scanId]: card },
  });
}
