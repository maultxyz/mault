import { binsQueryOptions, deleteSet } from "@/features/bins/api/sort-bins";
import { useBusinessAction } from "@/features/business/api/use-business";
import { toast } from "@/lib/toast";
import {
  getPickListTotals,
  type OrderSortPreset,
  type Result,
} from "@magic-vault/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

export interface PickRunProgress {
  binsByNumber: Map<number, { wanted: number; found: number }>;
  wanted: number;
  found: number;
  complete: boolean;
}

/**
 * Live found/total progress of a pick run's preset bins. Updates in every
 * open tab through the pick_list_changed stream events.
 */
export function usePickRunProgress(
  presets: OrderSortPreset[],
): PickRunProgress | null {
  const { data: sets } = useQuery({ ...binsQueryOptions });
  return useMemo(() => {
    if (presets.length === 0) return null;
    const guids = new Set(presets.map((preset) => preset.guid));
    const binsByNumber = new Map<number, { wanted: number; found: number }>();
    let wanted = 0;
    let found = 0;
    for (const set of sets ?? []) {
      if (!guids.has(set.guid)) continue;
      for (const bin of set.bins) {
        if (!bin.pickList || bin.isCatchAll) continue;
        const totals = getPickListTotals(bin.pickList);
        binsByNumber.set(bin.binNumber, totals);
        wanted += totals.wanted;
        found += totals.found;
      }
    }
    return {
      binsByNumber,
      wanted,
      found,
      complete: wanted > 0 && found >= wanted,
    };
  }, [presets, sets]);
}

type RunAction = <T>(
  action: () => Promise<Result<T>>,
) => Promise<Result<T> | null>;

/** Soft-deletes a run's presets and refreshes the bins cache everywhere. */
export function useDiscardPickRunPresets() {
  const run = useBusinessAction() as RunAction;
  const queryClient = useQueryClient();
  const { t } = useTranslation("business");
  return useCallback(
    async (presets: OrderSortPreset[]): Promise<boolean> => {
      for (const preset of presets) {
        const result = await run(() => deleteSet(preset.guid));
        if (!result) return false;
      }
      void queryClient.invalidateQueries({
        queryKey: binsQueryOptions.queryKey,
      });
      toast.success(t("orders.sorterPick.discardedRun"));
      return true;
    },
    [run, queryClient, t],
  );
}
