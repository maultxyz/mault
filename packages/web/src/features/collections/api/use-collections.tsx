import {
  activateSet as activateSetFn,
  binsQueryOptions,
  createSet as createSetFn,
} from "@/features/bins/api/sort-bins";
import {
  activateCollection as activateCollectionFn,
  clearCollectionCards,
  collectionsQueryOptions,
  createCollection as createCollectionFn,
  deleteCollection as deleteCollectionFn,
  renameCollection as renameCollectionFn,
} from "@/features/collections/api/collections";
import { useModuleCount } from "@/features/calibration/api/use-module-count";
import { useOrg } from "@/features/companies/api/use-organization";
import { ACTIVE_COLLECTION_STORAGE_KEY } from "@/lib/constants/storage-keys";
import {
  computeBinCount,
  createDefaultCatchAllOnlyBins,
  createDefaultColorBins,
  type BinSet,
  type Collection,
} from "@magic-vault/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface CollectionsContextValue {
  collections: Collection[];
  activeCollection: Collection | null;
  isLoading: boolean;
  isActivating: boolean;
  isMutating: boolean;
  createCollection: (
    name: string,
    gameGuid: string,
    lang: string,
  ) => Promise<void>;
  renameCollection: (guid: string, name: string) => Promise<void>;
  activateCollection: (guid: string) => Promise<void>;
  deleteCollection: (guid: string) => Promise<void>;
  emptyCollection: (guid: string) => Promise<void>;
}

const CollectionsContext = createContext<CollectionsContextValue | null>(null);

export function CollectionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation("collections");
  const queryClient = useQueryClient();
  const { activeOrg } = useOrg();
  const moduleCount = useModuleCount();
  const { data: collections = [], isPending: isLoading } = useQuery({
    ...collectionsQueryOptions,
    enabled: !!activeOrg,
  });

  const [activeGuid, setActiveGuidState] = useState<string | null>(() =>
    localStorage.getItem(ACTIVE_COLLECTION_STORAGE_KEY),
  );

  const setActiveGuid = useCallback((guid: string | null) => {
    setActiveGuidState(guid);
    if (guid) localStorage.setItem(ACTIVE_COLLECTION_STORAGE_KEY, guid);
    else localStorage.removeItem(ACTIVE_COLLECTION_STORAGE_KEY);
  }, []);

  // If the stored guid no longer exists (e.g. collection deleted), clear it
  useEffect(() => {
    if (
      activeGuid &&
      collections.length > 0 &&
      !collections.find((c) => c.guid === activeGuid)
    ) {
      setActiveGuid(null);
    }
  }, [collections, activeGuid, setActiveGuid]);

  const activeCollection = useMemo(() => {
    if (activeGuid) {
      const found = collections.find((c) => c.guid === activeGuid);
      if (found) return found;
    }
    // First load or no stored preference - fall back to most recently updated
    return collections[0] ?? null;
  }, [collections, activeGuid]);

  function setCollections(data: Collection[]) {
    queryClient.setQueryData(["collections"], data);
  }

  const createMutation = useMutation({
    mutationFn: ({
      name,
      gameGuid,
      lang,
    }: {
      name: string;
      gameGuid: string;
      lang: string;
    }) => createCollectionFn(name, gameGuid, lang),
    onSuccess: async (r, { name }) => {
      if (r.success && r.data) {
        setCollections(r.data);
        const created = r.data.find((c) => c.isActive);
        if (created) setActiveGuid(created.guid);

        const gameGuid = created?.game?.guid;
        const existingSets: BinSet[] =
          await queryClient.ensureQueryData(binsQueryOptions);
        const sameGameSet = existingSets.find(
          (s) => (s.game?.guid ?? undefined) === gameGuid,
        );
        if (!sameGameSet) {
          const isMtg = created?.game?.key === "mtg";
          const binsResult = await createSetFn(
            name,
            isMtg
              ? createDefaultColorBins(computeBinCount(moduleCount))
              : createDefaultCatchAllOnlyBins(computeBinCount(moduleCount)),
            gameGuid,
          );
          if (binsResult.success && binsResult.data) {
            queryClient.setQueryData(["bins"], binsResult.data);
          }
        } else {
          const activateResult = await activateSetFn(sameGameSet.guid);
          if (activateResult.success && activateResult.data) {
            queryClient.setQueryData(["bins"], activateResult.data);
          }
        }
      }
    },
    onError: () => toast.error(t("errors.createFailed")),
  });

  const renameMutation = useMutation({
    mutationFn: ({ guid, name }: { guid: string; name: string }) =>
      renameCollectionFn(guid, name),
    onSuccess: (r) => {
      if (r.success && r.data) setCollections(r.data);
    },
    onError: () => toast.error(t("errors.renameFailed")),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCollectionFn,
    onSuccess: (r) => {
      if (r.success && r.data) setCollections(r.data);
    },
    onError: () => toast.error(t("errors.deleteFailed")),
  });

  const emptyMutation = useMutation({
    mutationFn: clearCollectionCards,
    onSuccess: (r, guid) => {
      if (r.success) {
        setCollections(
          collections.map((c) =>
            c.guid === guid ? { ...c, cardCount: 0, updatedAt: new Date() } : c,
          ),
        );
      }
    },
    onError: () => toast.error(t("errors.emptyFailed")),
  });

  const isMutating =
    createMutation.isPending ||
    renameMutation.isPending ||
    deleteMutation.isPending ||
    emptyMutation.isPending;

  const create = useCallback(
    async (name: string, gameGuid: string, lang: string) => {
      await createMutation.mutateAsync({ name, gameGuid, lang });
    },
    [createMutation],
  );

  const rename = useCallback(
    async (guid: string, name: string) => {
      await renameMutation.mutateAsync({ guid, name });
    },
    [renameMutation],
  );

  const activate = useCallback(
    async (guid: string) => {
      setActiveGuid(guid);
      // Fire-and-forget to server so the org has a "last used" hint for new devices
      activateCollectionFn(guid).catch(() => {});
    },
    [setActiveGuid],
  );

  const remove = useCallback(
    async (guid: string) => {
      await deleteMutation.mutateAsync(guid);
    },
    [deleteMutation],
  );

  const empty = useCallback(
    async (guid: string) => {
      await emptyMutation.mutateAsync(guid);
    },
    [emptyMutation],
  );

  return (
    <CollectionsContext
      value={{
        collections,
        activeCollection,
        isLoading,
        isActivating: false,
        isMutating,
        createCollection: create,
        renameCollection: rename,
        activateCollection: activate,
        deleteCollection: remove,
        emptyCollection: empty,
      }}
    >
      {children}
    </CollectionsContext>
  );
}

export function useCollections() {
  const context = useContext(CollectionsContext);
  if (!context) {
    throw new Error("useCollections must be used within a CollectionsProvider");
  }
  return context;
}
