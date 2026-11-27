import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams, useNavigation, usePreventRemove } from "expo-router";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Input } from "@/components/ui/input";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { SaveBar } from "@/components/ui/save-bar";
import { SectionHeader } from "@/components/ui/section-header";
import { SectionSkeleton } from "@/components/ui/section-skeleton";
import { translateFormErrorMessage } from "@/lib/form-validation";
import { SwitchRow } from "@/components/ui/switch-row";
import { SwitchRowSkeleton } from "@/components/ui/switch-row-skeleton";
import { resetBinPickList, saveBinConfig } from "@/features/rules/api/bin-sets";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TextField } from "@/components/ui/text-field";
import { useRulesData } from "@/features/rules/api/use-rules-data";
import { RuleGroupEditor } from "@/features/rules/components/rule-group-editor";
import { RuleGroupSkeleton } from "@/features/rules/components/rule-group-skeleton";
import { binSchema } from "@/features/rules/lib/bin-schema";
import { emptyRules, modeLocksBinRules, overflowSourcesFor, overflowTargetsFor } from "@/features/rules/lib/rules";
import {
  binSetMode,
  formatDecklist,
  getPickListTotals,
  parseDecklist,
  PICK_LIST_MAX_ENTRIES,
  REPACK_UNIQUE_BY_NAME,
  REPACK_UNIQUE_BY_PRINTING,
  type BinConfig,
} from "@magic-vault/shared";
import { BinNumberSettingRow } from "@/features/rules/components/bin-number-setting-row";
import { ALLOW_DUPLICATES_OPTION, DEFAULT_MAX_COPIES } from "@/lib/constants/rules";
import { binSaveInputWithRules } from "@/features/rules/lib/bin-rule-transfer";
import { useTheme } from "@/hooks/use-theme";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { BinFormValues } from "@/lib/interfaces/forms";

export default function BinEditorScreen() {
  const { binNumber: binParam } = useLocalSearchParams<{ binNumber: string }>();
  const binNumber = Number(binParam);
  const { t } = useTranslation();
  const colors = useTheme();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const {
    gameGuid,
    activeSet,
    bins,
    fieldDefinitions,
    freeformOptions,
    isPending: isRulesDataPending,
    isError: isRulesDataError,
    refetch: refetchRulesData,
    isRefetching: isRefetchingRulesData,
  } = useRulesData();
  const bin = bins.find((b) => b.binNumber === binNumber);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [copiesOpen, setCopiesOpen] = useState(false);
  const [catchAllError, setCatchAllError] = useState(false);

  const serverValues = useMemo<BinFormValues | undefined>(
    () =>
      bin
        ? {
            rules: bin.rules ?? emptyRules(),
            isCatchAll: !!bin.isCatchAll,
            isDisabled: !!bin.isDisabled,
            overflowBin: bin.overflowBin ?? null,
            maxCards: bin.maxCards ?? null,
            isOverride: !!bin.isOverride,
            overridePriority: bin.overridePriority ?? null,
            lowMatchPercent: bin.isCatchAll ? (bin.lowMatchPercent ?? null) : null,
            maxCopies: bin.maxCopies ?? null,
            maxCopiesBy: bin.maxCopiesBy ?? REPACK_UNIQUE_BY_PRINTING,
            pickList:
              bin.pickList && !bin.isCatchAll
                ? { mode: bin.pickList.mode, decklist: formatDecklist(bin.pickList.entries) }
                : null,
          }
        : undefined,
    [bin],
  );
  const form = useForm<BinFormValues>({
    resolver: zodResolver(binSchema),
    values: serverValues,
    resetOptions: { keepDirtyValues: true },
  });
  const { isDirty } = form.formState;
  const isCatchAll = form.watch("isCatchAll");
  const overflowBin = form.watch("overflowBin");
  const isDisabled = form.watch("isDisabled");
  const isOverride = form.watch("isOverride");
  const maxCopies = form.watch("maxCopies");
  const maxCopiesBy = form.watch("maxCopiesBy");
  const draftRules = form.watch("rules");
  const { errors } = form.formState;
  const maxCardsError =
    errors.maxCards?.message ??
    errors.overridePriority?.message ??
    errors.lowMatchPercent?.message ??
    errors.maxCopies?.message;

  const editableSet = !!activeSet?.isActive;
  const sources = overflowSourcesFor(binNumber, bins);
  const targets = overflowTargetsFor(binNumber, bins);
  const draftPickList = form.watch("pickList");
  const pickList = !isCatchAll && draftPickList != null;
  const mode = binSetMode(activeSet);
  const isScanOnly = mode === "scan-only";
  const modeLocksRules = modeLocksBinRules(mode);
  const readOnly = !editableSet || isScanOnly;
  const rulesLocked = readOnly || sources.length > 0 || modeLocksRules;
  const otherCatchAll = bins.some((b) => b.binNumber !== binNumber && b.isCatchAll);
  const isClaimedOverflow = !isCatchAll && sources.length > 0;
  const isAutoAssign = mode === "auto-assign";
  const canOverride = !isCatchAll && !isClaimedOverflow && !modeLocksRules && !isScanOnly && !pickList;
  const canUsePickList = !isCatchAll && !isClaimedOverflow && !modeLocksRules && !isScanOnly;
  const savedPickListTotals = bin?.pickList ? getPickListTotals(bin.pickList) : null;
  const showsPriority =
    !isAutoAssign &&
    !modeLocksRules &&
    !isScanOnly &&
    ((isCatchAll && (draftRules?.conditions.length ?? 0) > 0) || (canOverride && isOverride));
  const showsCopies = !isCatchAll && !isAutoAssign && !modeLocksRules && !isScanOnly && !pickList;
  const copiesSelection = maxCopies == null ? ALLOW_DUPLICATES_OPTION : maxCopiesBy;
  const copiesOptions = [
    { value: ALLOW_DUPLICATES_OPTION, label: t("rules.advanced.copiesAllow") },
    { value: REPACK_UNIQUE_BY_PRINTING, label: t("rules.advanced.copiesByPrinting") },
    { value: REPACK_UNIQUE_BY_NAME, label: t("rules.advanced.copiesByName") },
    ...fieldDefinitions
      .filter((field) => field.field !== "name")
      .map((field) => ({ value: field.field, label: t("rules.advanced.copiesByField", { field: field.label }) })),
  ];
  const copiesLabel =
    copiesOptions.find((option) => option.value === copiesSelection)?.label ??
    t("rules.advanced.copiesByField", { field: copiesSelection });

  const resetPickList = useMutation({
    mutationFn: () => resetBinPickList(bin?.guid ?? ""),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["bin-sets"] }),
  });
  const save = useMutation({
    mutationFn: (values: BinFormValues) =>
      values.pickList && !values.isCatchAll && canUsePickList
        ? saveBinConfig({
            binNumber,
            gameGuid,
            rules: emptyRules(),
            isCatchAll: false,
            isDisabled: values.isDisabled,
            overflowBin: null,
            isOverride: false,
            overridePriority: null,
            lowMatchPercent: null,
            maxCopies: null,
            maxCopiesBy: null,
            maxCards: values.maxCards,
            pickList: { mode: values.pickList.mode, entries: parseDecklist(values.pickList.decklist) },
          })
        : saveBinConfig({
        binNumber,
        gameGuid,
        rules: values.rules,
        isCatchAll: values.isCatchAll,
        isDisabled: values.isCatchAll ? false : values.isDisabled,
        overflowBin: values.isCatchAll ? null : values.overflowBin,
        isOverride: canOverride ? values.isOverride : !values.isCatchAll && !!bin?.isOverride,
        overridePriority: showsPriority
          ? values.overridePriority
          : values.isCatchAll || canOverride
            ? null
            : (bin?.overridePriority ?? null),
        lowMatchPercent: values.isCatchAll ? values.lowMatchPercent : null,
        maxCopies: showsCopies ? values.maxCopies : values.isCatchAll || isAutoAssign ? null : (bin?.maxCopies ?? null),
        maxCopiesBy: showsCopies
          ? values.maxCopies != null
            ? values.maxCopiesBy
            : null
          : values.isCatchAll || isAutoAssign
            ? null
            : (bin?.maxCopiesBy ?? null),
        maxCards: values.maxCards,
        pickList: null,
      }),
    onSuccess: async (_, values) => {
      form.reset(values);
      await queryClient.invalidateQueries({ queryKey: ["bin-sets"] });
    },
  });

  const transfer = useMutation({
    mutationFn: async ({ target, move }: { target: BinConfig; move: boolean }) => {
      if (!bin) return;
      await saveBinConfig(binSaveInputWithRules(target, bin.rules, gameGuid));
      if (move) await saveBinConfig(binSaveInputWithRules(bin, emptyRules(), gameGuid));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["bin-sets"] }),
  });
  const canTransferRules = !!bin && !rulesLocked && mode !== "auto-assign" && bin.rules.conditions.length > 0;
  const binName = (target: BinConfig) =>
    target.isCatchAll
      ? t("rules.transfer.catchAllBin", { number: target.binNumber })
      : t("rules.bin", { number: target.binNumber });
  const chooseTransferTarget = (value: string) => {
    setTransferOpen(false);
    const target = bins.find((candidate) => candidate.binNumber === Number(value));
    if (!target) return;
    const hasRules = target.rules.conditions.length > 0 || !!target.pickList;
    Alert.alert(
      t("rules.transfer.confirmTitle", { bin: binName(target) }),
      hasRules ? t("rules.transfer.replaceWarning", { bin: binName(target) }) : t("rules.transfer.confirmDescription"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("rules.transfer.copy"), onPress: () => transfer.mutate({ target, move: false }) },
        { text: t("rules.transfer.move"), onPress: () => transfer.mutate({ target, move: true }) },
      ],
    );
  };

  usePreventRemove(isDirty && !save.isPending, ({ data }) => {
    Alert.alert(t("common.discardTitle"), t("common.discardDescription"), [
      { text: t("common.keepEditing"), style: "cancel" },
      { text: t("common.discard"), style: "destructive", onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  const overflowOptions = [
    { value: "", label: t("rules.overflowNone") },
    ...targets.map((n) => ({ value: String(n), label: t("rules.bin", { number: n }) })),
  ];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <PageHeader
        title={t("rules.bin", { number: binNumber })}
        subtitle={activeSet?.name}
        onBack={() => router.back()}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: SCREEN_GUTTER, paddingBottom: SPACING.xxl * 2, gap: SPACING.lg + SPACING.xs }}
      >
        {isRulesDataError && !activeSet ? (
          <QueryErrorState
            title={t("rules.loadFailed")}
            onRetry={() => void refetchRulesData()}
            isRetrying={isRefetchingRulesData}
          />
        ) : isRulesDataPending ? (
          <>
            <SwitchRowSkeleton hasDescription />
            <SectionSkeleton hasDescription>
              <RuleGroupSkeleton rows={2} />
            </SectionSkeleton>
            <SectionSkeleton>
              <SwitchRowSkeleton hasDescription />
              <ListSkeleton rows={2} leading="none" />
            </SectionSkeleton>
          </>
        ) : (
          <>
            {activeSet && !activeSet.isActive ? (
              <Callout tone="info" title={t("rules.noActiveTitle")} description={t("rules.noActiveDescription")} />
            ) : null}
            {save.isError || transfer.isError || resetPickList.isError ? (
              <Callout tone="destructive" title={t("rules.saveFailed")} />
            ) : null}

            {isScanOnly ? <Callout tone="info" title={t("rules.scanOnlyLocked")} /> : null}

            <View style={{ gap: SPACING.sm }}>
              {catchAllError ? <Callout tone="warning" title={t("rules.needCatchAll")} /> : null}
              <Controller
                control={form.control}
                name="isCatchAll"
                render={({ field }) => (
                  <SwitchRow
                    title={t("rules.catchAllLabel")}
                    description={t("rules.catchAllDescription")}
                    value={field.value}
                    disabled={readOnly}
                    onValueChange={(next) => {
                      if (!next && !otherCatchAll) {
                        setCatchAllError(true);
                        return;
                      }
                      setCatchAllError(false);
                      field.onChange(next);
                    }}
                  />
                )}
              />
            </View>

            {canUsePickList ? (
              <View style={{ gap: SPACING.sm }}>
                <SectionHeader title={t("rules.pickListBin.sourceLabel")} />
                <SegmentedControl
                  options={[
                    { value: "rules", label: t("rules.pickListBin.sourceRules") },
                    { value: "pickList", label: t("rules.pickListBin.sourcePickList") },
                  ]}
                  value={pickList ? "pickList" : "rules"}
                  onChange={(source) =>
                    form.setValue(
                      "pickList",
                      source === "pickList" ? (serverValues?.pickList ?? { mode: "until_found", decklist: "" }) : null,
                      { shouldDirty: true },
                    )
                  }
                />
                <AppText size="xs" tone="secondary">
                  {pickList ? t("rules.pickListBin.sourcePickListDescription") : t("rules.pickListBin.sourceRulesDescription")}
                </AppText>
              </View>
            ) : null}

            {pickList && draftPickList ? (
              <View style={{ gap: SPACING.md }}>
                <SectionHeader title={t("rules.pickListBin.modeLabel")} />
                <SegmentedControl
                  options={[
                    { value: "until_found", label: t("rules.pickListBin.modeUntilFound") },
                    { value: "all", label: t("rules.pickListBin.modeAll") },
                  ]}
                  value={draftPickList.mode}
                  onChange={(nextMode) =>
                    form.setValue("pickList", { ...draftPickList, mode: nextMode }, { shouldDirty: true })
                  }
                />
                <AppText size="xs" tone="secondary">
                  {draftPickList.mode === "all"
                    ? t("rules.pickListBin.modeAllDescription")
                    : t("rules.pickListBin.modeUntilFoundDescription")}
                </AppText>
                <TextField
                  label={t("rules.pickListBin.cardsLabel")}
                  placeholder={t("rules.pickListBin.cardsPlaceholder")}
                  value={draftPickList.decklist}
                  onChangeText={(decklist) =>
                    form.setValue("pickList", { ...draftPickList, decklist }, { shouldDirty: true, shouldValidate: true })
                  }
                  multiline
                  error={translateFormErrorMessage(t, errors.pickList?.decklist?.message)}
                />
                <AppText size="xs" tone="secondary">
                  {t("rules.pickListBin.cardCount", {
                    count: parseDecklist(draftPickList.decklist).length,
                    max: PICK_LIST_MAX_ENTRIES,
                  })}
                  {" "}
                  {t("rules.pickListBin.cardsHint")}
                </AppText>
                {savedPickListTotals && bin?.pickList ? (
                  <ListGroup>
                    <ListRow
                      title={t("rules.pickListBin.progress")}
                      value={
                        bin.pickList.mode === "all"
                          ? t("rules.pickListBin.foundAll", { count: savedPickListTotals.found })
                          : t("rules.pickListBin.foundOf", {
                              found: savedPickListTotals.found,
                              total: savedPickListTotals.wanted,
                            })
                      }
                    />
                    <ListRow
                      icon="refresh"
                      title={t("rules.pickListBin.reset")}
                      disabled={resetPickList.isPending || savedPickListTotals.found === 0 || isDirty}
                      onPress={() => resetPickList.mutate()}
                    />
                  </ListGroup>
                ) : null}
              </View>
            ) : null}

            {!isScanOnly && !pickList ? (
              <View style={{ gap: SPACING.md }}>
                <View style={{ gap: 2 }}>
                  <SectionHeader
                    title={isCatchAll ? t("rules.overrideLabel") : t("rules.rulesLabel")}
                    action={
                      canTransferRules ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          label={t("rules.transfer.button")}
                          disabled={isDirty || transfer.isPending}
                          onPress={() => setTransferOpen(true)}
                        />
                      ) : null
                    }
                  />
                  <AppText size="xs" tone="secondary">
                    {isCatchAll ? t("rules.overrideDescription") : t("rules.rulesDescription")}
                  </AppText>
                </View>
                {sources.length > 0 ? (
                  <Callout
                    tone="info"
                    title={t("rules.overflowTargetNotice", { count: sources.length, bins: sources.join(", ") })}
                  />
                ) : null}
                {mode === "auto-assign" ? <Callout tone="info" title={t("rules.autoAssignLocked")} /> : null}
                {modeLocksRules && mode !== "auto-assign" ? (
                  <Callout tone="info" title={t("rules.modeLocked", { mode: t(`rules.modes.${mode}.title`) })} />
                ) : (
                  <Controller
                    control={form.control}
                    name="rules"
                    render={({ field }) =>
                      field.value ? (
                        <RuleGroupEditor
                          group={field.value}
                          onChange={field.onChange}
                          fieldDefinitions={fieldDefinitions}
                          freeformOptions={freeformOptions}
                          disabled={rulesLocked}
                        />
                      ) : (
                        <View />
                      )
                    }
                  />
                )}
              </View>
            ) : null}

            <View style={{ gap: SPACING.sm }}>
              <SectionHeader title={t("rules.settingsTitle")} />
              {!isCatchAll ? (
                <Controller
                  control={form.control}
                  name="isDisabled"
                  render={({ field }) => (
                    <SwitchRow
                      title={t("rules.disabledLabel")}
                      description={t("rules.disabledDescription")}
                      value={field.value}
                      disabled={readOnly}
                      onValueChange={field.onChange}
                    />
                  )}
                />
              ) : null}
              {canOverride ? (
                <Controller
                  control={form.control}
                  name="isOverride"
                  render={({ field }) => (
                    <SwitchRow
                      title={t("rules.advanced.overrideLabel")}
                      description={t("rules.advanced.overrideDescription")}
                      value={field.value}
                      disabled={readOnly}
                      onValueChange={field.onChange}
                    />
                  )}
                />
              ) : null}
              <ListGroup>
                {showsPriority ? (
                  <Controller
                    control={form.control}
                    name="overridePriority"
                    render={({ field }) => (
                      <BinNumberSettingRow
                        title={t("rules.advanced.priorityLabel")}
                        description={t("rules.advanced.priorityDescription")}
                        placeholder={t("rules.advanced.priorityPlaceholder")}
                        value={field.value}
                        disabled={readOnly}
                        onChange={field.onChange}
                      />
                    )}
                  />
                ) : null}
                {isCatchAll ? (
                  <Controller
                    control={form.control}
                    name="lowMatchPercent"
                    render={({ field }) => (
                      <BinNumberSettingRow
                        title={t("rules.advanced.lowMatchLabel")}
                        description={t("rules.advanced.lowMatchDescription")}
                        placeholder={t("rules.advanced.lowMatchPlaceholder")}
                        value={field.value}
                        disabled={readOnly}
                        onChange={field.onChange}
                      />
                    )}
                  />
                ) : null}
                {showsCopies ? (
                  <ListRow
                    title={t("rules.advanced.copiesLabel")}
                    subtitle={t("rules.advanced.maxCopiesDescription")}
                    subtitleNumberOfLines={0}
                    value={copiesLabel}
                    disabled={readOnly}
                    onPress={() => setCopiesOpen(true)}
                  />
                ) : null}
                {showsCopies && maxCopies != null ? (
                  <Controller
                    control={form.control}
                    name="maxCopies"
                    render={({ field }) => (
                      <BinNumberSettingRow
                        title={t("rules.advanced.maxCopiesCountLabel")}
                        value={field.value}
                        disabled={readOnly}
                        onChange={(next) => field.onChange(next ?? DEFAULT_MAX_COPIES)}
                      />
                    )}
                  />
                ) : null}
                {!isCatchAll && !modeLocksRules && !isScanOnly && !pickList ? (
                  <ListRow
                    title={t("rules.overflowLabel")}
                    subtitle={targets.length === 0 && overflowBin == null ? t("rules.overflowNoOptions") : undefined}
                    value={overflowBin != null ? t("rules.bin", { number: overflowBin }) : t("rules.overflowNone")}
                    disabled={readOnly || (targets.length === 0 && overflowBin == null)}
                    onPress={() => setOverflowOpen(true)}
                  />
                ) : null}
                {isCatchAll || !isDisabled ? (
                  <Controller
                    control={form.control}
                    name="maxCards"
                    render={({ field }) => (
                      <ListRow
                        title={t("rules.maxCardsLabel")}
                        subtitle={t("rules.maxCardsDescription")}
                        subtitleNumberOfLines={0}
                        rightIsInteractive
                        right={
                          <Input
                            compact
                            accessibilityLabel={t("rules.maxCardsLabel")}
                            keyboardType="number-pad"
                            placeholder={t("rules.maxCardsPlaceholder")}
                            editable={!readOnly}
                            value={field.value == null ? "" : String(field.value)}
                            onChangeText={(text) => {
                              const digits = text.replace(/\D/g, "");
                              field.onChange(digits === "" ? null : Number(digits));
                            }}
                          />
                        }
                      />
                    )}
                  />
                ) : null}
              </ListGroup>
              {maxCardsError ? (
                <AppText size="xs" accessibilityRole="alert" style={{ color: colors.destructiveForeground }}>
                  {translateFormErrorMessage(t, maxCardsError)}
                </AppText>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
      <OptionSheet
        visible={overflowOpen}
        title={t("rules.overflowLabel")}
        options={overflowOptions}
        selected={[overflowBin != null ? String(overflowBin) : ""]}
        onSelect={(value) => {
          form.setValue("overflowBin", value === "" ? null : Number(value), { shouldDirty: true });
          setOverflowOpen(false);
        }}
        onClose={() => setOverflowOpen(false)}
      />
      <OptionSheet
        visible={copiesOpen}
        title={t("rules.advanced.copiesLabel")}
        options={copiesOptions}
        selected={[copiesSelection]}
        onSelect={(value) => {
          setCopiesOpen(false);
          if (value === ALLOW_DUPLICATES_OPTION) {
            form.setValue("maxCopies", null, { shouldDirty: true });
            return;
          }
          form.setValue("maxCopiesBy", value, { shouldDirty: true });
          if (maxCopies == null) form.setValue("maxCopies", DEFAULT_MAX_COPIES, { shouldDirty: true });
        }}
        onClose={() => setCopiesOpen(false)}
      />
      <OptionSheet
        visible={transferOpen}
        title={t("rules.transfer.title")}
        options={bins
          .filter((target) => target.binNumber !== binNumber)
          .map((target) => ({ value: String(target.binNumber), label: binName(target) }))}
        selected={[]}
        onSelect={chooseTransferTarget}
        onClose={() => setTransferOpen(false)}
      />
      <SaveBar
        visible={isDirty && !readOnly}
        saving={save.isPending}
        onSave={form.handleSubmit((values) => save.mutate(values))}
        onDiscard={() => {
          setCatchAllError(false);
          form.reset();
        }}
      />
    </KeyboardAvoidingView>
  );
}
