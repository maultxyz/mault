import {
  dismissDesktopPip,
  registerDesktopPipContent,
  useDesktopPipHost,
} from "@/features/scanner/lib/desktop-pip-host-store";
import { DesktopPipControls } from "@/features/scanner/components/desktop-pip-controls";
import { ScannerPipPreview } from "@/features/scanner/components/scanner-pip-preview";
import { SCANNER_PATH } from "@/lib/constants/scanner";
import { IconX } from "@tabler/icons-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export function DesktopScannerPip() {
  const { t } = useTranslation("scanner");
  const navigate = useNavigate();
  const { container } = useDesktopPipHost();

  useEffect(() => registerDesktopPipContent(), []);

  if (!container) return null;

  return createPortal(
    <ScannerPipPreview
      variant="window"
      onOpen={() => {
        window.maultDesktop?.showMainWindow();
        navigate(SCANNER_PATH);
      }}
      action={{
        label: t("scannerPip.hide"),
        icon: <IconX size={16} />,
        onClick: dismissDesktopPip,
      }}
      controls={<DesktopPipControls />}
    />,
    container,
  );
}
