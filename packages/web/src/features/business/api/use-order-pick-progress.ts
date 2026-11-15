import { businessKeys, setOrderPicked } from "@/features/business/api/business";
import type { OrderPickProgress } from "@/lib/interfaces/business";
import { toast } from "@/lib/toast";
import {
  pickedScanIdsOf,
  withOrderPicks,
  type FulfilmentOrderDetail,
} from "@magic-vault/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

export function useOrderPickProgress(orders: FulfilmentOrderDetail[]): OrderPickProgress {
  const { t } = useTranslation("business");
  const queryClient = useQueryClient();

  const changePicked = useCallback(
    (scanIds: string[], isPicked: boolean) => {
      const wanted = new Set(scanIds);
      const changes = orders.flatMap((order) => {
        const changedScanIds = order.pullSheet
          .filter((entry) => wanted.has(entry.scanId) && entry.picked !== isPicked)
          .map((entry) => entry.scanId);
        return changedScanIds.length > 0 ? [{ orderGuid: order.guid, changedScanIds }] : [];
      });
      if (changes.length === 0) return;
      void (async () => {
        await Promise.all(
          changes.map(({ orderGuid }) =>
            queryClient.cancelQueries({ queryKey: businessKeys.order(orderGuid) }),
          ),
        );
        for (const { orderGuid, changedScanIds } of changes) {
          queryClient.setQueryData<FulfilmentOrderDetail | null>(
            businessKeys.order(orderGuid),
            (current) => (current ? withOrderPicks(current, new Set(changedScanIds), isPicked) : current),
          );
        }
        const results = await Promise.allSettled(
          changes.map(({ orderGuid, changedScanIds }) =>
            setOrderPicked(orderGuid, { scanIds: changedScanIds, isPicked }),
          ),
        );
        if (results.some((result) => result.status === "rejected" || !result.value.success)) {
          toast.error(t("orders.pickSaveFailed"));
        }
        await queryClient.invalidateQueries({ queryKey: businessKeys.ordersRoot() });
      })();
    },
    [orders, queryClient, t],
  );

  return { pickedScanIds: pickedScanIdsOf(orders), changePicked };
}
