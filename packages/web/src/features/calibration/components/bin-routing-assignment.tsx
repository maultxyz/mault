import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBinRoutes } from "@/features/calibration/api/use-bin-routes";
import { useModuleCount } from "@/features/calibration/api/use-module-count";
import { computeBinCount, type BinDirection } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";

function SlotSelect({
  label,
  binNumber,
  binNumbers,
  onChange,
}: {
  label: string;
  binNumber: number | undefined;
  binNumbers: number[];
  onChange: (binNumber: number) => void;
}) {
  const { t } = useTranslation("calibration");
  return (
    <div className="flex flex-col gap-1 p-2 bg-sidebar">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <Select
        value={binNumber != null ? String(binNumber) : ""}
        onValueChange={(value) => onChange(Number(value))}
      >
        <SelectTrigger className="h-8 w-full text-xs">
          <SelectValue>
            {binNumber != null
              ? t("binRoutingAssignment.binLabel", { bin: binNumber })
              : ""}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {binNumbers.map((bin) => (
            <SelectItem key={bin} value={String(bin)}>
              {t("binRoutingAssignment.binLabel", { bin })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function BinRoutingAssignment() {
  const { t } = useTranslation("calibration");
  const moduleCount = useModuleCount();
  const { routes, isPending, save, swap, resetToDefaults } = useBinRoutes();

  const binCount = computeBinCount(moduleCount);
  const binNumbers = Array.from({ length: binCount }, (_, i) => i + 1);
  const modules = Array.from({ length: moduleCount }, (_, i) => i + 1);
  const bottomRoutes = routes.filter((r) => r.direction === "bottom");

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
        void swap(
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
    <div className="flex flex-col gap-2" data-tour="bin-routing-assignment">
      <div className="flex items-center justify-between">
        <Label>{t("binRoutingAssignment.label")}</Label>
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={resetToDefaults}
        >
          {t("binRoutingAssignment.resetToDefaults")}
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border divide-y bg-border">
        {modules.map((module) => {
          const left = routes.find(
            (r) => r.module === module && r.direction === "left",
          );
          const right = routes.find(
            (r) => r.module === module && r.direction === "right",
          );
          return (
            <div key={module} className="grid grid-cols-2 gap-px bg-border">
              <SlotSelect
                label={t("binRoutingAssignment.moduleLeft", { module })}
                binNumber={left?.binNumber}
                binNumbers={binNumbers}
                onChange={(bin) => handleSlotChange(module, "left", bin)}
              />
              <SlotSelect
                label={t("binRoutingAssignment.moduleRight", { module })}
                binNumber={right?.binNumber}
                binNumbers={binNumbers}
                onChange={(bin) => handleSlotChange(module, "right", bin)}
              />
            </div>
          );
        })}
      </div>

      {bottomRoutes.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border p-2 bg-sidebar">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("binRoutingAssignment.bottomSectionLabel")}
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
                    {t("binRoutingAssignment.moduleOnly", {
                      module: route.module,
                    })}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {modules.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {t("binRoutingAssignment.moduleOnly", { module: m })}
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
                    {t("binRoutingAssignment.binLabel", {
                      bin: route.binNumber,
                    })}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {binNumbers.map((bin) => (
                    <SelectItem key={bin} value={String(bin)}>
                      {t("binRoutingAssignment.binLabel", { bin })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
