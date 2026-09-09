import { AuditDrawer, type AuditEntry } from "@/components/audit-drawer";
import { DeleteDialog } from "@/components/delete-dialog";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { InputGroupAddon } from "@/components/ui/input-group";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  binsQueryOptions,
  getBinSetHistory,
  revertBinSet,
  type BinSetAuditEntry,
} from "@/features/bins/api/sort-bins";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { AutoAssignSnapshot } from "@/features/bins/components/auto-assign-snapshot";
import type { PresetSelectorProps } from "@/features/bins/types";
import { useCollections } from "@/features/collections/api/use-collections";
import { useOrg } from "@/features/companies/api/use-organization";
import {
  createSetSchema,
  type CreateSetFormValues,
} from "@/schemas/sort-bins.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import type { BinConfig, BinRuleGroup, BinSet } from "@magic-vault/shared";
import {
  IconClockHour3,
  IconEdit,
  IconLoader2,
  IconPlus,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "sonner";

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
            <span className="w-10 shrink-0 text-muted-foreground">
              {t("presetSelector.binLabel", { number: bin.binNumber })}
            </span>
            <span>
              {bin.isCatchAll
                ? t("presetSelector.catchAll")
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

export function PresetSelector({ readOnly }: PresetSelectorProps) {
  const { t } = useTranslation("bins");
  const {
    sets,
    activateSet,
    createSet,
    renameSet,
    deleteSet,
    selectedSet,
    isActivating,
    isPresetMutating,
    resetAutoAssign,
  } = useBinConfigs();
  const { activeCollection } = useCollections();
  const { activeOrg } = useOrg();
  const queryClient = useQueryClient();
  const { isLoading } = useQuery({ ...binsQueryOptions, enabled: !!activeOrg });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [resetAutoAssignDialogOpen, setResetAutoAssignDialogOpen] =
    useState(false);

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
        queryClient.setQueryData<BinSet[]>(["bins"], result.data);
        queryClient.invalidateQueries({
          queryKey: ["bins", "history", selectedSet?.guid],
        });
        setHistoryOpen(false);
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
    defaultValues: { name: selectedSet?.name ?? "" },
    mode: "onChange",
  });

  const handleCreate = useCallback(
    async (values: CreateSetFormValues) => {
      await createSet(values.name);
      createForm.reset();
      setCreateDialogOpen(false);
    },
    [createSet, createForm],
  );

  const handleCreateDialogChange = useCallback(
    (open: boolean) => {
      setCreateDialogOpen(open);
      if (!open) createForm.reset();
    },
    [createForm],
  );

  const handleRename = useCallback(
    async (values: CreateSetFormValues) => {
      if (!selectedSet) return;
      await renameSet(selectedSet.guid, values.name);
      setRenameDialogOpen(false);
    },
    [selectedSet, renameSet],
  );

  const handleRenameDialogChange = useCallback(
    (open: boolean) => {
      setRenameDialogOpen(open);
      if (open) renameForm.reset({ name: selectedSet?.name ?? "" });
    },
    [selectedSet, renameForm],
  );

  const handleDelete = useCallback(async () => {
    if (!selectedSet) return;
    await deleteSet(selectedSet.guid);
  }, [selectedSet, deleteSet]);

  if (isLoading) {
    return (
      <ButtonGroup className="w-full">
        <Skeleton className="h-9 flex-1 rounded-lg" />
        {readOnly ? (
          <Skeleton className="size-9 shrink-0" />
        ) : (
          <>
            <Skeleton className="size-9 shrink-0" />
            <Skeleton className="size-9 shrink-0" />
            <Skeleton className="size-9 shrink-0" />
            <Skeleton className="size-9 shrink-0" />
          </>
        )}
      </ButtonGroup>
    );
  }

  return (
    <Field>
      <FieldLabel>{t("presetSelector.sortingLogic")}</FieldLabel>
      <ButtonGroup className="w-full">
        <Combobox
          items={sets}
          value={selectedSet ?? null}
          onValueChange={(set) => set && activateSet(set.guid)}
          itemToStringLabel={(set: BinSet) => set.name}
          isItemEqualToValue={(a: BinSet, b: BinSet) => a?.guid === b?.guid}
        >
          <ComboboxInput
            className="flex-1 overflow-hidden"
            placeholder={t("presetSelector.selectSetPlaceholder")}
            disabled={isActivating}
          >
            {isActivating && (
              <InputGroupAddon align="inline-start">
                <IconLoader2 className="size-3 animate-spin text-muted-foreground" />
              </InputGroupAddon>
            )}
          </ComboboxInput>
          <ComboboxContent>
            <ComboboxEmpty>{t("presetSelector.noMatchingSets")}</ComboboxEmpty>
            <ComboboxList>
              {(set: BinSet) => (
                <ComboboxItem key={set.guid} value={set}>
                  <span className="truncate">{set.name}</span>
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
        {readOnly ? (
          <>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    nativeButton={false}
                    variant="outline"
                    size="icon"
                    disabled={!activeCollection}
                  >
                    <Link
                      to={`/app/collections/${activeCollection?.guid}/bins`}
                    >
                      <IconEdit />
                    </Link>
                  </Button>
                }
              ></TooltipTrigger>
              <TooltipContent>
                {t("presetSelector.editSortingLogic")}
              </TooltipContent>
            </Tooltip>
            {!!selectedSet?.autoAssignField && (
              <>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={!selectedSet || isPresetMutating}
                        onClick={() => setResetAutoAssignDialogOpen(true)}
                      >
                        <IconRefresh />
                      </Button>
                    }
                  ></TooltipTrigger>
                  <TooltipContent>{t("autoAssignPanel.reset")}</TooltipContent>
                </Tooltip>
                <DeleteDialog
                  open={resetAutoAssignDialogOpen}
                  onOpenChange={setResetAutoAssignDialogOpen}
                  title={t("autoAssignPanel.resetConfirmTitle")}
                  description={t("autoAssignPanel.resetConfirmDescription")}
                  confirmLabel={t("autoAssignPanel.reset")}
                  onConfirm={resetAutoAssign}
                >
                  <AutoAssignSnapshot />
                </DeleteDialog>
              </>
            )}
          </>
        ) : (
          <>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={!selectedSet}
                    onClick={() => setHistoryOpen(true)}
                  >
                    <IconClockHour3 />
                  </Button>
                }
              ></TooltipTrigger>
              <TooltipContent>{t("presetSelector.viewHistory")}</TooltipContent>
            </Tooltip>
            <DynamicDialog
              open={renameDialogOpen}
              onOpenChange={handleRenameDialogChange}
              title={t("presetSelector.renameSetTitle")}
              description={t("presetSelector.renameSetDescription")}
              trigger={
                <Button
                  variant="outline"
                  size="icon"
                  disabled={!selectedSet || isPresetMutating}
                >
                  <IconEdit />
                </Button>
              }
              footer={
                <>
                  <Button
                    variant="outline"
                    onClick={() => setRenameDialogOpen(false)}
                  >
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
              trigger={
                <Button
                  variant="outline"
                  size="icon"
                  disabled={isPresetMutating}
                  data-tour="create-sorting-rule"
                >
                  <IconPlus />
                </Button>
              }
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
            <Button
              variant="outline"
              size="icon"
              disabled={!selectedSet || isPresetMutating || sets.length <= 1}
              onClick={() => setDeleteDialogOpen(true)}
            >
              <IconTrash />
            </Button>
            <DeleteDialog
              open={deleteDialogOpen}
              onOpenChange={setDeleteDialogOpen}
              title={t("presetSelector.deleteSetTitle")}
              description={t("presetSelector.deleteSetDescription", {
                name: selectedSet?.name,
              })}
              confirm={{ type: "name", name: selectedSet?.name ?? "" }}
              onConfirm={handleDelete}
            />
          </>
        )}
      </ButtonGroup>

      <AuditDrawer
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        title={t("presetSelector.historyTitle")}
        entries={historyEntries}
        isLoading={historyLoading}
        onRevert={(guid) => revertMutation.mutate(guid)}
        isReverting={revertMutation.isPending}
      />
    </Field>
  );
}
