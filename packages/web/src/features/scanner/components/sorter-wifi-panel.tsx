import { Callout } from "@/components/callout";
import { SettingsSection } from "@/components/settings-section";
import { Button } from "@/components/ui/button";
import { useSerial } from "@/features/scanner/api/use-serial";
import { useSorterWifi } from "@/features/scanner/api/use-sorter-wifi";
import { useStationToast } from "@/features/scanner/api/use-station-toast";
import { SorterWifiDialog } from "@/features/scanner/components/sorter-wifi-dialog";
import { SorterWifiStatusList } from "@/features/scanner/components/sorter-wifi-status-list";
import { FIRMWARE_FEATURE_MIN_VERSIONS } from "@magic-vault/shared";
import { IconLoader2, IconWifi, IconWifiOff } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function SorterWifiPanel() {
  const { t } = useTranslation("scanner");
  const toast = useStationToast();
  const { isReady, transport } = useSerial();
  const wifi = useSorterWifi();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isForgetting, setIsForgetting] = useState(false);

  const isConfigured = !!wifi.status && wifi.status.wifi !== "unconfigured";

  async function handleForget() {
    setIsForgetting(true);
    try {
      const result = await wifi.forget();
      if (result.ok && result.serverLinkRemovalFailed) {
        toast.warning(t("sorterWifi.forgottenLinkKept"));
      } else if (result.ok) {
        toast.success(
          result.restarting
            ? t("sorterWifi.forgottenRestarting")
            : t("sorterWifi.forgotten"),
        );
      } else {
        toast.error(result.error ?? t("sorterWifi.forgetFailed"));
      }
    } finally {
      setIsForgetting(false);
    }
  }

  const action = wifi.canConfigure ? (
    <div className="flex gap-1.5">
      {isConfigured && (
        <Button
          variant="outline"
          disabled={isForgetting}
          onClick={() => void handleForget()}
        >
          {isForgetting ? <IconLoader2 className="animate-spin" /> : <IconWifiOff />}
          {t("sorterWifi.forget")}
        </Button>
      )}
      <Button onClick={() => setDialogOpen(true)}>
        <IconWifi />
        {isConfigured ? t("sorterWifi.change") : t("sorterWifi.setUp")}
      </Button>
    </div>
  ) : null;

  return (
    <SettingsSection
      heading={t("sorterWifi.title")}
      description={t("sorterWifi.description")}
      action={action}
    >
      {!isReady && (
        <Callout variant="info">{t("sorterWifi.connectFirst")}</Callout>
      )}
      {wifi.needsWifiBoard && (
        <Callout variant="info">{t("sorterWifi.needsWifiBoard")}</Callout>
      )}
      {wifi.needsFirmware && (
        <Callout variant="warning">
          {t("sorterWifi.needsFirmware", {
            version: FIRMWARE_FEATURE_MIN_VERSIONS.wifiRemote,
          })}
        </Callout>
      )}
      {wifi.isSupported && <SorterWifiStatusList status={wifi.status} />}
      {wifi.sharesRadioWithBluetooth && (
        <Callout variant="info">{t("sorterWifi.sharesRadio")}</Callout>
      )}
      {wifi.status?.wifi === "paused" && (
        <Callout variant="warning">{t("sorterWifi.pausedForPower")}</Callout>
      )}
      {wifi.isSupported && transport === "cloud" && (
        <Callout variant="info">{t("sorterWifi.changeOverLocal")}</Callout>
      )}
      <SorterWifiDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultSsid={wifi.status?.ssid ?? null}
        onSubmit={wifi.configure}
      />
    </SettingsSection>
  );
}
