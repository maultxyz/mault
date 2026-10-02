import { FirmwareFeatureGate } from "@/components/firmware-feature-gate";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import type { DeviceTogglePanelProps } from "@/lib/interfaces/calibration";
import { useTranslation } from "react-i18next";

export function ExperimentalFeaturesPanel({
  values,
  isLoaded,
  onChange,
}: DeviceTogglePanelProps) {
  const { t } = useTranslation("calibration");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Label>{t("experimentalFeatures.title")}</Label>
        <Badge variant="outline">{t("experimentalFeatures.badge")}</Badge>
      </div>
      <FirmwareFeatureGate
        feature="pipelinedFeed"
        className="flex flex-col gap-2 rounded-lg border p-3"
      >
        <label className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium">
            {t("experimentalFeatures.pipelinedFeedLabel")}
          </span>
          {isLoaded ? (
            <Switch
              checked={values.pipelinedFeed}
              onCheckedChange={(checked) => onChange("pipelinedFeed", checked)}
            />
          ) : (
            <Skeleton className="h-4 w-7 rounded-full" />
          )}
        </label>
        <p className="text-[10px] text-foreground/70">
          {t("experimentalFeatures.pipelinedFeedDescription")}
        </p>
      </FirmwareFeatureGate>
    </div>
  );
}
