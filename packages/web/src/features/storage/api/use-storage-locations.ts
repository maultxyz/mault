import {
  confirmCollectionCard,
  markCollectionCardReviewed,
  setCollectionCardCondition,
  setCollectionCardLanguage,
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

export function useStorageLocations({ withList = true } = {}) {
  const { t } = useTranslation("storage");
  const queryClient = useQueryClient();
  const { activeOrg } = useOrg();
  const listOptions = storageLocationsQueryOptions(activeOrg?.id);
  const { data: locations = [], isPending } = useQuery({
    ...listOptions,
    enabled: listOptions.enabled !== false && !!activeOrg?.id && withList,
  });
  const invalidateAll = () =>
    void queryClient.invalidateQueries({ queryKey: storageLocationKeys.root() });

  const applyResult = (result: Result<null>) => {
    if (!result.success) {
      toast.error(result.message ?? t("toasts.failed"));
      return false;
    }
    invalidateAll();
    return true;
  };

  const createMutation = useMutation({
    mutationFn: createStorageLocation,
    onSuccess: (result) => {
      if (!result.success || !result.data) {
        toast.error(result.message ?? t("toasts.failed"));
        return;
      }
      invalidateAll();
    },
    onError: () => toast.error(t("toasts.failed")),
  });

  const renameMutation = useMutation({
    mutationFn: ({ guid, name }: { guid: string; name: string }) =>
      renameStorageLocation(guid, name),
    onSuccess: applyResult,
    onError: () => toast.error(t("toasts.failed")),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStorageLocation,
    onSuccess: applyResult,
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
    isLoading: withList && !!activeOrg && isPending,
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

  const mutation = useMutation({
    mutationFn: ({ guid, scanIds }: MoveCardsToLocationInput) =>
      moveCardsToStorageLocation(guid, scanIds),
    onSuccess: (result, { collectionGuid }) => {
      if (!result.success || !result.data) {
        toast.error(result.message ?? t("toasts.failed"));
        return;
      }
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

export function useSetStoredCardLanguage() {
  const { t } = useTranslation("storage");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({
      entry,
      language,
    }: {
      entry: StorageLocationSearchResult;
      language: string;
    }) =>
      setCollectionCardLanguage(entry.collectionGuid, entry.scanId, language),
    onMutate: ({ entry, language }) =>
      patchStoredCard(queryClient, entry, { language }),
    onSuccess: (result) => {
      if (!result.success) toast.error(result.message ?? t("toasts.failed"));
    },
    onError: () => toast.error(t("toasts.failed")),
    onSettled: (_result, _error, { entry }) =>
      refreshStoredCard(queryClient, entry),
  });

  return {
    setLanguage: (entry: StorageLocationSearchResult, language: string) =>
      mutation.mutate({ entry, language }),
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
  const { setLanguage } = useSetStoredCardLanguage();

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
    setCardLanguage: (_scanId, language) => {
      if (entry) setLanguage(entry, language);
    },
  };
}
