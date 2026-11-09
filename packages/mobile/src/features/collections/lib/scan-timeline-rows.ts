import type { GroupedScannedCard, ScanTimelineBlock } from "@magic-vault/shared";
import type { ScanTimelineListRow } from "@/lib/interfaces/collections";

export function toScanTimelineListRows(
  blocks: ScanTimelineBlock<GroupedScannedCard>[],
  columns: number,
): ScanTimelineListRow[] {
  return blocks.flatMap((block) => {
    const rows: ScanTimelineListRow[] = [
      { kind: "header", key: `header-${block.bucketKey}`, bucketKey: block.bucketKey, cardCount: block.cardCount },
    ];
    for (let index = 0; index < block.cards.length; index += columns) {
      const cards = block.cards.slice(index, index + columns);
      rows.push({ kind: "cards", key: `cards-${cards[0].scanId}`, cards });
    }
    return rows;
  });
}
