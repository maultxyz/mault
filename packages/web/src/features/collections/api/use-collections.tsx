import {
  activateSet as activateSetFn,
  binsQueryOptions,
  createSet as createSetFn,
} from "@/features/bins/api/sort-bins";
import { useModuleCount } from "@/features/calibration/api/use-module-count";
import {
  activateCollection as activateCollectionFn,
  clearCollectionCards,
  collectionsQueryOptions,
  createCollection as createCollectionFn,
  deleteCollection as deleteCollectionFn,
  updateCollection as updateCollectionFn,
} from "@/features/collections/api/collections";
import { useOrg } from "@/features/companies/api/use-organization";
import { useStation, useStations } from "@/features/scanner/api/use-stations";
import {
  computeBinCount,
  createDefaultCatchAllOnlyBins,
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
    matchThreshold: number | null,
  ) => Promise<void>;
  updateCollection: (
    guid: string,
    name: string,
    matchThreshold: number | null,
  ) => Promise<void>;
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

  const { station, isLive } = useStation();
  const { stations, claimStationCollection, isStationLive } = useStations();
  const activeGuid = station.collectionGuid;

  const setActiveGuid = useCallback(
    (guid: string | null) => {
      const claimed = claimStationCollection(station.id, guid);
      if (!claimed) toast.error(t("errors.openInAnotherSorter"));
      return claimed;
    },
    [claimStationCollection, station.id, t],
  );

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

  // Only live stations (connected, or being viewed) hold a collection; the
  // idle standby's pick never blocks anyone.
  const activeCollection = useMemo(() => {
    const taken = new Set(
      stations
        .filter((s) => s.id !== station.id && isStationLive(s.id))
        .map((s) => s.collectionGuid),
    );
    if (activeGuid && !taken.has(activeGuid)) {
      const found = collections.find((c) => c.guid === activeGuid);
      if (found) return found;
    }
    // No usable stored preference - fall back to the most recently updated
    // collection no other sorter is already scanning into.
    return collections.find((c) => !taken.has(c.guid)) ?? null;
  }, [collections, activeGuid, stations, station.id, isStationLive]);

  // Pins the fallback pick so a second station's fallback can't land on it too.
  useEffect(() => {
    if (isLive && activeCollection && activeGuid !== activeCollection.guid) {
      claimStationCollection(station.id, activeCollection.guid);
    }
  }, [
    isLive,
    activeGuid,
    activeCollection,
    claimStationCollection,
    station.id,
  ]);

  function setCollections(data: Collection[]) {
    queryClient.setQueryData(["collections"], data);
  }

  const createMutation = useMutation({
    mutationFn: ({
      name,
      gameGuid,
      lang,
      matchThreshold,
    }: {
      name: string;
      gameGuid: string;
      lang: string;
      matchThreshold: number | null;
    }) => createCollectionFn(name, gameGuid, lang, matchThreshold),
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
          const binsResult = await createSetFn(
            name,
            createDefaultCatchAllOnlyBins(computeBinCount(moduleCount)),
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

  const updateMutation = useMutation({
    mutationFn: ({
      guid,
      name,
      matchThreshold,
    }: {
      guid: string;
      name: string;
      matchThreshold: number | null;
    }) => updateCollectionFn(guid, name, matchThreshold),
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
    updateMutation.isPending ||
    deleteMutation.isPending ||
    emptyMutation.isPending;

  const create = useCallback(
    async (
      name: string,
      gameGuid: string,
      lang: string,
      matchThreshold: number | null,
    ) => {
      await createMutation.mutateAsync({ name, gameGuid, lang, matchThreshold });
    },
    [createMutation],
  );

  const update = useCallback(
    async (guid: string, name: string, matchThreshold: number | null) => {
      await updateMutation.mutateAsync({ guid, name, matchThreshold });
    },
    [updateMutation],
  );

  const activate = useCallback(
    async (guid: string) => {
      if (!setActiveGuid(guid)) return;
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
        updateCollection: update,
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
