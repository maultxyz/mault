import { SettingsSection } from "@/components/settings-section";
import { FirmwareFeatureGate } from "@/components/firmware-feature-gate";
import { Badge } from "@/components/ui/badge";
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
    <SettingsSection
      heading={t("experimentalFeatures.title")}
      badge={<Badge variant="outline">{t("experimentalFeatures.badge")}</Badge>}
    >
      <FirmwareFeatureGate
        feature="pipelinedFeed"
        className="flex flex-col gap-1"
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
        <p className="text-2xs text-foreground/70">
          {t("experimentalFeatures.pipelinedFeedDescription")}
        </p>
      </FirmwareFeatureGate>
    </SettingsSection>
  );
}
