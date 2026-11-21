import {
  binsQueryOptions,
  markPickListFound,
  resetPickList,
} from "@/features/bins/api/sort-bins";
import { toast } from "@/lib/toast";
import {
  applyPickListFound,
  type BinSet,
  type PickList,
  type PickListCard,
} from "@magic-vault/shared";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

export function setBinPickListInCache(
  queryClient: QueryClient,
  binGuid: string,
  pickList: PickList | null,
) {
  queryClient.setQueryData<BinSet[]>(binsQueryOptions.queryKey, (old) =>
    old?.map((set) =>
      set.bins.some((bin) => bin.guid === binGuid)
        ? {
            ...set,
            bins: set.bins.map((bin) =>
              bin.guid === binGuid ? { ...bin, pickList } : bin,
            ),
          }
        : set,
    ),
  );
}

function getBinPickListFromCache(
  queryClient: QueryClient,
  binGuid: string,
): PickList | null {
  for (const set of queryClient.getQueryData<BinSet[]>(
    binsQueryOptions.queryKey,
  ) ?? []) {
    const bin = set.bins.find((b) => b.guid === binGuid);
    if (bin) return bin.pickList ?? null;
  }
  return null;
}

export async function recordPickListFound(
  queryClient: QueryClient,
  binGuid: string,
  card: PickListCard | string,
  delta: number,
): Promise<void> {
  const current = getBinPickListFromCache(queryClient, binGuid);
  const optimistic = current ? applyPickListFound(current, card, delta) : null;
  if (optimistic) setBinPickListInCache(queryClient, binGuid, optimistic);
  const name = typeof card === "string" ? card : card.name;
  const input =
    typeof card === "string"
      ? { name, delta }
      : {
          name,
          setCode: card.setCode ?? undefined,
          collectorNumber: card.collectorNumber ?? undefined,
          isFoil: card.isFoil ?? undefined,
          delta,
        };
  try {
    const result = await markPickListFound(binGuid, input);
    if (result.success && result.data) {
      setBinPickListInCache(queryClient, binGuid, result.data.pickList);
    }
  } catch (err) {
    console.error("Failed to update pick list:", err);
  }
}

export function usePickListActions(binGuid: string) {
  const { t } = useTranslation("bins");
  const queryClient = useQueryClient();
  const [isResetting, setIsResetting] = useState(false);

  const reset = useCallback(async () => {
    setIsResetting(true);
    try {
      const result = await resetPickList(binGuid);
      if (result.success && result.data) {
        setBinPickListInCache(queryClient, binGuid, result.data.pickList);
      } else {
        toast.error(t("pickList.toasts.resetFailed"));
      }
    } catch {
      toast.error(t("pickList.toasts.resetFailed"));
    } finally {
      setIsResetting(false);
    }
  }, [binGuid, queryClient, t]);

  const adjust = useCallback(
    (name: string, delta: number) => {
      void recordPickListFound(queryClient, binGuid, name, delta);
    },
    [binGuid, queryClient],
  );

  return { reset, adjust, isResetting };
}
