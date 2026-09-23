import type { GroupedScannedCard } from "@/lib/interfaces/cards";
import type { ScannedCard } from "@magic-vault/shared";

// Same identity as the export grouping (features/cards/lib/export/base.ts):
// printing id + foil state + foil type. Order follows first occurrence, so a
// list already sorted by the caller stays in that order.
export function groupScannedCards(cards: ScannedCard[]): GroupedScannedCard[] {
  const order: string[] = [];
  const groups = new Map<string, GroupedScannedCard>();
  for (const entry of cards) {
    const isFoil = !!entry.isFoil;
    const key = `${entry.card.id}:${isFoil}:${entry.foilType ?? ""}`;
    const existing = groups.get(key);
    if (existing) {
      existing.scanIds.push(entry.scanId);
      existing.quantity++;
    } else {
      groups.set(key, { ...entry, scanIds: [entry.scanId], quantity: 1 });
      order.push(key);
    }
  }
  return order.map((key) => groups.get(key)!);
}

export function toDisplayEntries(
  cards: ScannedCard[],
  grouped: boolean,
): GroupedScannedCard[] {
  return grouped
    ? groupScannedCards(cards)
    : cards.map((c) => ({ ...c, scanIds: [c.scanId], quantity: 1 }));
}
