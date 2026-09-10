import type { BinConfigsContextValue } from "@/lib/interfaces/bins";
import {
  BinConfig,
  BinRuleGroup,
  BinSet,
  computeBinCount,
} from "@magic-vault/shared";

import {
  activateSet as activateSetAction,
  binsQueryOptions,
  clearBinConfig as clearBinConfigAction,
  createSet as createSetAction,
  deleteSet as deleteSetAction,
  renameSet as renameSetAction,
  resetAutoAssign as resetAutoAssignAction,
  saveBinConfig as saveBinConfigAction,
  saveSet as saveSetAction,
  setAutoAssignField as setAutoAssignFieldAction,
  setScanOnly as setScanOnlyAction,
} from "@/features/bins/api/sort-bins";
import { useModuleCount } from "@/features/calibration/api/use-module-count";
import { useCollections } from "@/features/collections/api/use-collections";
import { useOrg } from "@/features/companies/api/use-organization";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

function emptyRules(): BinRuleGroup {
  return { id: crypto.randomUUID(), combinator: "and", conditions: [] };
}

function createEmptyConfig(binNumber: number): BinConfig {
  return { guid: crypto.randomUUID(), binNumber, rules: emptyRules() };
}

function configsFromSet(
  set: BinSet | undefined,
  binCount: number,
): BinConfig[] {
  const filled: BinConfig[] = [];
  for (let i = 1; i <= binCount; i++) {
    const existing = set?.bins.find((c) => c.binNumber === i);
    filled.push(existing ?? createEmptyConfig(i));
  }
  return filled;
}

function matchesGame(set: BinSet, gameGuid: string | undefined): boolean {
  return (set.game?.guid ?? undefined) === gameGuid;
}

const BinConfigsContext = createContext<BinConfigsContextValue | null>(null);

export function BinConfigsProvider({
  children,
  collectionGuid,
}: {
  children: React.ReactNode;
  collectionGuid?: string;
}) {
  const { t } = useTranslation("bins");
  const queryClient = useQueryClient();
  const { activeOrg } = useOrg();
  const { activeCollection, collections } = useCollections();
  const moduleCount = useModuleCount();
  const [selectedBin, setSelectedBin] = useState(1);

  const { data: allSets = [] } = useQuery({
    ...binsQueryOptions,
    enabled: !!activeOrg,
  });

  const targetCollection = collectionGuid
    ? (collections.find((c) => c.guid === collectionGuid) ?? null)
    : activeCollection;

  const activeGameGuid = targetCollection?.game?.guid;
  const fieldDefinitions = targetCollection?.game?.fieldDefinitions ?? [];
  const apiDocsUrl = targetCollection?.game?.apiDocsUrl ?? null;
  const hasGame = !!targetCollection?.game;
  const hasCollection = !!targetCollection;

  const sets = useMemo(
    () => allSets.filter((s) => matchesGame(s, activeGameGuid)),
    [allSets, activeGameGuid],
  );

  const selectedSet = useMemo(
    () => sets.find((s) => s.isActive) ?? sets[0],
    [sets],
  );

  const configs = useMemo(
    () => configsFromSet(selectedSet, computeBinCount(moduleCount)),
    [selectedSet, moduleCount],
  );

  const hasCatchAll = useMemo(
    () => configs.some((c) => c.isCatchAll),
    [configs],
  );

  const selectedConfig =
    configs.find((c) => c.binNumber === selectedBin) ?? configs[0];

  const saveBinMutation = useMutation({
    mutationFn: saveBinConfigAction,
    onMutate: async ({ binNumber, rules, isCatchAll }) => {
      await queryClient.cancelQueries({ queryKey: ["bins"] });
      const previous = queryClient.getQueryData<BinSet[]>(["bins"]);
      queryClient.setQueryData<BinSet[]>(["bins"], (old = []) =>
        old.map((set) => {
          if (!set.isActive || !matchesGame(set, activeGameGuid)) return set;
          const idx = set.bins.findIndex((b) => b.binNumber === binNumber);
          const updated: BinConfig = {
            guid: idx >= 0 ? set.bins[idx].guid : crypto.randomUUID(),
            binNumber,
            rules: rules!,
            isCatchAll,
          };
          const bins =
            idx >= 0
              ? set.bins.map((b, i) => (i === idx ? updated : b))
              : [...set.bins, updated];
          return {
            ...set,
            bins: isCatchAll
              ? bins.map((b) =>
                  b.binNumber !== binNumber && b.isCatchAll
                    ? { ...b, isCatchAll: false }
                    : b,
                )
              : bins,
          };
        }),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous)
        queryClient.setQueryData(["bins"], context.previous);
      toast.error(t("useBinConfigs.toasts.saveBinFailed"));
    },
    onSuccess: (result) => {
      if (!result.success) {
        queryClient.invalidateQueries({ queryKey: ["bins"] });
        return;
      }
      if (result.data) {
        const confirmedBins = result.data;
        queryClient.setQueryData<BinSet[]>(["bins"], (old = []) =>
          old.map((set) =>
            set.isActive && matchesGame(set, activeGameGuid)
              ? { ...set, bins: confirmedBins }
              : set,
          ),
        );
      }
    },
  });

  const clearBinMutation = useMutation({
    mutationFn: (binNumber: number) =>
      clearBinConfigAction(binNumber, activeGameGuid),
    onMutate: async (binNumber) => {
      await queryClient.cancelQueries({ queryKey: ["bins"] });
      const previous = queryClient.getQueryData<BinSet[]>(["bins"]);
      queryClient.setQueryData<BinSet[]>(["bins"], (old = []) =>
        old.map((set) =>
          set.isActive && matchesGame(set, activeGameGuid)
            ? {
                ...set,
                bins: set.bins.filter((b) => b.binNumber !== binNumber),
              }
            : set,
        ),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous)
        queryClient.setQueryData(["bins"], context.previous);
      toast.error(t("useBinConfigs.toasts.clearBinFailed"));
    },
  });

  const activateSetMutation = useMutation({
    mutationFn: activateSetAction,
    onSuccess: (result) => {
      if (result.success && result.data) {
        setSelectedBin(1);
        queryClient.setQueryData(["bins"], result.data);
      }
    },
    onError: () => toast.error(t("useBinConfigs.toasts.activateSetFailed")),
  });

  const createSetMutation = useMutation({
    mutationFn: (name: string) =>
      createSetAction(name, undefined, activeGameGuid),
    onSuccess: (result) => {
      if (result.success && result.data) {
        setSelectedBin(1);
        queryClient.setQueryData(["bins"], result.data);
      }
    },
    onError: () => toast.error(t("useBinConfigs.toasts.createSetFailed")),
  });

  const saveSetMutation = useMutation({
    mutationFn: (name: string) => saveSetAction(name, activeGameGuid),
    onSuccess: (result) => {
      if (result.success && result.data) {
        queryClient.setQueryData(["bins"], result.data);
      }
    },
    onError: () => toast.error(t("useBinConfigs.toasts.saveSetFailed")),
  });

  const renameSetMutation = useMutation({
    mutationFn: ({ guid, name }: { guid: string; name: string }) =>
      renameSetAction(guid, name),
    onSuccess: (result) => {
      if (result.success && result.data) {
        queryClient.setQueryData(["bins"], result.data);
      }
    },
    onError: () => toast.error(t("useBinConfigs.toasts.renameSetFailed")),
  });

  const deleteSetMutation = useMutation({
    mutationFn: deleteSetAction,
    onSuccess: (result) => {
      if (result.success && result.data) {
        setSelectedBin(1);
        queryClient.setQueryData(["bins"], result.data);
      }
    },
    onError: () => toast.error(t("useBinConfigs.toasts.deleteSetFailed")),
  });

  const setAutoAssignFieldMutation = useMutation({
    mutationFn: ({ guid, field }: { guid: string; field: string | null }) =>
      setAutoAssignFieldAction(guid, field),
    onSuccess: (result) => {
      if (result.success && result.data) {
        queryClient.setQueryData(["bins"], result.data);
      } else {
        toast.error(t("useBinConfigs.toasts.autoAssignFailed"));
      }
    },
    onError: () => toast.error(t("useBinConfigs.toasts.autoAssignFailed")),
  });

  const resetAutoAssignMutation = useMutation({
    mutationFn: resetAutoAssignAction,
    onSuccess: (result) => {
      if (result.success && result.data) {
        queryClient.setQueryData(["bins"], result.data);
      } else {
        toast.error(t("useBinConfigs.toasts.autoAssignResetFailed"));
      }
    },
    onError: () => toast.error(t("useBinConfigs.toasts.autoAssignResetFailed")),
  });

  const setScanOnlyMutation = useMutation({
    mutationFn: ({ guid, enabled }: { guid: string; enabled: boolean }) =>
      setScanOnlyAction(guid, enabled),
    onSuccess: (result) => {
      if (result.success && result.data) {
        queryClient.setQueryData(["bins"], result.data);
      } else {
        toast.error(t("useBinConfigs.toasts.scanOnlyFailed"));
      }
    },
    onError: () => toast.error(t("useBinConfigs.toasts.scanOnlyFailed")),
  });

  const isPending = saveBinMutation.isPending || clearBinMutation.isPending;
  const isActivating = activateSetMutation.isPending;
  const isPresetMutating =
    activateSetMutation.isPending ||
    createSetMutation.isPending ||
    saveSetMutation.isPending ||
    renameSetMutation.isPending ||
    deleteSetMutation.isPending ||
    setAutoAssignFieldMutation.isPending ||
    resetAutoAssignMutation.isPending ||
    setScanOnlyMutation.isPending;

  const save = useCallback(
    (binNumber: number, rules: BinRuleGroup, isCatchAll?: boolean) => {
      saveBinMutation.mutate({
        binNumber,
        rules,
        isCatchAll,
        gameGuid: activeGameGuid,
      });
    },
    [saveBinMutation, activeGameGuid],
  );

  const clear = useCallback(
    (binNumber: number) => {
      clearBinMutation.mutate(binNumber);
    },
    [clearBinMutation],
  );

  const activateSetFn = useCallback(
    async (guid: string) => {
      await activateSetMutation.mutateAsync(guid);
    },
    [activateSetMutation],
  );

  const createSetFn = useCallback(
    async (name: string) => {
      await createSetMutation.mutateAsync(name);
    },
    [createSetMutation],
  );

  const saveSetFn = useCallback(
    async (name: string) => {
      await saveSetMutation.mutateAsync(name);
    },
    [saveSetMutation],
  );

  const renameSetFn = useCallback(
    async (guid: string, name: string) => {
      await renameSetMutation.mutateAsync({ guid, name });
    },
    [renameSetMutation],
  );

  const deleteSetFn = useCallback(
    async (guid: string) => {
      await deleteSetMutation.mutateAsync(guid);
    },
    [deleteSetMutation],
  );

  const setAutoAssignFieldFn = useCallback(
    async (field: string | null) => {
      if (!selectedSet) return;
      await setAutoAssignFieldMutation.mutateAsync({
        guid: selectedSet.guid,
        field,
      });
    },
    [setAutoAssignFieldMutation, selectedSet],
  );

  const resetAutoAssignFn = useCallback(async () => {
    if (!selectedSet) return;
    await resetAutoAssignMutation.mutateAsync(selectedSet.guid);
  }, [resetAutoAssignMutation, selectedSet]);

  const setScanOnlyFn = useCallback(
    async (enabled: boolean) => {
      if (!selectedSet) return;
      await setScanOnlyMutation.mutateAsync({ guid: selectedSet.guid, enabled });
    },
    [setScanOnlyMutation, selectedSet],
  );

  return (
    <BinConfigsContext
      value={{
        configs,
        sets,
        fieldDefinitions,
        hasGame,
        hasCollection,
        apiDocsUrl,
        isPending,
        isActivating,
        isPresetMutating,
        hasCatchAll,
        selectedBin,
        setSelectedBin,
        selectedConfig,
        selectedSet,
        save,
        clear,
        activateSet: activateSetFn,
        createSet: createSetFn,
        saveSet: saveSetFn,
        renameSet: renameSetFn,
        deleteSet: deleteSetFn,
        setAutoAssignField: setAutoAssignFieldFn,
        resetAutoAssign: resetAutoAssignFn,
        setScanOnly: setScanOnlyFn,
      }}
    >
      {children}
    </BinConfigsContext>
  );
}

export function useBinConfigs() {
  const context = useContext(BinConfigsContext);
  if (!context) {
    throw new Error("useBinConfigs must be used within a BinConfigsProvider");
  }
  return context;
}
