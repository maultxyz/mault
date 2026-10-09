import { Callout } from "@/components/callout";
import { Button } from "@/components/ui/button";
import { useQrScanner } from "@/features/scanner/api/use-qr-scanner";
import type { QrPairingScannerProps } from "@/lib/interfaces/scanner";
import { cn } from "@/lib/utils";
import {
  IconAlertTriangle,
  IconLoader2,
  IconRefresh,
  IconVideoOff,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function QrPairingScanner({ onResult }: QrPairingScannerProps) {
  const { t } = useTranslation("scanner");
  const { videoRef, status, retry } = useQrScanner(onResult);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl bg-black">
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          className={cn(
            "size-full object-cover",
            status !== "scanning" && "invisible",
          )}
        />
        {status === "scanning" && (
          <div
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-1/2 aspect-square w-[72%] max-w-80 -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 border-white/90 shadow-[0_0_0_9999px_rgb(0_0_0/0.4)]"
          />
        )}
        {status === "starting" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-xs text-white/80">
            <IconLoader2 className="size-5 animate-spin" />
            {t("requestingCameraAccess")}
          </div>
        )}
        {status === "error" && (
          <div className="absolute inset-0 flex items-center justify-center text-white/80">
            <IconVideoOff className="size-6" />
          </div>
        )}
      </div>
      {status === "error" && (
        <Callout
          variant="error"
          icon={IconAlertTriangle}
          title={t("qrPairing.cameraErrorTitle")}
          action={
            <Button variant="outline" size="sm" onClick={retry}>
              <IconRefresh />
              {t("qrPairing.retry")}
            </Button>
          }
        >
          {t("qrPairing.cameraErrorDescription")}
        </Callout>
      )}
    </div>
  );
}
