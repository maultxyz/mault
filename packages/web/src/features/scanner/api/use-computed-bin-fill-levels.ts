import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { useBinHeights } from "@/features/calibration/api/use-bin-heights";
import { useBinCardCounts } from "@/features/collections/api/use-collection-cards";
import { useCollections } from "@/features/collections/api/use-collections";
import type {
  BinFillLevel,
  ComputedBinFillLevels,
  SessionStorageBatchStart,
} from "@/lib/interfaces/scanner";
import { NO_SESSION_STORAGE_BATCH_STARTS } from "@/lib/constants/scanner";
import { scanBinCapacity } from "@magic-vault/shared";
import { useMemo } from "react";

export function useComputedBinFillLevels(
  sessionStorageBatchStarts: SessionStorageBatchStart[] = NO_SESSION_STORAGE_BATCH_STARTS,
): ComputedBinFillLevels {
  const { configs, selectedSet } = useBinConfigs();
  const { savedHeights } = useBinHeights();
  const binWindows = useMemo(
    () =>
      configs.map((bin) => ({
        binNumber: bin.binNumber,
        lastEmptiedAt: bin.lastEmptiedAt ?? null,
      })),
    [configs],
  );
  const {
    counts: matchedCounts,
    storageBatchStarts,
    updatedAt: countsUpdatedAt,
  } = useBinCardCounts(binWindows);
  const { activeCollection } = useCollections();
  const cardThickness = activeCollection?.game?.cardThickness ?? null;

  const levels = useMemo(
    () =>
      configs
        .map((bin): BinFillLevel => {
          const height = savedHeights.find(
            (h) => h.binNumber === bin.binNumber,
          )?.height;
          const capacity = scanBinCapacity(
            height,
            cardThickness,
            selectedSet,
            bin,
            [
              ...(storageBatchStarts.get(bin.binNumber) ?? []),
              ...sessionStorageBatchStarts
                .filter(
                  (start) =>
                    start.binNumber === bin.binNumber &&
                    start.lastEmptiedAt === (bin.lastEmptiedAt ?? null),
                )
                .map((start) => start.cardIndex),
            ],
          );
          const count = matchedCounts.get(bin.binNumber) ?? 0;
          const percent = capacity
            ? Math.min(100, Math.round((count / capacity) * 100))
            : 0;
          return { binNumber: bin.binNumber, count, capacity, percent };
        })
        .sort((a, b) => a.binNumber - b.binNumber),
    [
      configs,
      savedHeights,
      matchedCounts,
      storageBatchStarts,
      sessionStorageBatchStarts,
      cardThickness,
      selectedSet,
    ],
  );
  return { levels, countsUpdatedAt };
}
