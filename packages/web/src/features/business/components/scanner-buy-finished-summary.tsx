import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { intakeLotQueryOptions } from "@/features/business/api/business";
import { useBusinessAccess } from "@/features/business/api/use-business";
import { usePriceSource } from "@/hooks/use-price-source";
import { intakeLotPath } from "@/lib/constants/business";
import type { ScannerBuyFinishedSummaryProps } from "@/lib/interfaces/business";
import {
  IconArrowRight,
  IconArrowsTransferUp,
  IconCircleCheck,
  IconPlus,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function ScannerBuyFinishedSummary({
  guid,
  onOpenDialog,
  onDismiss,
}: ScannerBuyFinishedSummaryProps) {
  const { t } = useTranslation("business");
  const { format } = usePriceSource();
  const { access } = useBusinessAccess();
  const { data: lot } = useQuery(intakeLotQueryOptions(guid));
  const canStartBuy = !!access && !access.isLocked;

  if (!lot) return <Skeleton className="h-16 rounded-lg" />;

  const showsPaid = (access?.canViewCosts ?? false) && lot.paidTotal != null;
  const canMoveCards =
    lot.ownsCollection &&
    !lot.collectionDeleted &&
    lot.cardsInSource > 0 &&
    (access?.canAcceptIntake ?? false);
  const details = [
    t("scannerBuy.finishedCards", { count: lot.cardCount }),
    ...(showsPaid
      ? [
          lot.payoutMethod && lot.sourceType !== "opened"
            ? t("scannerBuy.finishedPaidWith", {
                amount: format(lot.paidTotal ?? 0),
                method: t(`intake.payout.${lot.payoutMethod}`),
              })
            : t("scannerBuy.finishedPaid", { amount: format(lot.paidTotal ?? 0) }),
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-3 md:gap-2">
      <div role="status" className="flex items-start gap-2">
        <IconCircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-success-foreground" />
        <div className="min-w-0">
          <p className="truncate font-heading text-base font-semibold text-foreground md:text-sm">
            {t("scannerBuy.finishedTitle", { name: lot.customerName })}
          </p>
          <p className="text-xs text-foreground/70">{details.join(" · ")}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {canStartBuy && (
          <Button onClick={() => onOpenDialog({ kind: "start" })}>
            <IconPlus />
            {t("scannerBuy.startAnother")}
          </Button>
        )}
        {canMoveCards && (
          <Button variant="outline" onClick={() => onOpenDialog({ kind: "transfer", lot })}>
            <IconArrowsTransferUp />
            {t("transfer.button")}
          </Button>
        )}
        <Button variant="outline" render={<Link to={intakeLotPath(lot.guid)} />}>
          {t("banner.open")}
          <IconArrowRight />
        </Button>
        <Button variant="ghost" onClick={onDismiss}>
          {t("scannerBuy.dismiss")}
        </Button>
      </div>
    </div>
  );
}
