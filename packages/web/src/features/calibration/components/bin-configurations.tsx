import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBinHeights } from "@/features/calibration/api/use-bin-heights";
import { useBinRoutes } from "@/features/calibration/api/use-bin-routes";
import { useModuleCount } from "@/features/calibration/api/use-module-count";
import {
  BIN_HEIGHT_PRESETS,
  BIN_SLOTS_PHYSICAL_ORDER,
} from "@/lib/constants/calibration";
import { cn } from "@/lib/utils";
import { computeBinCount, type BinDirection } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";

function SizeSelect({
  binNumber,
  height,
  onChange,
  className,
}: {
  binNumber: number;
  height: number | undefined;
  onChange: (binNumber: number, height: number) => void;
  className?: string;
}) {
  const { t } = useTranslation("calibration");
  const sizeKey =
    BIN_HEIGHT_PRESETS.find((preset) => preset.height === height)?.key ??
    BIN_HEIGHT_PRESETS[0].key;

  return (
    <Select
      value={sizeKey}
      onValueChange={(key) => {
        const preset = BIN_HEIGHT_PRESETS.find((p) => p.key === key)!;
        onChange(binNumber, preset.height);
      }}
    >
      <SelectTrigger className={cn("h-8 w-full text-xs", className)}>
        <SelectValue>{t(`binConfigurations.presets.${sizeKey}`)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {BIN_HEIGHT_PRESETS.map((preset) => (
          <SelectItem key={preset.key} value={preset.key}>
            {t(`binConfigurations.presets.${preset.key}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function BinSlot({
  label,
  binNumber,
  binNumbers,
  onBinChange,
  height,
  onHeightChange,
}: {
  label: string;
  binNumber: number | undefined;
  binNumbers: number[];
  onBinChange: (binNumber: number) => void;
  height: number | undefined;
  onHeightChange: (binNumber: number, height: number) => void;
}) {
  const { t } = useTranslation("calibration");
  return (
    <div className="flex flex-col gap-1.5 p-2 bg-sidebar">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <Select
        value={binNumber != null ? String(binNumber) : ""}
        onValueChange={(value) => onBinChange(Number(value))}
      >
        <SelectTrigger className="h-8 w-full text-xs">
          <SelectValue>
            {binNumber != null ? t("binLabel", { bin: binNumber }) : ""}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {binNumbers.map((bin) => (
            <SelectItem key={bin} value={String(bin)}>
              {t("binLabel", { bin })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {binNumber != null && (
        <SizeSelect
          binNumber={binNumber}
          height={height}
          onChange={onHeightChange}
        />
      )}
    </div>
  );
}

export function BinConfigurations() {
  const { t } = useTranslation("calibration");
  const moduleCount = useModuleCount();
  const { routes, isSaving, save, swap, resetToDefaults } = useBinRoutes();
  const { heights, setHeight } = useBinHeights();

  const binCount = computeBinCount(moduleCount);
  const binNumbers = Array.from({ length: binCount }, (_, i) => i + 1);
  const modules = Array.from({ length: moduleCount }, (_, i) => i + 1);
  const bottomRoutes = routes.filter((r) => r.direction === "bottom");

  function heightFor(binNumber: number) {
    return heights.find((h) => h.binNumber === binNumber)?.height;
  }

  function handleSlotChange(
    module: number,
    direction: BinDirection,
    newBinNumber: number,
  ) {
    const displaced = routes.find(
      (r) => r.module === module && r.direction === direction,
    );
    if (displaced && displaced.binNumber !== newBinNumber) {
      const movingBinPreviousRoute = routes.find(
        (r) => r.binNumber === newBinNumber,
      );
      if (movingBinPreviousRoute) {
        swap(
          { binNumber: newBinNumber, module, direction },
          {
            binNumber: displaced.binNumber,
            module: movingBinPreviousRoute.module,
            direction: movingBinPreviousRoute.direction,
          },
        );
        return;
      }
    }
    save({ binNumber: newBinNumber, module, direction });
  }

  return (
    <div className="flex flex-col gap-2" data-tour="bin-configurations">
      <div className="flex items-center justify-between">
        <Label>{t("binConfigurations.label")}</Label>
        <Button
          variant="outline"
          size="sm"
          disabled={isSaving}
          onClick={resetToDefaults}
        >
          {t("binConfigurations.resetToDefaults")}
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border divide-y bg-border">
        {modules.map((module) => (
          <div key={module} className="grid grid-cols-2 gap-px bg-border">
            {BIN_SLOTS_PHYSICAL_ORDER.map(({ direction, labelKey }) => {
              const route = routes.find(
                (r) => r.module === module && r.direction === direction,
              );
              return (
                <BinSlot
                  key={direction}
                  label={t(labelKey, { module })}
                  binNumber={route?.binNumber}
                  binNumbers={binNumbers}
                  onBinChange={(bin) =>
                    handleSlotChange(module, direction, bin)
                  }
                  height={route ? heightFor(route.binNumber) : undefined}
                  onHeightChange={setHeight}
                />
              );
            })}
          </div>
        ))}
      </div>

      {bottomRoutes.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border p-2 bg-sidebar">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("binConfigurations.bottomSectionLabel")}
          </span>
          {bottomRoutes.map((route) => (
            <div key={route.binNumber} className="flex items-center gap-2">
              <Select
                value={String(route.module)}
                onValueChange={(value) =>
                  save({
                    binNumber: route.binNumber,
                    module: Number(value),
                    direction: "bottom",
                  })
                }
              >
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue>
                    {t("moduleLabel", {
                      module: route.module,
                    })}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {modules.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {t("moduleLabel", { module: m })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={String(route.binNumber)}
                onValueChange={(value) =>
                  handleSlotChange(route.module, "bottom", Number(value))
                }
              >
                <SelectTrigger className="h-8 flex-1 text-xs">
                  <SelectValue>
                    {t("binLabel", {
                      bin: route.binNumber,
                    })}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {binNumbers.map((bin) => (
                    <SelectItem key={bin} value={String(bin)}>
                      {t("binLabel", { bin })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <SizeSelect
                binNumber={route.binNumber}
                height={heightFor(route.binNumber)}
                onChange={setHeight}
                className="flex-1"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
