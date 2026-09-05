import { Button } from "@/components/ui/button";
import { useChannelLayout } from "@/features/calibration/api/use-channel-layout";
import type { AppAlert } from "@/lib/alerts";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export function useChannelLayoutAlert(): AppAlert | null {
  const { t } = useTranslation("calibration");
  const channelLayout = useChannelLayout();
  const navigate = useNavigate();

  if (channelLayout !== "legacy") return null;

  return {
    id: "channel-layout-legacy",
    severity: "warning",
    icon: IconAlertTriangle,
    message: t("channelLayoutToggle.legacyBanner"),
    actions: (
      <Button
        variant="outline"
        size="xs"
        onClick={() => navigate("/app/calibrate")}
        className="border-amber-500/40 bg-transparent text-amber-900 hover:bg-amber-400/20 dark:text-amber-200 dark:hover:bg-amber-400/10"
      >
        {t("channelLayoutToggle.legacyBannerAction")}
      </Button>
    ),
  };
}
