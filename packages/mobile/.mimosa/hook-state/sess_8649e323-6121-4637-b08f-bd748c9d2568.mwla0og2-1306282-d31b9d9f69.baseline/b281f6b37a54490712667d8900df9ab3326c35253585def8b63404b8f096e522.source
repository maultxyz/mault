import {
  buildPickWalk,
  fullyPickedOrders,
  pickedScanIdsOf,
  pickWalkStops,
  withOrderPicks,
  type FulfilmentOrderDetail,
} from "@magic-vault/shared";
import { useQueries, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo } from "react-native";
import { useToast } from "@/components/ui/toast-provider";
import { orderQueryKey, orderQueryOptions, setOrderPicked } from "@/features/business/api/business";
import { BUSINESS_ORDERS_QUERY_KEY } from "@/lib/constants/business";
import type { PickWalk } from "@/lib/interfaces/business";

function combineOrderQueries(results: UseQueryResult<FulfilmentOrderDetail>[]) {
  return {
    orders: results.flatMap((result) => (result.data ? [result.data] : [])),
    isLoading: results.some((result) => result.isPending),
    isError: results.some((result) => result.isError),
    refetch: () => Promise.all(results.map((result) => result.refetch())),
  };
}

export function usePickWalk(orderGuids: string[]): PickWalk {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { orders, isLoading, isError, refetch } = useQueries({
    queries: orderGuids.map((orderGuid) => orderQueryOptions(orderGuid)),
    combine: combineOrderQueries,
  });
  const openOrders = useMemo(() => orders.filter((order) => order.status === "open"), [orders]);
  const entries = useMemo(() => buildPickWalk(openOrders), [openOrders]);
  const stops = useMemo(() => pickWalkStops(entries), [entries]);
  const pickedScanIds = useMemo(() => pickedScanIdsOf(openOrders), [openOrders]);

  const setPicked = useCallback(
    (scanIds: string[], isPicked: boolean) => {
      const wanted = new Set(scanIds);
      const changes = openOrders.flatMap((order) => {
        const changedScanIds = order.pullSheet
          .filter((entry) => wanted.has(entry.scanId) && entry.picked !== isPicked)
          .map((entry) => entry.scanId);
        return changedScanIds.length > 0 ? [{ orderGuid: order.guid, changedScanIds }] : [];
      });
      if (changes.length === 0) return;
      void (async () => {
        await Promise.all(
          changes.map(({ orderGuid }) => queryClient.cancelQueries({ queryKey: orderQueryKey(orderGuid) })),
        );
        for (const { orderGuid, changedScanIds } of changes) {
          queryClient.setQueryData<FulfilmentOrderDetail>(orderQueryKey(orderGuid), (current) =>
            current ? withOrderPicks(current, new Set(changedScanIds), isPicked) : current,
          );
        }
        const results = await Promise.allSettled(
          changes.map(({ orderGuid, changedScanIds }) =>
            setOrderPicked(orderGuid, { scanIds: changedScanIds, isPicked }),
          ),
        );
        if (results.some((result) => result.status === "rejected")) {
          showToast({ message: t("business.picks.walk.saveFailed"), tone: "destructive" });
          AccessibilityInfo.announceForAccessibility(t("business.picks.walk.saveFailed"));
        }
        await queryClient.invalidateQueries({ queryKey: BUSINESS_ORDERS_QUERY_KEY });
      })();
    },
    [openOrders, queryClient, showToast, t],
  );

  return {
    openOrders,
    closedOrderCount: orders.length - openOrders.length,
    entries,
    stops,
    pickedScanIds,
    pickedCount: entries.filter((entry) => pickedScanIds.has(entry.scanId)).length,
    nextEntry: entries.find((entry) => !pickedScanIds.has(entry.scanId)) ?? null,
    completedOrders: fullyPickedOrders(openOrders, pickedScanIds),
    shortOrders: openOrders.filter((order) => order.lines.some((line) => line.allocations.length < line.quantity)),
    isLoading,
    isError,
    refetch,
    setPicked,
  };
}
