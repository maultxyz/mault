import { Button } from "@/components/ui/button";
import type { ScannerControlsProps } from "@/lib/interfaces/scanner";
import {
  IconFocus2,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlus,
  IconX,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function ScannerControls({
  status,
  onForceAddDuplicate,
  onForceScan,
  onSkipDuplicate,
  onPause,
  onResume,
}: ScannerControlsProps) {
  const { t } = useTranslation("scanner");
  return (
    <>
      {status === "no-match" && (
        <Button onClick={onForceScan} variant="secondary">
          <IconFocus2 />
          {t("scannerControls.scanAgain")}
        </Button>
      )}
      {status === "duplicate" && (
        <>
          <Button onClick={onForceAddDuplicate} variant="secondary">
            <IconPlus />
            {t("scannerControls.addAgain")}
          </Button>
          <Button onClick={onSkipDuplicate} variant="ghost">
            <IconX />
            {t("scannerControls.skip")}
          </Button>
        </>
      )}
      {(status === "scanning" || status === "captured") && (
        <Button onClick={onForceScan} variant="secondary">
          <IconFocus2 />
          {t("scannerControls.scanNow")}
        </Button>
      )}
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
