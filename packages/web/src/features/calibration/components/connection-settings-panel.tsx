import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useDevice } from "@/features/calibration/api/use-device";
import { useSaveDeviceSettings } from "@/features/calibration/api/use-save-device-settings";
import { useTranslation } from "react-i18next";

export function ConnectionSettingsPanel() {
  const { t } = useTranslation("calibration");
  const device = useDevice();
  const mutation = useSaveDeviceSettings(t("connectionSettings.saveFailed"));

  return (
    <div className="flex flex-col gap-2">
      <Label>{t("connectionSettings.title")}</Label>
      <div className="flex flex-col gap-2 rounded-lg border p-3">
        <label className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium">
            {t("connectionSettings.autoConnectLabel")}
          </span>
          {device?.guid ? (
            <Switch
              checked={device.autoConnect}
              disabled={mutation.isPending}
              onCheckedChange={(autoConnect) =>
                mutation.mutate({ guid: device.guid, patch: { autoConnect } })
              }
            />
          ) : (
            <Skeleton className="h-4 w-7 rounded-full" />
          )}
        </label>
        <p className="text-[10px] text-foreground/70">
          {t("connectionSettings.autoConnectDescription")}
        </p>
      </div>
    </div>
  );
}
