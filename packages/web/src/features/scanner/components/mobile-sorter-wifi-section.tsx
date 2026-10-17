import { Callout } from "@/components/callout";
import { MobileListRow } from "@/components/mobile-list-row";
import { MobileSection } from "@/components/mobile-section";
import { useSorterWifi } from "@/features/scanner/api/use-sorter-wifi";
import { useStationToast } from "@/features/scanner/api/use-station-toast";
import { SorterWifiDialog } from "@/features/scanner/components/sorter-wifi-dialog";
import { MOBILE_LIST_CLASS } from "@/lib/constants/nav";
import { IconLoader2, IconWifi, IconWifiOff } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function MobileSorterWifiSection() {
  const { t } = useTranslation("scanner");
  const toast = useStationToast();
  const wifi = useSorterWifi();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isForgetting, setIsForgetting] = useState(false);

  if (!wifi.canConfigure) return null;

  const status = wifi.status;
  const isConfigured = !!status && status.wifi !== "unconfigured";
  const summary = !status
    ? t("sorterWifi.unknown")
    : isConfigured
      ? [
          status.ssid,
          t(`sorterWifi.wifiState.${status.wifi}`),
          t(`sorterWifi.cloudState.${status.cloud}`),
        ]
          .filter(Boolean)
          .join(" · ")
      : t("sorterWifi.notSetUp");

  async function handleForget() {
    setIsForgetting(true);
    try {
      const result = await wifi.forget();
      if (result.ok) toast.success(t("sorterWifi.forgotten"));
      else toast.error(result.error ?? t("sorterWifi.forgetFailed"));
    } finally {
      setIsForgetting(false);
    }
  }

  return (
    <MobileSection title={t("sorterWifi.title")}>
      {status?.wifi === "paused" && (
        <Callout variant="warning">{t("sorterWifi.pausedForPower")}</Callout>
      )}
      <div className={MOBILE_LIST_CLASS}>
        <MobileListRow
          icon={<IconWifi />}
          label={isConfigured ? t("sorterWifi.change") : t("sorterWifi.setUp")}
          description={summary}
          disabled={isForgetting}
          onClick={() => setDialogOpen(true)}
        />
        {isConfigured && (
          <MobileListRow
            icon={
              isForgetting ? (
                <IconLoader2 className="animate-spin" />
              ) : (
                <IconWifiOff />
              )
            }
            label={t("sorterWifi.forget")}
            destructive
            disabled={isForgetting}
            onClick={() => void handleForget()}
          />
        )}
      </div>
      <SorterWifiDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultSsid={status?.ssid ?? null}
        onSubmit={wifi.configure}
      />
    </MobileSection>
  );
}
