import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { binsQueryOptions } from "@/features/bins/api/sort-bins";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { BinCard } from "@/features/bins/components/bin-card";
import { useOrg } from "@/features/companies/api/use-organization";
import type { BinListProps } from "@/lib/interfaces/bins";
import {
  getAlphabetPassLetters,
  getOverflowSources,
  getRepackPackBins,
  isRulesMode,
} from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { useBinMachineLayout } from "@/features/bins/api/use-bin-machine-layout";
import { cn } from "@/lib/utils";

export function BinList({ onOpenBin }: BinListProps) {
  const { t } = useTranslation("bins");
  const {
    configs,
    selectedBin,
    setSelectedBin,
    hasCatchAll,
    effectiveMode,
    isModeDirty,
    selectedSet,
  } = useBinConfigs();
  const isAutoAssign = !!effectiveMode.autoAssignField;
  const isScanOnly = effectiveMode.scanOnly;
  const showOverflow = isRulesMode(effectiveMode) && !isModeDirty;
  const alphabetLetters =
    effectiveMode.isAlphabetMode && !isModeDirty
      ? getAlphabetPassLetters(
          configs,
          selectedSet?.alphabetPass ?? 0,
          selectedSet?.alphabetPrefix ?? "",
        )
      : null;
  const repackPackBins =
    effectiveMode.isRepackMode && !isModeDirty && selectedSet
      ? new Set(
          getRepackPackBins(configs, selectedSet).map((bin) => bin.binNumber),
        )
      : null;
  const { activeOrg } = useOrg();
  const { isLoading } = useQuery({ ...binsQueryOptions, enabled: !!activeOrg });
  const binNumbers = useMemo(
    () => configs.map((config) => config.binNumber),
    [configs],
  );
  const layout = useBinMachineLayout(binNumbers);
  const configByBin = useMemo(
    () => new Map(configs.map((config) => [config.binNumber, config])),
    [configs],
  );
  const slots = [
    ...layout.rows.flatMap((row, rowIndex) =>
      row.map((binNumber, slot) => ({
        key: `row-${rowIndex}-${slot}`,
        config: binNumber != null ? configByBin.get(binNumber) : undefined,
        cellClassName: cn(rowIndex > 0 && "border-t", slot === 0 && "border-r"),
      })),
    ),
    ...layout.bottom.map((binNumber, index) => ({
      key: `bottom-${binNumber}`,
      config: configByBin.get(binNumber),
      cellClassName: cn(
        "col-span-2",
        (layout.rows.length > 0 || index > 0) && "border-t",
      ),
    })),
  ];

  if (isLoading) {
    return (
      <ScrollArea>
        <div className="flex flex-col rounded-lg overflow-hidden border">
          {Array.from({ length: configs.length || 7 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-13 rounded-none border-b last:border-b-0"
            />
          ))}
        </div>
      </ScrollArea>
    );
  }

  return (
    <div className="flex flex-col gap-2 overflow-y-auto" data-tour="bin-list">
      <div className="grid grid-cols-2 overflow-hidden rounded-lg border">
        {slots.map(({ key, config, cellClassName }) =>
          config ? (
            <div key={key} className={cn("flex min-w-0", cellClassName)}>
              <BinCard
                className="h-full rounded-none"
                config={config}
                showPickList={isRulesMode(effectiveMode) && !isModeDirty}
                active={config.binNumber === selectedBin}
                isAutoAssign={isAutoAssign}
                isScanOnly={isScanOnly}
                isScanOnlyTarget={
                  isScanOnly &&
                  !isModeDirty &&
                  config.binNumber ===
                    (selectedSet?.scanOnlyBin ??
                      configs.find((c) => c.isCatchAll)?.binNumber)
                }
                isChaosMode={effectiveMode.isChaosMode && !isModeDirty}
                alphabetLetter={
                  alphabetLetters
                    ? (alphabetLetters.get(config.binNumber) ?? null)
                    : undefined
                }
                repackPriority={
                  repackPackBins?.has(config.binNumber)
                    ? config.repackPriority
                    : null
                }
                showOverflow={showOverflow}
                overflowSources={
                  showOverflow
                    ? getOverflowSources(configs, config.binNumber).map(
                        (source) => source.binNumber,
                      )
                    : []
                }
                disabled={isModeDirty}
                onClick={() =>
                  onOpenBin
                    ? onOpenBin(config.binNumber)
                    : setSelectedBin(config.binNumber)
                }
              />
            </div>
          ) : (
            <div key={key} className={cellClassName} />
          ),
        )}
      </div>
      {!hasCatchAll && (
        <p className="text-xs text-destructive">{t("binList.needCatchAll")}</p>
      )}
    </div>
  );
}
