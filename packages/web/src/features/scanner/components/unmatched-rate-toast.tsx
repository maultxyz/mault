import { Button } from "@/components/ui/button";
import type { UnmatchedRateToastProps } from "@/lib/interfaces/scanner";
import { toast } from "@/lib/toast";
import { IconAlertTriangle, IconAdjustments, IconTextScan2 } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function UnmatchedRateToast({
  toastId,
  suggestOcr,
  onOpenCalibration,
  onOpenSettings,
}: UnmatchedRateToastProps) {
  const { t } = useTranslation("scanner");
  const close = () => toast.dismiss(toastId);

  return (
    <div className="flex w-[356px] max-w-full flex-col gap-3 rounded-lg border bg-popover p-4 text-popover-foreground shadow-lg">
      <div className="flex items-start gap-2.5">
        <IconAlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold">{t("unmatchedRateToast.title")}</p>
          <p className="text-xs text-foreground/70">
            {suggestOcr
              ? t("unmatchedRateToast.descriptionWithOcr")
              : t("unmatchedRateToast.description")}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2 pl-6.5">
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              close();
              onOpenCalibration();
            }}
          >
            <IconAdjustments />
            {t("unmatchedRateToast.calibration")}
          </Button>
          {suggestOcr && (
            <Button
              onClick={() => {
                close();
                onOpenSettings();
              }}
            >
              <IconTextScan2 />
              {t("unmatchedRateToast.turnOnOcr")}
            </Button>
          )}
        </div>
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="ghost"
            className="text-foreground/70"
            onClick={close}
          >
            {t("unmatchedRateToast.dismiss")}
          </Button>
        </div>
      </div>
    </div>
  );
}
