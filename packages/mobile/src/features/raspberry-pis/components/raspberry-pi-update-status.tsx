import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { piHostUpdateControls } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { useRaspberryPiUpdate } from "@/features/raspberry-pis/api/use-raspberry-pis";
import { SPACING } from "@/lib/constants/theme";
import type { RaspberryPiUpdateStatusProps } from "@/lib/interfaces/raspberry-pis";

export function RaspberryPiUpdateStatus({ host, canManage }: RaspberryPiUpdateStatusProps) {
  const { t } = useTranslation();
  const update = useRaspberryPiUpdate(host.guid);
  const controls = piHostUpdateControls(host);
  if (!controls.statusKey) return null;

  if (controls.statusKey === "updating") {
    return (
      <AppText size="sm" tone="secondary" accessibilityLiveRegion="polite">
        {t("settings.raspberryPis.update.updating")}
      </AppText>
    );
  }

  const isScanning = host.connected && !controls.canUpdate;
  return (
    <View style={{ gap: SPACING.sm }}>
      <AppText size="sm" accessibilityLiveRegion="polite">
        {controls.statusKey === "failed"
          ? t("settings.raspberryPis.update.failed", { version: controls.installedVersion ?? "" })
          : t("settings.raspberryPis.update.available", { version: controls.latestVersion ?? "" })}
      </AppText>
      {canManage && controls.canUpdate ? (
        <View style={{ flexDirection: "row" }}>
          <Button
            variant="secondary"
            icon="download"
            label={t(
              controls.statusKey === "failed"
                ? "settings.raspberryPis.update.retry"
                : "settings.raspberryPis.update.button",
            )}
            disabled={update.isPending}
            onPress={() => update.mutate()}
          />
        </View>
      ) : null}
      {canManage && isScanning ? (
        <AppText size="sm" tone="secondary">
          {t("settings.raspberryPis.update.stopScanFirst")}
        </AppText>
      ) : null}
    </View>
  );
}
