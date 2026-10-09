import { Callout } from "@/components/callout";
import { MobilePageHeader } from "@/components/mobile-page-header";
import { QrPairingScanner } from "@/features/scanner/components/qr-pairing-scanner";
import { parsePhonePairingPath } from "@/features/scanner/lib/pairing-link";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { MOBILE_NAV_SCROLL_PADDING_CLASS } from "@/lib/constants/nav";
import { cn } from "@/lib/utils";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router-dom";

export default function ScanPage() {
  const { t } = useTranslation("scanner");
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [invalidCode, setInvalidCode] = useState(false);

  const handleResult = useCallback(
    (text: string) => {
      const path = parsePhonePairingPath(text);
      if (path) navigate(path);
      else setInvalidCode(true);
    },
    [navigate],
  );

  if (!isMobile) return <Navigate to="/app" replace />;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MobilePageHeader
        title={t("qrPairing.title")}
        subtitle={t("qrPairing.subtitle")}
      />
      <div
        className={cn(
          "flex min-h-0 w-full flex-1 flex-col",
          MOBILE_NAV_SCROLL_PADDING_CLASS,
        )}
      >
        <div className="flex min-h-0 w-full flex-1 flex-col gap-3 p-4">
          <QrPairingScanner onResult={handleResult} />
          {invalidCode && (
            <Callout variant="warning" title={t("qrPairing.invalidTitle")}>
              {t("qrPairing.invalidDescription", {
                option: t("usePhoneAsCamera"),
              })}
            </Callout>
          )}
        </div>
      </div>
    </div>
  );
}
