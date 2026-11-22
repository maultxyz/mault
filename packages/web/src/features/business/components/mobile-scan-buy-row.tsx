import { useBusinessAccess } from "@/features/business/api/use-business";
import { MobileScannerBuy } from "@/features/business/components/mobile-scanner-buy";
import { usePriceSource } from "@/hooks/use-price-source";
import { MOBILE_SCAN_TEXT_ROW_CLASS } from "@/lib/constants/scanner";
import type { MobileScanBuyRowProps } from "@/lib/interfaces/business";
import { cn } from "@/lib/utils";
import { IconChevronRight, IconCoins, IconPlus } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function MobileScanBuyRow({
  collectionGuid,
  isRunning,
  isRemoveModeActive,
}: MobileScanBuyRowProps) {
  const { t } = useTranslation("business");
  const { format } = usePriceSource();
  const { access } = useBusinessAccess();
  const showsMoney = access?.canViewCosts ?? false;

  return (
    <MobileScannerBuy
      collectionGuid={collectionGuid}
      renderTrigger={({ openBuy, canStartBuy, openSheet, requestStart }) => {
        if (isRemoveModeActive) return null;
        if (openBuy) {
          const label =
            openBuy.sourceType === "opened"
              ? t("scannerBuy.openingWithCount", {
                  name: openBuy.customerName,
                  count: openBuy.cardCount,
                })
              : showsMoney && openBuy.cashOffer != null
                ? t(`scannerBuy.lineWithOffer.${openBuy.sourceType}`, {
                    name: openBuy.customerName,
                    amount: format(openBuy.cashOffer),
                  })
                : t(`scannerBuy.line.${openBuy.sourceType}`, {
                    name: openBuy.customerName,
                  });
          return (
            <button
              type="button"
              disabled={isRunning}
              onClick={openSheet}
              className={cn(MOBILE_SCAN_TEXT_ROW_CLASS, "text-xs font-medium")}
            >
              <IconCoins aria-hidden className="size-3.5" />
              <span className="truncate">{label}</span>
              {!isRunning && <IconChevronRight aria-hidden className="size-3" />}
            </button>
          );
        }
        if (!canStartBuy || isRunning) return null;
        return (
          <button
            type="button"
            onClick={requestStart}
            className={cn(MOBILE_SCAN_TEXT_ROW_CLASS, "text-xs font-medium")}
          >
            <IconPlus aria-hidden className="size-3.5" />
            <span className="truncate">{t("intake.newTitle")}</span>
          </button>
        );
      }}
    />
  );
}
