import { useOrg } from "@/features/companies/api/use-organization";
import {
  createStorageLocation,
  deleteStorageLocation,
  removeCardFromStorageLocation,
  renameStorageLocation,
  storageLocationKeys,
  storageLocationsQueryOptions,
} from "@/features/storage/api/storage-locations";
import { toast } from "@/lib/toast";
import type { Result, StorageLocation } from "@magic-vault/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function useStorageLocations() {
  const { t } = useTranslation("storage");
  const queryClient = useQueryClient();
  const { activeOrg } = useOrg();
  const listOptions = storageLocationsQueryOptions(activeOrg?.id);
  const { data: locations = [], isPending } = useQuery(listOptions);

  const applyList = (result: Result<StorageLocation[]>) => {
    if (!result.success) {
      toast.error(result.message ?? t("toasts.failed"));
      return false;
    }
    if (result.data)
      queryClient.setQueryData(listOptions.queryKey, result.data);
    return true;
  };

  const createMutation = useMutation({
    mutationFn: createStorageLocation,
    onSuccess: (result) => {
      if (!result.success || !result.data) {
        toast.error(result.message ?? t("toasts.failed"));
        return;
      }
      queryClient.setQueryData(listOptions.queryKey, result.data.locations);
    },
    onError: () => toast.error(t("toasts.failed")),
  });

  const renameMutation = useMutation({
    mutationFn: ({ guid, name }: { guid: string; name: string }) =>
      renameStorageLocation(guid, name),
    onSuccess: applyList,
    onError: () => toast.error(t("toasts.failed")),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStorageLocation,
    onSuccess: (result) => {
      if (applyList(result)) {
        void queryClient.invalidateQueries({
          queryKey: storageLocationKeys.root(),
        });
      }
    },
    onError: () => toast.error(t("toasts.failed")),
  });

  const create = async (name: string): Promise<string | null> => {
    const result = await createMutation.mutateAsync(name).catch(() => null);
    return result?.success && result.data ? result.data.guid : null;
  };

  const rename = async (guid: string, name: string): Promise<boolean> => {
    const result = await renameMutation
      .mutateAsync({ guid, name })
      .catch(() => null);
    return !!result?.success;
  };

  const remove = async (guid: string): Promise<boolean> => {
    const result = await deleteMutation.mutateAsync(guid).catch(() => null);
    return !!result?.success;
  };

  return {
    locations,
    isLoading: !!activeOrg && isPending,
    isMutating:
      createMutation.isPending ||
      renameMutation.isPending ||
      deleteMutation.isPending,
    create,
    rename,
    remove,
  };
}

export function useRemoveCardFromLocation() {
  const { t } = useTranslation("storage");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ guid, scanId }: { guid: string; scanId: string }) =>
      removeCardFromStorageLocation(guid, scanId),
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.message ?? t("toasts.failed"));
        return;
      }
      toast.success(t("toasts.cardRemoved"));
      void queryClient.invalidateQueries({
        queryKey: storageLocationKeys.root(),
      });
    },
    onError: () => toast.error(t("toasts.failed")),
  });

  const removeCard = async (guid: string, scanId: string): Promise<boolean> => {
    const result = await mutation
      .mutateAsync({ guid, scanId })
      .catch(() => null);
    return !!result?.success;
  };

  return { removeCard, isRemoving: mutation.isPending };
}
