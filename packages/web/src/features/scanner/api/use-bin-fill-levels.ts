import { useComputedBinFillLevels } from "@/features/scanner/api/use-computed-bin-fill-levels";
import type { BinFillLevel } from "@/lib/interfaces/scanner";

export function useBinFillLevels(): BinFillLevel[] {
  return useComputedBinFillLevels().levels;
}
