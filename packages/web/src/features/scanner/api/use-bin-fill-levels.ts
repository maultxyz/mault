import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { useBinHeights } from "@/features/calibration/api/use-bin-heights";
import { useCollections } from "@/features/collections/api/use-collections";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import type { BinFillLevel } from "@/lib/interfaces/scanner";
import { computeBinCapacity, countCardsInBin } from "@magic-vault/shared";

export function useBinFillLevels(): BinFillLevel[] {
  const { configs } = useBinConfigs();
  const { heights } = useBinHeights();
  const { cards } = useScannedCards();
  const { activeCollection } = useCollections();
  const cardThickness = activeCollection?.game?.cardThickness ?? null;

  return configs
    .map((bin): BinFillLevel => {
      const height = heights.find((h) => h.binNumber === bin.binNumber)?.height;
      const capacity = computeBinCapacity(
        height,
        cardThickness,
        bin.cardLimit ?? null,
      );
      const count = countCardsInBin(cards, bin);
      const percent = capacity ? Math.min(100, Math.round((count / capacity) * 100)) : 0;
      return { binNumber: bin.binNumber, count, capacity, percent };
    })
    .sort((a, b) => a.binNumber - b.binNumber);
}
