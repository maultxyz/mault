import { useChannelLayout } from "@/features/calibration/api/use-channel-layout";
import { ChannelLayoutUpgradeButton } from "@/features/calibration/components/channel-layout-upgrade-button";
import type { AppAlert } from "@/lib/interfaces/alerts";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function useChannelLayoutAlert(): AppAlert | null {
  const { t } = useTranslation("calibration");
  const channelLayout = useChannelLayout();

  if (channelLayout !== "legacy") return null;

  return {
    id: "channel-layout-legacy",
    severity: "warning",
    icon: IconAlertTriangle,
    message: t("channelLayoutUpgrade.banner"),
    actions: <ChannelLayoutUpgradeButton />,
  };
}
