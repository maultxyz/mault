import { Button } from "@/components/ui/button";
import type { ScannerControlsProps } from "@/lib/interfaces/scanner";
import {
  IconFocus2,
  IconPlayerPause,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function ScannerControls({
  status,
  onForceScan,
  onPause,
  onResume,
}: ScannerControlsProps) {
  const { t } = useTranslation("scanner");
  const canForceScan =
    status === "no-match" || status === "scanning" || status === "captured";

  return (
    <>
      <Button
        onClick={onForceScan}
        variant="secondary"
        disabled={!canForceScan}
      >
        <IconFocus2 />
        {status === "no-match"
          ? t("scannerControls.scanAgain")
          : t("scannerControls.scanNow")}
      </Button>
      {status === "paused" ? (
        <Button onClick={onResume} variant="secondary">
          <IconPlayerPlay />
          {t("scannerControls.resume")}
        </Button>
      ) : (
        <Button onClick={onPause} variant="secondary">
          <IconPlayerPause />
          {t("scannerControls.pause")}
        </Button>
      )}
    </>
  );
}
