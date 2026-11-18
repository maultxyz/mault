import {
  binsQueryOptions,
  setFillStorageLocations,
} from "@/features/bins/api/sort-bins";
import {
  bulkDeleteStorageLocations,
  bulkUpdateStorageLocations,
  storageLocationKeys,
} from "@/features/storage/api/storage-locations";
import type { StoragePlanMembershipAction } from "@/lib/interfaces/storage";
import { toast } from "@/lib/toast";
import type {
  StorageLocation,
  StorageLocationBulkUpdateInput,
} from "@magic-vault/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function useStorageLocationBulkActions() {
  const { t } = useTranslation("storage");
  const queryClient = useQueryClient();
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: storageLocationKeys.root() });
    void queryClient.invalidateQueries({ queryKey: binsQueryOptions.queryKey });
  };

  const sizesMutation = useMutation({ mutationFn: bulkUpdateStorageLocations });
  const deleteMutation = useMutation({ mutationFn: bulkDeleteStorageLocations });
  const planMutation = useMutation({
    mutationFn: ({
      presetGuid,
      locationGuids,
    }: {
      presetGuid: string;
      locationGuids: string[];
    }) => setFillStorageLocations(presetGuid, locationGuids),
  });

  const updateSizes = async (
    input: StorageLocationBulkUpdateInput,
  ): Promise<boolean> => {
    const result = await sizesMutation.mutateAsync(input).catch(() => null);
    if (!result?.success || !result.data) {
      toast.error(result?.message ?? t("toasts.failed"));
      return false;
    }
    refresh();
    toast.success(t("bulk.sizesUpdated", { count: result.data.updated }));
    return true;
  };

  const deleteLocations = async (locationGuids: string[]): Promise<boolean> => {
    const result = await deleteMutation
      .mutateAsync(locationGuids)
      .catch(() => null);
    if (!result?.success || !result.data) {
      toast.error(result?.message ?? t("toasts.failed"));
      return false;
    }
    refresh();
    toast.success(t("bulk.deleted", { count: result.data.updated }));
    return true;
  };

  const changePlanMembership = async (
    presetGuid: string,
    locations: StorageLocation[],
    action: StoragePlanMembershipAction,
  ): Promise<boolean> => {
    const sets = await queryClient
      .fetchQuery(binsQueryOptions)
      .catch(() => null);
    const preset = sets?.find((set) => set.guid === presetGuid);
    if (!preset) {
      toast.error(t("toasts.failed"));
      return false;
    }
    const current = preset.fillStorageLocationGuids;
    const chosenGuids = [...locations]
      .sort((left, right) =>
        left.name.localeCompare(right.name, undefined, { numeric: true }),
      )
      .map((location) => location.guid);
    const next =
      action === "add"
        ? [...current, ...chosenGuids.filter((guid) => !current.includes(guid))]
        : current.filter((guid) => !chosenGuids.includes(guid));
    const changed = Math.abs(next.length - current.length);
    const result = await planMutation
      .mutateAsync({ presetGuid, locationGuids: next })
      .catch(() => null);
    if (!result?.success) {
      toast.error(result?.message ?? t("toasts.failed"));
      return false;
    }
    if (result.data) queryClient.setQueryData(binsQueryOptions.queryKey, result.data);
    refresh();
    toast.success(
      t(action === "add" ? "bulk.addedToPlan" : "bulk.removedFromPlan", {
        count: changed,
        preset: preset.name,
      }),
    );
    return true;
  };

  return {
    updateSizes,
    deleteLocations,
    changePlanMembership,
    isRunning:
      sizesMutation.isPending ||
      deleteMutation.isPending ||
      planMutation.isPending,
  };
}
