import { EmptyState } from "@/components/empty-state";
import { ListPagination } from "@/components/list-pagination";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/features/business/components/status-badge";
import { formatDay } from "@/features/business/lib/format";
import { BUSINESS_LIST_SKELETON_COUNT } from "@/lib/constants/business";
import type { OrderListProps } from "@/lib/interfaces/business";
import { modifierClickSelectHandlers } from "@/lib/modifier-click-select";
import { IconTruckDelivery } from "@tabler/icons-react";
import { useShiftClick } from "@/hooks/use-shift-click";
import { useTranslation } from "react-i18next";

export function OrderList({
  orders,
  pagination,
  selectedGuid,
  isLoading,
  onSelect,
  checkedOrderGuids,
  onToggleOrderChecked,
}: OrderListProps) {
  const { t } = useTranslation("business");
  const { onMouseDown: onCheckboxMouseDown, consumeShift } = useShiftClick();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 max-md:gap-2">
        {Array.from({ length: BUSINESS_LIST_SKELETON_COUNT }).map((_, i) => (
          <Skeleton key={i} className="h-13 rounded-lg" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        size="compact"
        icon={IconTruckDelivery}
        title={t("orders.emptyTitle")}
        description={t("orders.emptyDescription")}
      />
    );
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto max-md:gap-2">
        {orders.map((order) => (
          <div
            key={order.guid}
            className="flex items-center gap-1.5"
            role="presentation"
            {...modifierClickSelectHandlers(
              onToggleOrderChecked
                ? (shiftKey) => onToggleOrderChecked(order.guid, { shiftKey })
                : undefined,
            )}
          >
            {onToggleOrderChecked && (
              <span className="ml-1 flex shrink-0" role="presentation" onMouseDown={onCheckboxMouseDown}>
                <Checkbox
                  checked={checkedOrderGuids?.has(order.guid) ?? false}
                  onCheckedChange={() =>
                    onToggleOrderChecked(order.guid, { shiftKey: consumeShift() })
                  }
                  aria-label={t("orders.bulk.selectPick", { name: order.name })}
                />
              </span>
            )}
            <Button
              variant={order.guid === selectedGuid ? "selected" : "ghost"}
              aria-current={order.guid === selectedGuid || undefined}
              className="h-auto min-w-0 flex-1 flex-col items-start justify-start gap-0.5 p-2 text-start max-md:h-auto max-md:gap-1 max-md:p-3"
              onClick={() => onSelect(order.guid)}
            >
              <span className="flex w-full items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {order.name}
                </span>
                <StatusBadge status={order.status} />
              </span>
              <span className="flex w-full items-center justify-between gap-2 text-xs tabular-nums text-foreground/70">
                <span>
                  {t("orders.allocatedOf", {
                    allocated: order.allocated,
                    quantity: order.quantity,
                  })}
                </span>
                <span>{formatDay(order.createdAt)}</span>
              </span>
            </Button>
          </div>
        ))}
      </div>
      <ListPagination pagination={pagination} compact />
    </>
  );
}
