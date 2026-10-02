import { SettingsSection } from "@/components/settings-section";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import type { DeviceTogglePanelProps } from "@/lib/interfaces/calibration";
import { useTranslation } from "react-i18next";

export function ConnectionSettingsPanel({
  values,
  isLoaded,
  onChange,
}: DeviceTogglePanelProps) {
  const { t } = useTranslation("calibration");

  return (
    <SettingsSection heading={t("connectionSettings.title")}>
      <div className="flex flex-col gap-1">
        <label className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium">
            {t("connectionSettings.autoConnectLabel")}
          </span>
          {isLoaded ? (
            <Switch
              checked={values.autoConnect}
              onCheckedChange={(checked) => onChange("autoConnect", checked)}
            />
          ) : (
            <Skeleton className="h-4 w-7 rounded-full" />
          )}
        </label>
        <p className="text-2xs text-foreground/70">
          {t("connectionSettings.autoConnectDescription")}
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <label className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium">
            {t("connectionSettings.testOnConnectLabel")}
          </span>
          {isLoaded ? (
            <Switch
              checked={values.testOnConnect}
              onCheckedChange={(checked) => onChange("testOnConnect", checked)}
            />
          ) : (
            <Skeleton className="h-4 w-7 rounded-full" />
          )}
        </label>
        <p className="text-2xs text-foreground/70">
          {t("connectionSettings.testOnConnectDescription")}
        </p>
      </div>
    </SettingsSection>
  );
}
