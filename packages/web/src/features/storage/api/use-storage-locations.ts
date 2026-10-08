import {
  confirmCollectionCard,
  setCollectionCardFoilType,
  updateCollectionCard,
} from "@/features/collections/api/collections";
import { invalidateCollectionCards } from "@/features/collections/lib/card-page-cache";
import { useOrg } from "@/features/companies/api/use-organization";
import {
  createStorageLocation,
  deleteStorageLocation,
  removeCardFromStorageLocation,
  renameStorageLocation,
  storageLocationKeys,
  storageLocationsQueryOptions,
} from "@/features/storage/api/storage-locations";
import type { CardDetailActions } from "@/lib/interfaces/cards";
import { toast } from "@/lib/toast";
import type {
  PlayingCard,
  PlayingCardWithDistance,
  Result,
  StorageLocation,
  StorageLocationCard,
  StorageLocationSearchResult,
} from "@magic-vault/shared";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
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

function patchStoredCard(
  queryClient: QueryClient,
  entry: StorageLocationSearchResult,
  patch: Partial<StorageLocationCard>,
) {
  queryClient.setQueryData<StorageLocationCard[]>(
    storageLocationKeys.cards(entry.locationGuid),
    (cards) =>
      cards?.map((card) =>
        card.scanId === entry.scanId ? { ...card, ...patch } : card,
      ),
  );
}

function refreshStoredCard(
  queryClient: QueryClient,
  entry: StorageLocationSearchResult,
) {
  void queryClient.invalidateQueries({ queryKey: storageLocationKeys.root() });
  void invalidateCollectionCards(queryClient, entry.collectionGuid);
}

export function useCorrectStoredCard() {
  const { t } = useTranslation("storage");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({
      entry,
      card,
    }: {
      entry: StorageLocationSearchResult;
      card: PlayingCardWithDistance;
    }) => updateCollectionCard(entry.collectionGuid, entry.scanId, card),
    onMutate: ({ entry, card }) =>
      patchStoredCard(queryClient, entry, { card, corrected: true }),
    onSuccess: (result) => {
      if (!result.success)
        toast.error(result.message ?? t("toasts.correctFailed"));
    },
    onError: () => toast.error(t("toasts.correctFailed")),
    onSettled: (_result, _error, { entry }) =>
      refreshStoredCard(queryClient, entry),
  });

  const correctCard = async (
    entry: StorageLocationSearchResult,
    card: PlayingCard,
  ): Promise<boolean> => {
    const result = await mutation
      .mutateAsync({ entry, card: { ...card, distance: 0, confidence: 1 } })
      .catch(() => null);
    return !!result?.success;
  };

  return { correctCard, isCorrecting: mutation.isPending };
}

export function useConfirmStoredCard() {
  const { t } = useTranslation("storage");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (entry: StorageLocationSearchResult) =>
      confirmCollectionCard(entry.collectionGuid, entry.scanId),
    onMutate: (entry) =>
      patchStoredCard(queryClient, entry, { corrected: true }),
    onSuccess: (result) => {
      if (!result.success) toast.error(result.message ?? t("toasts.failed"));
    },
    onError: () => toast.error(t("toasts.failed")),
    onSettled: (_result, _error, entry) =>
      refreshStoredCard(queryClient, entry),
  });

  return { confirmCard: (entry: StorageLocationSearchResult) => mutation.mutate(entry) };
}

export function useSetStoredCardFoilType() {
  const { t } = useTranslation("storage");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({
      entry,
      foilType,
    }: {
      entry: StorageLocationSearchResult;
      foilType: string | null;
    }) =>
      setCollectionCardFoilType(
        entry.collectionGuid,
        entry.scanId,
        foilType != null,
        foilType,
      ),
    onMutate: ({ entry, foilType }) =>
      patchStoredCard(queryClient, entry, {
        isFoil: foilType != null,
        foilType,
      }),
    onSuccess: (result) => {
      if (!result.success) toast.error(result.message ?? t("toasts.failed"));
    },
    onError: () => toast.error(t("toasts.failed")),
    onSettled: (_result, _error, { entry }) =>
      refreshStoredCard(queryClient, entry),
  });

  return {
    setFoilType: (entry: StorageLocationSearchResult, foilType: string | null) =>
      mutation.mutate({ entry, foilType }),
  };
}

export function useStoredCardActions(
  entry: StorageLocationSearchResult | null,
): CardDetailActions {
  const { correctCard } = useCorrectStoredCard();
  const { confirmCard } = useConfirmStoredCard();
  const { setFoilType } = useSetStoredCardFoilType();

  return {
    correctCard: (_scanId, card) => {
      if (entry) void correctCard(entry, card);
    },
    confirmCard: () => {
      if (entry) confirmCard(entry);
    },
    setCardFoilType: (_scanId, foilType) => {
      if (entry) setFoilType(entry, foilType);
    },
  };
}
