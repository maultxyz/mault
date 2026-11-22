import type {
  CardGridTile,
  InlineUnmatchedCards,
} from "./interfaces/collection-cards.interface";
import type { ScannedCard } from "./interfaces/scanner.interface";

export function buildCardGridTiles<Card extends ScannedCard>(
  cards: readonly Card[],
  unmatched: InlineUnmatchedCards | undefined,
): CardGridTile<Card>[] {
  const unmatchedItems = unmatched?.items ?? [];
  const tiles: CardGridTile<Card>[] = [];
  let unmatchedIndex = 0;
  const addUnmatchedNewerThan = (scannedAt: number) => {
    while (
      unmatchedIndex < unmatchedItems.length &&
      unmatchedItems[unmatchedIndex].scannedAt >= scannedAt
    ) {
      tiles.push({ kind: "unmatched", entry: unmatchedItems[unmatchedIndex] });
      unmatchedIndex += 1;
      if (unmatchedIndex === unmatchedItems.length) addHiddenUnmatchedTile();
    }
  };
  const addHiddenUnmatchedTile = () => {
    const hiddenCount = (unmatched?.totalInPage ?? 0) - unmatchedItems.length;
    const lastShown = unmatchedItems.at(-1);
    if (hiddenCount > 0 && lastShown) {
      tiles.push({ kind: "moreUnmatched", hiddenCount, position: lastShown.position + 1 });
    }
  };
  for (const entry of cards) {
    addUnmatchedNewerThan(entry.scannedAt);
    tiles.push({ kind: "card", entry });
  }
  addUnmatchedNewerThan(Number.NEGATIVE_INFINITY);
  return tiles;
}
