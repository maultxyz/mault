import { useLatestScanGiftReveal } from "@/features/scanner/lib/scan-gift-reveal-store";
import { formatPriceInCurrency } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";

export function ScanGiftRevealHost() {
  const { t } = useTranslation("scanner");
  const reveal = useLatestScanGiftReveal();
  return (
    <div role="status" className="sr-only">
      {reveal
        ? t("scanGiftReveal.announcement", {
            name: reveal.cardName,
            price: formatPriceInCurrency(reveal.price, reveal.currency),
          })
        : ""}
    </div>
  );
}
