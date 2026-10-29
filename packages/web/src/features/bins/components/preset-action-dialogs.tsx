import { AuditDrawer } from "@/components/audit-drawer";
import { DeleteDialog } from "@/components/delete-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import {
  binsQueryOptions,
  checkSetName,
  getBinSetHistory,
  revertBinSet,
} from "@/features/bins/api/sort-bins";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { AutoAssignSnapshot } from "@/features/bins/components/auto-assign-snapshot";
import { useCollections } from "@/features/collections/api/use-collections";
import type { AuditEntry, BinSetAuditEntry } from "@/lib/interfaces/audit";
import type {
  PresetActionDialogsProps,
  PresetDialog,
} from "@/lib/interfaces/bins";
import { toast } from "@/lib/toast";
import {
  createSetSchema,
  type CreateSetFormValues,
} from "@/schemas/sort-bins.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import type { BinConfig, BinRuleGroup } from "@magic-vault/shared";
import { IconLoader2 } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

function countConditions(group: BinRuleGroup): number {
  return group.conditions.reduce((n, c) => {
    if ("combinator" in c) return n + countConditions(c as BinRuleGroup);
    return n + 1;
  }, 0);
}

function BinSnapshotSummary({ snapshot }: { snapshot: BinConfig[] }) {
  const { t } = useTranslation("bins");
  return (
    <div className="flex flex-col gap-0.5">
      {snapshot.map((bin) => {
        const count = countConditions(bin.rules);
        return (
          <div key={bin.binNumber} className="flex gap-2">
            <span className="w-10 shrink-0 text-foreground/70">
              {t("binLabel", { number: bin.binNumber })}
            </span>
            <span>
              {!bin.isCatchAll &&
                bin.isOverride &&
                `${t("binCard.override")} · `}
              {bin.isCatchAll
                ? count === 0
                  ? t("presetSelector.catchAll")
                  : `${t("presetSelector.catchAll")} · ${t("presetSelector.conditionCount", { count })}`
                : count === 0
                  ? t("presetSelector.noRules")
                  : t("presetSelector.conditionCount", { count })}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function PresetActionDialogs({
  openDialog,
  onOpenDialogChange,
}: PresetActionDialogsProps) {
  const { t } = useTranslation("bins");
  const {
    createSet,
    renameSet,
    deleteSet,
    selectedSet,
    isPresetMutating,
    resetAutoAssign,
  } = useBinConfigs();
  const { activeCollection } = useCollections();
  const queryClient = useQueryClient();
  const createDialogOpen = openDialog === "create";
  const renameDialogOpen = openDialog === "rename";
  const historyOpen = openDialog === "history";
  const selectedSetName = selectedSet?.name ?? "";

  const closeDialog = useCallback(
    () => onOpenDialogChange(null),
    [onOpenDialogChange],
  );

  const { data: historyResult, isLoading: historyLoading } = useQuery({
    queryKey: ["bins", "history", selectedSet?.guid],
    queryFn: () => getBinSetHistory(selectedSet!.guid),
    enabled: historyOpen && !!selectedSet?.guid,
    staleTime: 0,
  });

  const revertMutation = useMutation({
    mutationFn: revertBinSet,
    onSuccess: (result) => {
      if (result.success && result.data) {
        queryClient.setQueryData(binsQueryOptions.queryKey, result.data);
        queryClient.invalidateQueries({
          queryKey: ["bins", "history", selectedSet?.guid],
        });
        closeDialog();
        toast.success(t("presetSelector.revertSuccess"));
      }
    },
    onError: () => toast.error(t("presetSelector.revertFailed")),
  });

  const historyEntries = useMemo((): AuditEntry[] => {
    return (historyResult?.data ?? []).map((entry: BinSetAuditEntry) => ({
      guid: entry.guid,
      createdAt: entry.createdAt,
      body: <BinSnapshotSummary snapshot={entry.snapshot} />,
    }));
  }, [historyResult]);

  const createForm = useForm<CreateSetFormValues>({
    resolver: zodResolver(createSetSchema),
    defaultValues: { name: "" },
    mode: "onChange",
  });

  const renameForm = useForm<CreateSetFormValues>({
    resolver: zodResolver(createSetSchema),
    defaultValues: { name: selectedSetName },
    mode: "onChange",
  });

  useEffect(() => {
    if (renameDialogOpen) renameForm.reset({ name: selectedSetName });
  }, [renameDialogOpen, selectedSetName, renameForm]);

  const activeGameGuid = activeCollection?.game?.guid;

  const createNameValue = createForm.watch("name");
  const { data: createNameCheck } = useQuery({
    queryKey: ["bins", "check-name", createNameValue, activeGameGuid],
    queryFn: () => checkSetName(createNameValue, activeGameGuid),
    enabled: createDialogOpen && !!createNameValue?.trim(),
    staleTime: 0,
  });

  useEffect(() => {
    if (!createDialogOpen || !createNameValue?.trim()) return;
    if (
      createNameCheck?.success &&
      createNameCheck.data &&
      !createNameCheck.data.available
    ) {
      createForm.setError("name", {
        type: "taken",
        message: t("presetSelector.duplicateName"),
      });
    } else {
      createForm.clearErrors("name");
    }
  }, [createDialogOpen, createNameValue, createNameCheck, createForm, t]);

  const renameNameValue = renameForm.watch("name");
  const { data: renameNameCheck } = useQuery({
    queryKey: [
      "bins",
      "check-name",
      renameNameValue,
      activeGameGuid,
      selectedSet?.guid,
    ],
    queryFn: () =>
      checkSetName(renameNameValue, activeGameGuid, selectedSet?.guid),
    enabled: renameDialogOpen && !!renameNameValue?.trim(),
    staleTime: 0,
  });

  useEffect(() => {
    if (!renameDialogOpen || !renameNameValue?.trim()) return;
    if (
      renameNameCheck?.success &&
      renameNameCheck.data &&
      !renameNameCheck.data.available
    ) {
      renameForm.setError("name", {
        type: "taken",
        message: t("presetSelector.duplicateName"),
      });
    } else {
      renameForm.clearErrors("name");
    }
  }, [renameDialogOpen, renameNameValue, renameNameCheck, renameForm, t]);

  const handleCreate = useCallback(
    async (values: CreateSetFormValues) => {
      await createSet(values.name);
      createForm.reset();
      closeDialog();
    },
    [createSet, createForm, closeDialog],
  );

  const handleCreateDialogChange = useCallback(
    (open: boolean) => {
      onOpenDialogChange(open ? "create" : null);
      if (!open) createForm.reset();
    },
    [createForm, onOpenDialogChange],
  );

  const handleRename = useCallback(
    async (values: CreateSetFormValues) => {
      if (!selectedSet) return;
      await renameSet(selectedSet.guid, values.name);
      closeDialog();
    },
    [selectedSet, renameSet, closeDialog],
  );

  const handleDelete = useCallback(async () => {
    if (!selectedSet) return;
    await deleteSet(selectedSet.guid);
  }, [selectedSet, deleteSet]);

  const dialogOpenChange = (dialog: PresetDialog) => (open: boolean) =>
    onOpenDialogChange(open ? dialog : null);

  return (
    <>
      <DynamicDialog
        open={renameDialogOpen}
        onOpenChange={dialogOpenChange("rename")}
        title={t("presetSelector.renameSetTitle")}
        description={t("presetSelector.renameSetDescription")}
        footer={
          <>
            <Button variant="outline" onClick={closeDialog}>
              {t("presetSelector.cancel")}
            </Button>
            <Button
              type="submit"
              form="rename-set-form"
              disabled={!renameForm.formState.isValid || isPresetMutating}
            >
              {isPresetMutating && (
                <IconLoader2 className="size-4 animate-spin" />
              )}
              {t("presetSelector.rename")}
            </Button>
          </>
        }
        footerClassName="flex-col-reverse md:flex-row"
      >
        <form
          id="rename-set-form"
          onSubmit={renameForm.handleSubmit(handleRename)}
        >
          <Controller
            name="name"
            control={renameForm.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid || undefined}>
                <FieldLabel htmlFor="rename-set-name">
                  {t("presetSelector.setNameLabel")}
                </FieldLabel>
                <Input
                  {...field}
                  id="rename-set-name"
                  placeholder={t("presetSelector.setNamePlaceholder")}
                  aria-invalid={fieldState.invalid}
                  autoFocus
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </form>
      </DynamicDialog>
      <DynamicDialog
        open={createDialogOpen}
        onOpenChange={handleCreateDialogChange}
        title={t("presetSelector.newSetTitle")}
        description={t("presetSelector.newSetDescription")}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => handleCreateDialogChange(false)}
            >
              {t("presetSelector.cancel")}
            </Button>
            <Button
              type="submit"
              form="create-set-form"
              disabled={!createForm.formState.isValid || isPresetMutating}
            >
              {isPresetMutating && (
                <IconLoader2 className="size-4 animate-spin" />
              )}
              {t("presetSelector.create")}
            </Button>
          </>
        }
        footerClassName="flex-col-reverse md:flex-row"
      >
        <form
          id="create-set-form"
          onSubmit={createForm.handleSubmit(handleCreate)}
        >
          <Controller
            name="name"
            control={createForm.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid || undefined}>
                <FieldLabel htmlFor="set-name">
                  {t("presetSelector.setNameLabel")}
                </FieldLabel>
                <Input
                  {...field}
                  id="set-name"
                  placeholder={t("presetSelector.setNamePlaceholder")}
                  aria-invalid={fieldState.invalid}
                  autoFocus
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </form>
      </DynamicDialog>
      <DeleteDialog
        open={openDialog === "delete"}
        onOpenChange={dialogOpenChange("delete")}
        title={t("presetSelector.deleteSetTitle")}
        description={t("presetSelector.deleteSetDescription", {
          name: selectedSet?.name,
        })}
        confirm={{ type: "name", name: selectedSetName }}
        onConfirm={handleDelete}
      />
      <DeleteDialog
        open={openDialog === "resetAutoAssign"}
        onOpenChange={dialogOpenChange("resetAutoAssign")}
        title={t("autoAssignPanel.resetConfirmTitle")}
        description={t("autoAssignPanel.resetConfirmDescription")}
        confirmLabel={t("autoAssignPanel.reset")}
        onConfirm={resetAutoAssign}
      >
        <AutoAssignSnapshot />
      </DeleteDialog>
      <AuditDrawer
        open={historyOpen}
        onOpenChange={dialogOpenChange("history")}
        title={t("presetSelector.historyTitle")}
        entries={historyEntries}
        isLoading={historyLoading}
        onRevert={(guid) => revertMutation.mutate(guid)}
        isReverting={revertMutation.isPending}
      />
    </>
  );
}
