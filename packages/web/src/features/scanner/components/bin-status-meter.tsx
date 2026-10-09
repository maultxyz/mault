import { DeleteDialog } from "@/components/delete-dialog";
import { Button } from "@/components/ui/button";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { useBinRoutes } from "@/features/calibration/api/use-bin-routes";
import { useCollections } from "@/features/collections/api/use-collections";
import { useBinFillLevels } from "@/features/scanner/api/use-bin-fill-levels";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { BinLevelCell } from "@/features/scanner/components/bin-level-cell";
import { EmptyBinToLocationDialog } from "@/features/storage/components/empty-bin-to-location-dialog";
import {
  buildBinLevelLayout,
  summarizeBinLevels,
} from "@/features/scanner/lib/bin-levels";
import { BIN_LEVELS_COLLAPSED_STORAGE_KEY } from "@/lib/constants/storage-keys";
import { cn } from "@/lib/utils";
import {
  IconAlertTriangle,
  IconChevronDown,
  IconTrash,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(BIN_LEVELS_COLLAPSED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function BinStatusMeter() {
  const { t } = useTranslation("scanner");
  const levels = useBinFillLevels();
  const { configs, emptyBin, emptyAllBins, selectedSet } = useBinConfigs();
  const { activeCollection } = useCollections();
  const { routes } = useBinRoutes();
  const { lastRoutedBin } = useScannedCards();
  const [confirmBin, setConfirmBin] = useState<number | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);
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
  const summary = useMemo(() => summarizeBinLevels(levels), [levels]);

  if (levels.length === 0) return null;

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(BIN_LEVELS_COLLAPSED_STORAGE_KEY, next ? "1" : "0");
    } catch {}
  };

  const renderCell = (
    binNumber: number | undefined,
    key: string,
    className: string,
  ) => {
    const level = binNumber != null ? levelByBin.get(binNumber) : undefined;
    if (!level) return <div key={key} className={className} />;
    return (
      <BinLevelCell
        key={key}
        className={className}
        level={level}
        isCatchAll={catchAllBin === level.binNumber}
        isDisabled={disabledBins.has(level.binNumber)}
        flashKey={
          lastRoutedBin?.binNumber === level.binNumber ? lastRoutedBin.at : null
        }
        onEmpty={setConfirmBin}
      />
    );
  };

  return (
    <div className="flex-none rounded-lg border border-input bg-input/20 dark:bg-input/30">
      <div className="flex items-center">
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          className="flex min-w-0 flex-1 items-center gap-2 p-2 text-left"
        >
          <p className="text-2xs font-medium uppercase tracking-wide text-foreground/70">
            {t("binStatusMeter.heading")}
          </p>
          {collapsed && (
            <span className="flex min-w-0 flex-1 items-center gap-1.5 text-xs">
              <span className="truncate">
                {summary.fullest
                  ? t("binStatusMeter.summaryFullest", {
                      count: summary.totalCards,
                      bin: summary.fullest.binNumber,
                      percent: summary.fullest.percent,
                    })
                  : t("binStatusMeter.summaryTotal", {
                      count: summary.totalCards,
                    })}
              </span>
              {summary.needsEmptying > 0 && (
                <span className="flex shrink-0 items-center gap-0.5 font-medium text-warning-foreground">
                  <IconAlertTriangle className="size-3.5" />
                  {summary.needsEmptying}
                </span>
              )}
            </span>
          )}
          <IconChevronDown
            className={cn(
              "ml-auto size-4 shrink-0 text-foreground/70 transition-transform",
              !collapsed && "rotate-180",
            )}
            aria-label={
              collapsed
                ? t("binStatusMeter.expand")
                : t("binStatusMeter.collapse")
            }
          />
        </button>
        {!collapsed && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="mr-1.5"
            disabled={summary.totalCards === 0}
            onClick={() => setConfirmAll(true)}
          >
            <IconTrash />
            {t("binStatusMeter.emptyAll")}
          </Button>
        )}
      </div>

      {!collapsed && (
        <div className="grid grid-cols-2">
          {layout.rows.flatMap((row, rowIndex) =>
            row.map((binNumber, slot) =>
              renderCell(
                binNumber,
                `row-${rowIndex}-${slot}`,
                cn("border-t border-input", slot === 0 && "border-r"),
              ),
            ),
          )}
          {layout.bottom.map((binNumber) =>
            renderCell(
              binNumber,
              `bottom-${binNumber}`,
              "col-span-2 border-t border-input",
            ),
          )}
        </div>
      )}

      <DeleteDialog
        open={confirmAll}
        onOpenChange={setConfirmAll}
        title={t("binStatusMeter.emptyAllTitle")}
        description={t("binStatusMeter.emptyAllDescription", {
          count: summary.totalCards,
        })}
        confirmLabel={t("binStatusMeter.emptyAllConfirm")}
        focusConfirm
        onConfirm={() => {
          void emptyAllBins(levels.map((level) => level.binNumber));
        }}
      />

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
    </div>
  );
}
