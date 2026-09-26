import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  BinConfigsContextValue,
  BinModeDraft,
} from "@/lib/interfaces/bins";
import {
  BinConfig,
  BinRuleGroup,
  BinSet,
  computeBinCount,
  DEFAULT_BIN_CAPACITY,
  type DefaultBinInit,
  type RepackSlot,
} from "@magic-vault/shared";

import {
  activateSet as activateSetAction,
  binsQueryOptions,
  createSet as createSetAction,
  deleteSet as deleteSetAction,
  emptyBin as emptyBinAction,
  renameSet as renameSetAction,
  resetAutoAssign as resetAutoAssignAction,
  saveBinConfig as saveBinConfigAction,
  saveSet as saveSetAction,
  setAutoAssignField as setAutoAssignFieldAction,
  setRepackConfig as setRepackConfigAction,
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
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

function emptyRules(): BinRuleGroup {
  return { id: crypto.randomUUID(), combinator: "and", conditions: [] };
}

function createEmptyConfig(binNumber: number): BinConfig {
  return {
    guid: crypto.randomUUID(),
    binNumber,
    rules: emptyRules(),
    cardLimit: DEFAULT_BIN_CAPACITY,
  };
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
  const { t: tCommon } = useTranslation("common");
  const moduleCount = useModuleCount();
  const [selectedBin, setSelectedBinState] = useState(1);
  const [isBinFormDirty, setBinFormDirty] = useState(false);
  const [pendingBinNumber, setPendingBinNumber] = useState<number | null>(
    null,
  );

  const { data: allSets = [] } = useQuery({
    ...binsQueryOptions,
    enabled: !!activeOrg,
  });

  const targetCollection = collectionGuid
    ? (collections.find((c) => c.guid === collectionGuid) ?? null)
    : activeCollection;

  const activeGameGuid = targetCollection?.game?.guid;
  const gameKey = targetCollection?.game?.key ?? null;
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

  const [modeDraft, setModeDraft] = useState<BinModeDraft | null>(null);
  const [isSavingMode, setIsSavingMode] = useState(false);

  useEffect(() => {
    setModeDraft(null);
  }, [selectedSet?.guid]);

  const modeBaseline: BinModeDraft = {
    autoAssignField: selectedSet?.autoAssignField ?? null,
    scanOnly: selectedSet?.scanOnly ?? false,
    isRepackMode: selectedSet?.isRepackMode ?? false,
  };
  const effectiveMode = modeDraft ?? modeBaseline;
  const isModeDirty =
    modeDraft !== null &&
    (modeDraft.autoAssignField !== modeBaseline.autoAssignField ||
      modeDraft.scanOnly !== modeBaseline.scanOnly ||
      modeDraft.isRepackMode !== modeBaseline.isRepackMode);

  const saveBinMutation = useMutation({
    mutationFn: saveBinConfigAction,
    onMutate: async ({ binNumber, rules, isCatchAll, isOverride, cardLimit }) => {
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
            isOverride,
            cardLimit: cardLimit ?? null,
            lastEmptiedAt: idx >= 0 ? set.bins[idx].lastEmptiedAt : null,
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

  const activateSetMutation = useMutation({
    mutationFn: activateSetAction,
    onSuccess: (result) => {
      if (result.success && result.data) {
        setSelectedBinState(1);
        setPendingBinNumber(null);
        queryClient.setQueryData(["bins"], result.data);
      }
    },
    onError: () => toast.error(t("useBinConfigs.toasts.activateSetFailed")),
  });

  const createSetMutation = useMutation({
    mutationFn: ({
      name,
      initialBins,
    }: {
      name: string;
      initialBins?: DefaultBinInit[];
    }) => createSetAction(name, initialBins, activeGameGuid),
    onSuccess: (result) => {
      if (result.success && result.data) {
        setSelectedBinState(1);
        setPendingBinNumber(null);
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
        setSelectedBinState(1);
        setPendingBinNumber(null);
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

  const emptyBinMutation = useMutation({
    mutationFn: (binNumber: number) => emptyBinAction(binNumber, activeGameGuid),
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(t("useBinConfigs.toasts.emptyBinFailed"));
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
    onError: () => toast.error(t("useBinConfigs.toasts.emptyBinFailed")),
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

  const setRepackConfigMutation = useMutation({
    mutationFn: ({
      guid,
      config,
    }: {
      guid: string;
      config: {
        isRepackMode: boolean;
        repackSlots: RepackSlot[];
        repackAllowDuplicates: boolean;
      };
    }) => setRepackConfigAction(guid, config),
    onSuccess: (result) => {
      if (result.success && result.data) {
        queryClient.setQueryData(["bins"], result.data);
      } else {
        toast.error(t("useBinConfigs.toasts.repackFailed"));
      }
    },
    onError: () => toast.error(t("useBinConfigs.toasts.repackFailed")),
  });

  const isPending = saveBinMutation.isPending;
  const isActivating = activateSetMutation.isPending;
  const isPresetMutating =
    activateSetMutation.isPending ||
    createSetMutation.isPending ||
    saveSetMutation.isPending ||
    renameSetMutation.isPending ||
    deleteSetMutation.isPending ||
    setAutoAssignFieldMutation.isPending ||
    resetAutoAssignMutation.isPending ||
    setScanOnlyMutation.isPending ||
    setRepackConfigMutation.isPending;

  const save = useCallback(
    (
      binNumber: number,
      rules: BinRuleGroup,
      isCatchAll?: boolean,
      cardLimit?: number | null,
      isOverride?: boolean,
    ) => {
      saveBinMutation.mutate({
        binNumber,
        rules,
        isCatchAll,
        isOverride,
        cardLimit,
        gameGuid: activeGameGuid,
      });
    },
    [saveBinMutation, activeGameGuid],
  );

  const emptyBin = useCallback(
    async (binNumber: number) => {
      await emptyBinMutation.mutateAsync(binNumber);
    },
    [emptyBinMutation],
  );

  const activateSetFn = useCallback(
    async (guid: string) => {
      await activateSetMutation.mutateAsync(guid);
    },
    [activateSetMutation],
  );

  const createSetFn = useCallback(
    async (name: string) => {
      await createSetMutation.mutateAsync({ name });
    },
    [createSetMutation],
  );

  const importSetFn = useCallback(
    async (name: string, initialBins: DefaultBinInit[]) => {
      const result = await createSetMutation.mutateAsync({ name, initialBins });
      return result.success;
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

  const setRepackConfigFn = useCallback(
    async (config: {
      isRepackMode: boolean;
      repackSlots: RepackSlot[];
      repackAllowDuplicates: boolean;
    }) => {
      if (!selectedSet) return;
      await setRepackConfigMutation.mutateAsync({
        guid: selectedSet.guid,
        config,
      });
    },
    [setRepackConfigMutation, selectedSet],
  );

  const stageMode = (patch: Partial<BinModeDraft>) => {
    setModeDraft((prev) => ({ ...(prev ?? modeBaseline), ...patch }));
  };

  const discardMode = () => setModeDraft(null);

  const saveMode = async () => {
    if (!modeDraft || !selectedSet) return;
    setIsSavingMode(true);
    try {
      if (modeDraft.autoAssignField !== modeBaseline.autoAssignField) {
        await setAutoAssignFieldFn(modeDraft.autoAssignField);
      }
      if (modeDraft.scanOnly !== modeBaseline.scanOnly) {
        await setScanOnlyFn(modeDraft.scanOnly);
      }
      if (modeDraft.isRepackMode !== modeBaseline.isRepackMode) {
        await setRepackConfigFn({
          isRepackMode: modeDraft.isRepackMode,
          repackSlots: selectedSet.repackSlots,
          repackAllowDuplicates: selectedSet.repackAllowDuplicates,
        });
        if (modeDraft.isRepackMode) {
          const lastBin = configs[configs.length - 1];
          if (lastBin && !lastBin.isCatchAll) {
            save(lastBin.binNumber, lastBin.rules, true, lastBin.cardLimit);
          }
        }
      }
      setModeDraft(null);
    } finally {
      setIsSavingMode(false);
    }
  };

  const requestSelectBin = useCallback(
    (bin: number) => {
      if (bin === selectedBin) return;
      if (isBinFormDirty) {
        setPendingBinNumber(bin);
        return;
      }
      setSelectedBinState(bin);
    },
    [selectedBin, isBinFormDirty],
  );

  const confirmBinSwitch = useCallback(() => {
    if (pendingBinNumber !== null) setSelectedBinState(pendingBinNumber);
    setPendingBinNumber(null);
  }, [pendingBinNumber]);

  const cancelBinSwitch = useCallback(() => setPendingBinNumber(null), []);

  return (
    <BinConfigsContext
      value={{
        configs,
        sets,
        fieldDefinitions,
        gameKey,
        hasGame,
        hasCollection,
        apiDocsUrl,
        isPending,
        isActivating,
        isPresetMutating,
        hasCatchAll,
        selectedBin,
        setSelectedBin: requestSelectBin,
        setBinFormDirty,
        selectedConfig,
        selectedSet,
        save,
        emptyBin,
        activateSet: activateSetFn,
        createSet: createSetFn,
        importSet: importSetFn,
        saveSet: saveSetFn,
        renameSet: renameSetFn,
        deleteSet: deleteSetFn,
        setAutoAssignField: setAutoAssignFieldFn,
        resetAutoAssign: resetAutoAssignFn,
        setScanOnly: setScanOnlyFn,
        setRepackConfig: setRepackConfigFn,
        effectiveMode,
        isModeDirty,
        isSavingMode,
        stageMode,
        saveMode,
        discardMode,
      }}
    >
      {children}

      <Dialog
        open={pendingBinNumber !== null}
        onOpenChange={(open) => {
          if (!open) cancelBinSwitch();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tCommon("unsavedChanges.leaveTitle")}</DialogTitle>
            <DialogDescription>
              {tCommon("unsavedChanges.leaveDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={cancelBinSwitch}>
              {tCommon("unsavedChanges.keepEditing")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmBinSwitch}
            >
              {tCommon("unsavedChanges.discardAndLeave")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
