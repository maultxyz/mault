import {
  confirmCollectionCard,
  markCollectionCardReviewed,
  setCollectionCardCondition,
  setCollectionCardFoilType,
  updateCollectionCard,
} from "@/features/collections/api/collections";
import { invalidateCollectionCards } from "@/features/collections/lib/card-page-cache";
import { useOrg } from "@/features/companies/api/use-organization";
import {
  createStorageLocation,
  deleteStorageLocation,
  moveCardsToStorageLocation,
  moveCollectionToStorageLocation,
  removeCardFromStorageLocation,
  renameStorageLocation,
  storageLocationKeys,
  storageLocationsQueryOptions,
} from "@/features/storage/api/storage-locations";
import type { CardDetailActions } from "@/lib/interfaces/cards";
import type {
  MoveCardsToLocationInput,
  MoveCollectionsToLocationInput,
} from "@/lib/interfaces/storage";
import { toast } from "@/lib/toast";
import type {
  CardCondition,
  PlayingCard,
  PlayingCardWithDistance,
  Result,
  StorageLocation,
  StorageLocationCard,
  StorageLocationCardContext,
  StorageLocationCardPage,
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

export function useMoveCardsToLocation() {
  const { t } = useTranslation("storage");
  const queryClient = useQueryClient();
  const { activeOrg } = useOrg();
  const listKey = storageLocationsQueryOptions(activeOrg?.id).queryKey;

  const mutation = useMutation({
    mutationFn: ({ guid, scanIds }: MoveCardsToLocationInput) =>
      moveCardsToStorageLocation(guid, scanIds),
    onSuccess: (result, { collectionGuid }) => {
      if (!result.success || !result.data) {
        toast.error(result.message ?? t("toasts.failed"));
        return;
      }
      queryClient.setQueryData(listKey, result.data.locations);
      toast.success(t("toasts.cardsMoved", { count: result.data.moved }));
      void queryClient.invalidateQueries({
        queryKey: storageLocationKeys.root(),
      });
      if (collectionGuid) {
        void invalidateCollectionCards(queryClient, collectionGuid);
      }
    },
    onError: () => toast.error(t("toasts.failed")),
  });

  const moveCards = async (input: MoveCardsToLocationInput) => {
    const result = await mutation.mutateAsync(input).catch(() => null);
    return !!result?.success;
  };

  return { moveCards, isMoving: mutation.isPending };
}

export function useMoveCollectionsToLocation() {
  const { t } = useTranslation("storage");
  const queryClient = useQueryClient();
  const { activeOrg } = useOrg();
  const listKey = storageLocationsQueryOptions(activeOrg?.id).queryKey;

  const mutation = useMutation({
    mutationFn: async ({
      guid,
      collectionGuids,
    }: MoveCollectionsToLocationInput) => {
      let moved = 0;
      for (const collectionGuid of collectionGuids) {
        const result = await moveCollectionToStorageLocation(
          guid,
          collectionGuid,
        );
        if (!result.success || !result.data) return { ...result, moved };
        moved += result.data.moved;
        queryClient.setQueryData(listKey, result.data.locations);
      }
      return { success: true, moved };
    },
    onSuccess: (result, { collectionGuids }) => {
      if (!result.success) {
        toast.error(
          ("message" in result && result.message) || t("toasts.failed"),
        );
      } else {
        toast.success(t("toasts.cardsMoved", { count: result.moved }));
      }
      void queryClient.invalidateQueries({
        queryKey: storageLocationKeys.root(),
      });
      for (const collectionGuid of collectionGuids) {
        void invalidateCollectionCards(queryClient, collectionGuid);
      }
    },
    onError: () => toast.error(t("toasts.failed")),
  });

  const moveCollections = async (input: MoveCollectionsToLocationInput) => {
    const result = await mutation.mutateAsync(input).catch(() => null);
    return !!result?.success;
  };

  return { moveCollections, isMoving: mutation.isPending };
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
  queryClient.setQueriesData<StorageLocationCardPage | null>(
    { queryKey: storageLocationKeys.cardPages(entry.locationGuid) },
    (data) =>
      data && {
        ...data,
        cards: data.cards.map((card) =>
          card.scanId === entry.scanId ? { ...card, ...patch } : card,
        ),
      },
  );
  queryClient.setQueriesData<StorageLocationCardContext | null>(
    { queryKey: storageLocationKeys.cardContexts(entry.locationGuid) },
    (data) =>
      data?.card.scanId === entry.scanId
        ? { ...data, card: { ...data.card, ...patch } }
        : data,
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
      patchStoredCard(queryClient, entry, {
        card,
        corrected: true,
        reviewed: true,
      }),
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
      patchStoredCard(queryClient, entry, { corrected: true, reviewed: true }),
    onSuccess: (result) => {
      if (!result.success) toast.error(result.message ?? t("toasts.failed"));
    },
    onError: () => toast.error(t("toasts.failed")),
    onSettled: (_result, _error, entry) =>
      refreshStoredCard(queryClient, entry),
  });

  return {
    confirmCard: (entry: StorageLocationSearchResult) => mutation.mutate(entry),
  };
}

export function useMarkStoredCardReviewed() {
  const { t } = useTranslation("storage");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (entry: StorageLocationSearchResult) =>
      markCollectionCardReviewed(entry.collectionGuid, entry.scanId),
    onMutate: (entry) =>
      patchStoredCard(queryClient, entry, { reviewed: true }),
    onSuccess: (result) => {
      if (!result.success) toast.error(result.message ?? t("toasts.failed"));
    },
    onError: () => toast.error(t("toasts.failed")),
    onSettled: (_result, _error, entry) =>
      refreshStoredCard(queryClient, entry),
  });

  return {
    markReviewed: (entry: StorageLocationSearchResult) =>
      mutation.mutate(entry),
  };
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
    setFoilType: (
      entry: StorageLocationSearchResult,
      foilType: string | null,
    ) => mutation.mutate({ entry, foilType }),
  };
}

export function useSetStoredCardCondition() {
  const { t } = useTranslation("storage");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({
      entry,
      condition,
    }: {
      entry: StorageLocationSearchResult;
      condition: CardCondition;
    }) =>
      setCollectionCardCondition(entry.collectionGuid, entry.scanId, condition),
    onMutate: ({ entry, condition }) =>
      patchStoredCard(queryClient, entry, { condition }),
    onSuccess: (result) => {
      if (!result.success) toast.error(result.message ?? t("toasts.failed"));
    },
    onError: () => toast.error(t("toasts.failed")),
    onSettled: (_result, _error, { entry }) =>
      refreshStoredCard(queryClient, entry),
  });

  return {
    setCondition: (
      entry: StorageLocationSearchResult,
      condition: CardCondition,
    ) => mutation.mutate({ entry, condition }),
  };
}

export function useStoredCardActions(
  entry: StorageLocationSearchResult | null,
): CardDetailActions {
  const { correctCard } = useCorrectStoredCard();
  const { confirmCard } = useConfirmStoredCard();
  const { markReviewed } = useMarkStoredCardReviewed();
  const { setFoilType } = useSetStoredCardFoilType();
  const { setCondition } = useSetStoredCardCondition();

  return {
    correctCard: (_scanId, card) => {
      if (entry) void correctCard(entry, card);
    },
    confirmCard: () => {
      if (entry) confirmCard(entry);
    },
    markCardReviewed: () => {
      if (entry) markReviewed(entry);
    },
    setCardFoilType: (_scanId, foilType) => {
      if (entry) setFoilType(entry, foilType);
    },
    setCardCondition: (_scanId, condition) => {
      if (entry) setCondition(entry, condition);
    },
  };
}
