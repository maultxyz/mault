import { Button } from "@/components/ui/button";
import { useBusinessAccess } from "@/features/business/api/use-business";
import { MobileScannerBuy } from "@/features/business/components/mobile-scanner-buy";
import { usePriceSource } from "@/hooks/use-price-source";
import type { MobileScannerBuyStripProps } from "@/lib/interfaces/business";
import { IconCheck, IconChevronRight, IconCoins, IconPlus } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function MobileScannerBuyStrip({ collectionGuid }: MobileScannerBuyStripProps) {
  const { t } = useTranslation("business");
  const { format } = usePriceSource();
  const { access } = useBusinessAccess();
  const showsMoney = access?.canViewCosts ?? false;

  return (
    <MobileScannerBuy
      collectionGuid={collectionGuid}
      renderTrigger={({ openBuy, canStartBuy, canFinish, openSheet, requestFinish, requestStart }) => {
        if (!openBuy) {
          if (!canStartBuy) return null;
          return (
            <Button variant="outline" className="self-start" onClick={requestStart}>
              <IconPlus />
              {t("intake.newTitle")}
            </Button>
          );
        }
        const details = [
          t("scannerBuy.cardCount", { count: openBuy.cardCount }),
          ...(showsMoney && openBuy.sourceType !== "opened" && openBuy.cashOffer != null
            ? [t("scannerBuy.offer", { amount: format(openBuy.cashOffer) })]
            : []),
        ];
        return (
          <div className="flex shrink-0 items-center gap-1.5 rounded-card bg-card p-1.5">
            <button
              type="button"
              onClick={openSheet}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-foreground/6"
            >
              <IconCoins aria-hidden className="size-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-foreground">
                  {t("banner.title", { name: openBuy.customerName })}
                </span>
                <span className="block truncate text-xs text-foreground/70">
                  {details.join(" · ")}
                </span>
              </span>
              <IconChevronRight aria-hidden className="size-4 shrink-0 text-foreground/70" />
            </button>
            {canFinish && (
              <Button onClick={requestFinish}>
                <IconCheck />
                {t("intake.accept")}
              </Button>
            )}
          </div>
        );
      }}
    />
  );
}
