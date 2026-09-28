import { useComputedBinFillLevels } from "@/features/scanner/api/use-computed-bin-fill-levels";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import type { BinFillLevel } from "@/lib/interfaces/scanner";

export function useBinFillLevels(): BinFillLevel[] {
  const { unmatchedCards } = useScannedCards();
  return useComputedBinFillLevels(unmatchedCards);
}
