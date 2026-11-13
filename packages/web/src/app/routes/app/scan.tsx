import { RequireCollectionDialog } from "@/components/require-collection-dialog";
import { useMobileScanCamera } from "@/features/scanner/api/use-mobile-scan-camera";
import { CardScanner } from "@/features/scanner/components/card-scanner";
import { MobileScanChrome } from "@/features/scanner/components/mobile-scan-chrome";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { usePiHostState } from "@/hooks/use-pi-host";
import { usesHostHardware } from "@/lib/host";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";

function MobileScanner() {
  const { t } = useTranslation("common");
  useMobileScanCamera();

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-black">
      <h1 className="sr-only">{t("mobileTabs.scan")}</h1>
      <RequireCollectionDialog />
      <CardScanner
        className="flex-1"
        renderChrome={(chrome) => <MobileScanChrome chrome={chrome} />}
      />
    </div>
  );
}

export default function ScanPage() {
  const isMobile = useIsMobile();
  const { piHost, settled } = usePiHostState();
  if (!isMobile) return <Navigate to="/app" replace />;
  if (!settled) return null;
  if (piHost && usesHostHardware()) return <Navigate to="/app" replace />;
  return <MobileScanner />;
}
