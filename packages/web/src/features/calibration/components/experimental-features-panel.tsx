import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useDevice } from "@/features/calibration/api/use-device";
import { useSaveDeviceSettings } from "@/features/calibration/api/use-save-device-settings";
import { useTranslation } from "react-i18next";

export function ExperimentalFeaturesPanel() {
  const { t } = useTranslation("calibration");
  const device = useDevice();
  const mutation = useSaveDeviceSettings(t("experimentalFeatures.saveFailed"));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Label>{t("experimentalFeatures.title")}</Label>
        <Badge variant="outline">{t("experimentalFeatures.badge")}</Badge>
      </div>
      <div className="flex flex-col gap-2 rounded-lg border p-3">
        <label className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium">
            {t("experimentalFeatures.pipelinedFeedLabel")}
          </span>
          {device?.guid ? (
            <Switch
              checked={device.pipelinedFeed}
              disabled={mutation.isPending}
              onCheckedChange={(pipelinedFeed) =>
                mutation.mutate({
                  guid: device.guid,
                  patch: { pipelinedFeed },
                })
              }
            />
          ) : (
            <Skeleton className="h-4 w-7 rounded-full" />
          )}
        </label>
        <p className="text-[10px] text-foreground/70">
          {t("experimentalFeatures.pipelinedFeedDescription")}
        </p>
      </div>
    </div>
  );
}
