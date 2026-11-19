import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { useBinRoutes } from "@/features/calibration/api/use-bin-routes";
import { useCollections } from "@/features/collections/api/use-collections";
import { useBinFillLevels } from "@/features/scanner/api/use-bin-fill-levels";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { BinLevelCell } from "@/features/scanner/components/bin-level-cell";
import { EmptyBinToLocationDialog } from "@/features/storage/components/empty-bin-to-location-dialog";
import { buildBinLevelLayout } from "@/lib/bin-machine-layout";
import type { BinLevelGridProps } from "@/lib/interfaces/scanner";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

export function BinLevelGrid({ className }: BinLevelGridProps) {
  const levels = useBinFillLevels();
  const { configs, emptyBin, selectedSet } = useBinConfigs();
  const { activeCollection } = useCollections();
  const { routes } = useBinRoutes();
  const { lastRoutedBin } = useScannedCards();
  const [confirmBin, setConfirmBin] = useState<number | null>(null);
  const catchAllBin = configs.find((c) => c.isCatchAll)?.binNumber;
  const disabledBins = new Set(
    configs
      .filter((c) => !c.isCatchAll && c.isDisabled)
      .map((c) => c.binNumber),
  );

  const layout = useMemo(
    () =>
      buildBinLevelLayout(
        routes,
        levels.map((level) => level.binNumber),
      ),
    [routes, levels],
  );
  const levelByBin = useMemo(
    () => new Map(levels.map((level) => [level.binNumber, level])),
    [levels],
  );

  if (levels.length === 0) return null;

  const renderCell = (
    binNumber: number | undefined,
    key: string,
    cellClassName: string,
  ) => {
    const level = binNumber != null ? levelByBin.get(binNumber) : undefined;
    if (!level) return <div key={key} className={cellClassName} />;
    return (
      <BinLevelCell
        key={key}
        className={cellClassName}
        level={level}
        isCatchAll={catchAllBin === level.binNumber}
        isDisabled={disabledBins.has(level.binNumber)}
        claimedLocationName={
          configs.find((config) => config.binNumber === level.binNumber)
            ?.claimedStorageLocation?.name ?? null
        }
        flashKey={
          lastRoutedBin?.binNumber === level.binNumber ? lastRoutedBin.at : null
        }
        onEmpty={setConfirmBin}
      />
    );
  };

  return (
    <>
      <div className={cn("grid grid-cols-2", className)}>
        {layout.rows.flatMap((row, rowIndex) =>
          row.map((binNumber, slot) =>
            renderCell(
              binNumber,
              `row-${rowIndex}-${slot}`,
              cn("border-t border-border", slot === 0 && "border-r"),
            ),
          ),
        )}
        {layout.bottom.map((binNumber) =>
          renderCell(
            binNumber,
            `bottom-${binNumber}`,
            "col-span-2 border-t border-border",
          ),
        )}
      </div>

      <EmptyBinToLocationDialog
        binNumber={confirmBin}
        preferLocation={!!selectedSet?.isChaosMode}
        collectionGuid={activeCollection?.guid}
        onOpenChange={(open) => {
          if (!open) setConfirmBin(null);
        }}
        onConfirm={async (options) => {
          if (confirmBin == null) return;
          if (await emptyBin(confirmBin, options)) setConfirmBin(null);
        }}
      />
    </>
  );
}
