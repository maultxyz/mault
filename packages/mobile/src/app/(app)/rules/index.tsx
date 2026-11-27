import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { PickerCard } from "@/components/ui/picker-card";
import { Screen } from "@/components/ui/screen";
import { SectionHeader } from "@/components/ui/section-header";
import { SectionSkeleton } from "@/components/ui/section-skeleton";
import { binSetsQueryOptions } from "@/features/devices/api/devices";
import { deleteBinSet } from "@/features/rules/api/bin-sets";
import { presetWorkflowsQueryOptions } from "@/features/rules/api/preset-workflows";
import { useActivePresetWorkflow } from "@/features/rules/api/use-active-preset-workflow";
import { useBinRulesTransfer } from "@/features/rules/api/use-bin-rules-transfer";
import { usePresetPicker } from "@/features/rules/api/use-preset-picker";
import { useRulesData } from "@/features/rules/api/use-rules-data";
import { AlphabetPassCard } from "@/features/rules/components/alphabet-pass-card";
import { PresetStageCard } from "@/features/rules/components/preset-stage-card";
import { BinRow } from "@/features/rules/components/bin-row";
import { binModeSummaries } from "@/features/rules/lib/rules";
import { binSetMode } from "@magic-vault/shared";
import { useActiveOrgId } from "@/hooks/use-org";
import { SPACING } from "@/lib/constants/theme";

export default function RulesScreen() {
  const { t } = useTranslation();
  const data = useRulesData();
  const { collection, sets, activeSet, bins, fieldDefinitions } = data;
  const mode = binSetMode(activeSet);
  const summaries = binModeSummaries(activeSet, mode, bins, t);
  const [pickerOpen, setPickerOpen] = useState(false);
  const picker = usePresetPicker();
  const [menuOpen, setMenuOpen] = useState(false);
  const [workflowPickerOpen, setWorkflowPickerOpen] = useState(false);
  const { workflows } = useActivePresetWorkflow();
  const rulesTransfer = useBinRulesTransfer();
  const queryClient = useQueryClient();
  const orgId = useActiveOrgId();
  const remove = useMutation({
    mutationFn: deleteBinSet,
    onSuccess: (next) => {
      queryClient.setQueryData(binSetsQueryOptions(orgId).queryKey, next);
      void queryClient.invalidateQueries({ queryKey: presetWorkflowsQueryOptions(orgId).queryKey });
    },
  });
  const hasGame = !!collection?.game;
  const openNewPreset = (presetMode: "new" | "copy") =>
    router.push({ pathname: "/preset-description", params: { mode: presetMode, gameGuid: data.gameGuid ?? "" } });
  const menuOptions = [
    { value: "new", label: t("rules.presetMenu.new") },
    ...(activeSet?.isActive ? [{ value: "copy", label: t("rules.presetMenu.duplicate") }] : []),
    ...(activeSet
      ? [
          { value: "rename", label: t("rules.presetMenu.rename") },
          { value: "history", label: t("rules.presetMenu.history") },
        ]
      : []),
    ...(rulesTransfer.canExport
      ? [
          { value: "copyRules", label: t("rules.transferFile.copy") },
          { value: "exportRules", label: t("rules.transferFile.export") },
        ]
      : []),
    { value: "importRules", label: t("rules.transferFile.import") },
    ...(activeSet ? [{ value: "newWorkflow", label: t("rules.stages.newTitle") }] : []),
    ...(workflows.length > 0 ? [{ value: "editWorkflows", label: t("rules.stages.editStages") }] : []),
    ...(activeSet && sets.length > 1 ? [{ value: "delete", label: t("rules.presetMenu.delete") }] : []),
  ];
  const runMenuAction = (action: string) => {
    setMenuOpen(false);
    if (action === "new" || action === "copy") {
      openNewPreset(action);
    } else if (action === "rename" && activeSet) {
      router.push({ pathname: "/preset-description", params: { guid: activeSet.guid } });
    } else if (action === "copyRules") {
      rulesTransfer.copy();
    } else if (action === "exportRules") {
      rulesTransfer.share();
    } else if (action === "importRules") {
      rulesTransfer.importFile();
    } else if (action === "newWorkflow" && activeSet) {
      router.push({
        pathname: "/preset-description",
        params: { mode: "workflow", guid: activeSet.guid, gameGuid: data.gameGuid ?? "" },
      });
    } else if (action === "editWorkflows") {
      setWorkflowPickerOpen(true);
    } else if (action === "history") {
      router.push("/rules/history");
    } else if (action === "delete" && activeSet) {
      Alert.alert(t("rules.presetMenu.delete"), t("rules.presetMenu.deleteDescription", { name: activeSet.name }), [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("rules.presetMenu.deleteConfirm"), style: "destructive", onPress: () => remove.mutate(activeSet.guid) },
      ]);
    }
  };

  const hasLoadFailedWithoutData = data.isError && (!collection || sets.length === 0);

  return (
    <Screen
      onRefresh={data.refetch}
      header={
        <PageHeader
          title={t("rules.title")}
          subtitle={collection?.game?.name ?? collection?.name}
          onBack={() => router.back()}
          actions={
            hasGame ? (
              <IconButton icon="more" accessibilityLabel={t("rules.presetMenu.title")} onPress={() => setMenuOpen(true)} />
            ) : null
          }
        />
      }
    >
      {data.isError && !hasLoadFailedWithoutData ? <Callout tone="destructive" title={t("rules.loadFailed")} /> : null}
      {picker.isError ? <Callout tone="destructive" title={t("rules.activateFailed")} /> : null}
      {remove.isError ? <Callout tone="destructive" title={t("rules.presetMenu.deleteFailed")} /> : null}

      {hasLoadFailedWithoutData ? (
        <QueryErrorState
          title={t("rules.loadFailed")}
          onRetry={() => void data.refetch()}
          isRetrying={data.isRefetching}
        />
      ) : data.isPending ? (
        <>
          <ListSkeleton rows={1} hasSubtitle />
          <ListSkeleton rows={1} hasSubtitle hasTrailing={false} />
          <ListSkeleton rows={1} />
          <SectionSkeleton titleWidth={64}>
            <ListSkeleton rows={4} hasSubtitle hasTrailing={false} />
          </SectionSkeleton>
        </>
      ) : !collection ? (
        <EmptyState
          icon="collections"
          title={t("rules.noCollectionTitle")}
          description={t("rules.noCollectionDescription")}
          action={<Button variant="secondary" label={t("scan.chooseCollection")} onPress={() => router.navigate("/collections")} />}
        />
      ) : !collection.game ? (
        <Callout tone="warning" title={t("rules.noGameTitle")} description={t("rules.noGameDescription")} />
      ) : (
        <>
          {sets.length === 0 ? (
            <Callout
              tone="info"
              title={t("rules.noPresetsTitle")}
              description={t("rules.noPresetsDescription")}
              action={<Button size="sm" variant="secondary" label={t("rules.presetMenu.new")} onPress={() => openNewPreset("new")} />}
            />
          ) : (
            <PickerCard
              icon="rules"
              label={t("rules.presets")}
              value={picker.label}
              placeholder={t("rules.choosePreset")}
              loading={picker.isPending}
              onPress={() => setPickerOpen(true)}
            />
          )}

          {activeSet ? (
            <ListGroup>
              <ListRow
                icon="edit"
                title={t("rules.description.title")}
                subtitle={activeSet.description || t("rules.description.add")}
                subtitleNumberOfLines={0}
                onPress={() => router.push({ pathname: "/preset-description", params: { guid: activeSet.guid } })}
              />
            </ListGroup>
          ) : null}

          {activeSet && !activeSet.isActive ? (
            <Callout tone="info" title={t("rules.noActiveTitle")} description={t("rules.noActiveDescription")} />
          ) : null}
          {activeSet?.isActive ? (
            <ListGroup>
              <ListRow
                icon="adjust"
                title={t("rules.mode.title")}
                value={t(`rules.modes.${mode}.title`)}
                onPress={() => router.push("/rules/mode")}
              />
              <ListRow
                icon="storage"
                title={t("rules.fill.title")}
                subtitle={t("rules.fill.entrySubtitle")}
                onPress={() => router.push("/rules/fill")}
              />
              {mode === "repack" ? (
                <ListRow
                  icon="rules"
                  title={t("rules.repack.title")}
                  subtitle={t("rules.repack.slotCount", { count: activeSet.repackSlots.length })}
                  onPress={() => router.push("/rules/repack")}
                />
              ) : null}
            </ListGroup>
          ) : null}
          {mode === "alphabet" && activeSet?.isActive ? <AlphabetPassCard set={activeSet} bins={bins} /> : null}
          {activeSet?.isActive ? <PresetStageCard /> : null}

          {activeSet ? (
            <View style={{ gap: SPACING.sm }}>
              <SectionHeader title={t("rules.bins")} />
              <ListGroup>
                {bins.map((bin) => (
                  <BinRow
                    key={bin.binNumber}
                    bin={bin}
                    bins={bins}
                    fieldDefinitions={fieldDefinitions}
                    summary={summaries.get(bin.binNumber)}
                    onPress={() =>
                      router.push({ pathname: "/rules/[binNumber]", params: { binNumber: String(bin.binNumber) } })
                    }
                  />
                ))}
              </ListGroup>
            </View>
          ) : null}
        </>
      )}
      <OptionSheet
        visible={menuOpen}
        title={t("rules.presetMenu.title")}
        options={menuOptions}
        selected={[]}
        onSelect={runMenuAction}
        onClose={() => setMenuOpen(false)}
      />
      <OptionSheet
        visible={workflowPickerOpen}
        title={t("rules.stages.editStages")}
        options={workflows.map((workflow) => ({ value: workflow.guid, label: workflow.name }))}
        selected={[]}
        onSelect={(workflowGuid) => {
          setWorkflowPickerOpen(false);
          router.push({ pathname: "/rules/stages", params: { workflow: workflowGuid } });
        }}
        onClose={() => setWorkflowPickerOpen(false)}
      />
      <OptionSheet
        visible={pickerOpen}
        title={t("rules.presets")}
        options={picker.options}
        selected={picker.selected}
        onSelect={(value) => {
          setPickerOpen(false);
          picker.choose(value);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </Screen>
  );
}
