import { DeleteDialog } from "@/components/delete-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { useBinFillLevels } from "@/features/scanner/api/use-bin-fill-levels";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function BinStatusMeter() {
  const { t } = useTranslation("scanner");
  const levels = useBinFillLevels();
  const { emptyBin } = useBinConfigs();
  const [confirmBin, setConfirmBin] = useState<number | null>(null);

  if (levels.length === 0) return null;

  return (
    <div className="rounded-lg border overflow-hidden flex-none">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-2 pt-2 pb-1.5">
        {t("binStatusMeter.heading")}
      </p>
      <div className="flex items-end gap-1 px-2 pb-2 h-20">
        {levels.map((level) => (
          <Tooltip key={level.binNumber}>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={() => setConfirmBin(level.binNumber)}
                  className="flex-1 h-full flex flex-col justify-end rounded-sm overflow-hidden bg-muted hover:opacity-80 transition-opacity"
                />
              }
            >
              <div
                className={cn(
                  "w-full transition-all",
                  level.percent >= 90
                    ? "bg-destructive"
                    : level.percent >= 70
                      ? "bg-amber-500"
                      : "bg-primary",
                )}
                style={{
                  height: `${Math.max(level.percent, level.count > 0 ? 6 : 0)}%`,
                }}
              />
            </TooltipTrigger>
            <TooltipContent side="top">
              {level.capacity != null
                ? t("binStatusMeter.tooltipWithCapacity", {
                    bin: level.binNumber,
                    count: level.count,
                    capacity: level.capacity,
                  })
                : t("binStatusMeter.tooltipNoCapacity", {
                    bin: level.binNumber,
                    count: level.count,
                  })}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>

      <DeleteDialog
        open={confirmBin != null}
        onOpenChange={(open) => {
          if (!open) setConfirmBin(null);
        }}
        title={t("binStatusMeter.confirmTitle", { bin: confirmBin })}
        description={t("binStatusMeter.confirmDescription", {
          bin: confirmBin,
        })}
        confirmLabel={t("binStatusMeter.confirmButton")}
        onConfirm={() => {
          if (confirmBin != null) void emptyBin(confirmBin);
          setConfirmBin(null);
        }}
      />
    </div>
  );
}
