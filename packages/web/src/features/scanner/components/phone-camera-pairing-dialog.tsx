import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PhoneCameraCaptureStatus } from "@/features/scanner/api/use-phone-camera-capture";
import { IconDeviceMobile, IconLoader2 } from "@tabler/icons-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface PhoneCameraPairingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: PhoneCameraCaptureStatus;
  pairingUrl: string | null;
  onRetry: () => void;
  onDisconnect: () => void;
}

export function PhoneCameraPairingDialog({
  open,
  onOpenChange,
  status,
  pairingUrl,
  onRetry,
  onDisconnect,
}: PhoneCameraPairingDialogProps) {
  const { t } = useTranslation("scanner");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!pairingUrl) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(pairingUrl, { margin: 1, width: 220 })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [pairingUrl]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("phoneCamera.dialogTitle")}</DialogTitle>
          <DialogDescription>
            {status === "connected"
              ? t("phoneCamera.connectedDescription")
              : t("phoneCamera.scanDescription")}
          </DialogDescription>
        </DialogHeader>

        {status !== "connected" && qrDataUrl && (
          <div className="flex flex-col items-center gap-3 py-2">
            <img
              src={qrDataUrl}
              alt={t("phoneCamera.qrAlt")}
              className="rounded-lg border size-[220px]"
            />
            {pairingUrl && (
              <a
                href={pairingUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-muted-foreground underline underline-offset-2 break-all text-center"
              >
                {pairingUrl}
              </a>
            )}
          </div>
        )}

        <div className="flex items-center justify-center gap-2 py-1 text-xs text-muted-foreground">
          {(status === "waiting" || status === "idle") && (
            <IconLoader2 className="size-3.5 animate-spin" />
          )}
          {status === "connected" && (
            <IconDeviceMobile className="size-3.5 text-primary" />
          )}
          <span>
            {(status === "waiting" || status === "idle") &&
              t("phoneCamera.statusWaiting")}
            {status === "connected" && t("phoneCamera.statusConnected")}
            {status === "error" && t("phoneCamera.statusError")}
          </span>
        </div>

        {status === "connected" && (
          <div className="flex gap-2">
            <Button
              variant="outline-destructive"
              onClick={onDisconnect}
              className="flex-1"
            >
              {t("phoneCamera.disconnect")}
            </Button>
            <Button onClick={() => onOpenChange(false)} className="flex-1">
              {t("phoneCamera.done")}
            </Button>
          </div>
        )}
        {status === "error" && (
          <Button variant="outline" onClick={onRetry}>
            {t("phoneCamera.tryAgain")}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
