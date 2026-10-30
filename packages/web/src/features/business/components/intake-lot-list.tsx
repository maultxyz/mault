import { EmptyState } from "@/components/empty-state";
import { ListPagination } from "@/components/list-pagination";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/features/business/components/status-badge";
import { formatDay } from "@/features/business/lib/format";
import { usePriceSource } from "@/hooks/use-price-source";
import { BUSINESS_LIST_SKELETON_COUNT } from "@/lib/constants/business";
import type { IntakeLotListProps } from "@/lib/interfaces/business";
import { IconCash } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function IntakeLotList({
  lots,
  pagination,
  selectedGuid,
  isLoading,
  onSelect,
}: IntakeLotListProps) {
  const { t } = useTranslation("business");
  const { format } = usePriceSource();

  if (isLoading) {
    return (
      <div className="flex flex-col overflow-hidden rounded-lg border">
        {Array.from({ length: BUSINESS_LIST_SKELETON_COUNT }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-13 rounded-none border-b last:border-b-0"
          />
        ))}
      </div>
    );
  }

  if (lots.length === 0) {
    return (
      <EmptyState
        size="compact"
        icon={IconCash}
        title={t("intake.emptyTitle")}
        description={t("intake.emptyDescription")}
      />
    );
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto max-md:gap-3">
        {lots.map((lot) => {
          const total =
            lot.status === "accepted" ? lot.paidTotal : lot.cashOffer;
          return (
            <Button
              key={lot.guid}
              variant={lot.guid === selectedGuid ? "selected" : "ghost"}
              className="h-auto w-full flex-col items-start justify-start gap-0.5 p-2 text-start max-md:h-auto max-md:gap-1 max-md:p-3"
              onClick={() => onSelect(lot.guid)}
            >
              <span className="flex w-full items-center gap-2">
                <span className="min-w-0 flex-1 truncate font-heading text-sm font-medium">
                  {lot.customerName}
                </span>
                <StatusBadge status={lot.status} />
              </span>
              <span className="flex w-full items-center justify-between gap-2 text-xs tabular-nums text-foreground/70">
                <span className="min-w-0 truncate">
                  {lot.collectionGameName && `${lot.collectionGameName} · `}
                  {t("intake.cardCount", { count: lot.cardCount })} ·{" "}
                  {formatDay(lot.createdAt)}
                </span>
                {total != null && <span>{format(total)}</span>}
              </span>
            </Button>
          );
        })}
      </div>
      <ListPagination pagination={pagination} compact />
    </>
  );
}
