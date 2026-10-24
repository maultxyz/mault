import { useDesktopPipWindow } from "@/features/scanner/api/use-desktop-pip-window";
import { useDesktopBackground } from "@/features/scanner/api/use-desktop-window-state";
import { useStation, useStations } from "@/features/scanner/api/use-stations";
import { DesktopPipControls } from "@/features/scanner/components/desktop-pip-controls";
import { ScannerPipPreview } from "@/features/scanner/components/scanner-pip-preview";
import { DESKTOP_PIP_OPEN_DELAY_MS } from "@/lib/constants/scanner";
import { IconX } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export function DesktopScannerPip() {
  const { t } = useTranslation("scanner");
  const navigate = useNavigate();
  const { station } = useStation();
  const { connectedStationIds } = useStations();
  const background = useDesktopBackground();
  const [settledBackground, setSettledBackground] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!background) {
      setSettledBackground(false);
      setDismissed(false);
      return;
    }
    const timer = setTimeout(() => setSettledBackground(true), DESKTOP_PIP_OPEN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [background]);

  const open = settledBackground && !dismissed && connectedStationIds.has(station.id);
  const container = useDesktopPipWindow(open, () => setDismissed(true));

  if (!container) return null;

  return createPortal(
    <ScannerPipPreview
      variant="window"
      onOpen={() => {
        window.maultDesktop?.showMainWindow();
        navigate("/app");
      }}
      action={{
        label: t("scannerPip.hide"),
        icon: <IconX size={16} />,
        onClick: () => setDismissed(true),
      }}
      controls={<DesktopPipControls />}
    />,
    container,
  );
}
