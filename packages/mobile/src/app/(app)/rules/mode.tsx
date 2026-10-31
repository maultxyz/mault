import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useNavigation, usePreventRemove } from "expo-router";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { CHAOS_BIN_SIZE_MAX, getCatchAllBin, SCAN_ONLY_DEFAULT_BIN } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Callout } from "@/components/ui/callout";
import { Input } from "@/components/ui/input";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { SaveBar } from "@/components/ui/save-bar";
import { SectionHeader } from "@/components/ui/section-header";
import { SwitchRow } from "@/components/ui/switch-row";
import { binSetsQueryOptions } from "@/features/devices/api/devices";
import { billingQueryOptions } from "@/features/org/api/billing";
import { resetAutoAssign } from "@/features/rules/api/bin-sets";
import { useRulesData } from "@/features/rules/api/use-rules-data";
import { applyMode } from "@/features/rules/lib/apply-mode";
import { modeSchema } from "@/features/rules/lib/mode-schema";
import { binSetMode } from "@magic-vault/shared";
import { useActiveOrgId } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { upgradeRequiredMessage } from "@/lib/api/upgrade-required-error";
import { SORTING_MODES } from "@/lib/constants/rules";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { ModeFormValues } from "@/lib/interfaces/forms";
import type { ModePicker } from "@/lib/interfaces/rules";

export default function SortingModeScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const orgId = useActiveOrgId();
  const { activeSet, bins, fieldDefinitions, gameGuid } = useRulesData();
  const { data: billing } = useQuery(billingQueryOptions(orgId));
  const [picker, setPicker] = useState<ModePicker | null>(null);
  const catchAll = getCatchAllBin(bins)?.binNumber;

  const serverValues = useMemo<ModeFormValues | undefined>(
    () =>
      activeSet
        ? {
            mode: binSetMode(activeSet),
            autoAssignField: activeSet.autoAssignField ?? null,
            scanOnlyMatchedBin: activeSet.scanOnlyBin ?? catchAll ?? SCAN_ONLY_DEFAULT_BIN,
            scanOnlyUnmatchedBin: catchAll ?? SCAN_ONLY_DEFAULT_BIN,
            chaosBinSize: activeSet.chaosBinSize != null ? String(activeSet.chaosBinSize) : "",
            skipSaving: !!activeSet.skipSaving,
          }
        : undefined,
    [activeSet, catchAll],
  );
  const form = useForm<ModeFormValues>({
    resolver: zodResolver(modeSchema),
    values: serverValues,
    resetOptions: { keepDirtyValues: true },
  });
  const { isDirty } = form.formState;
  const mode = form.watch("mode");
  const autoAssignField = form.watch("autoAssignField");
  const savedMode = binSetMode(activeSet);
  const eligibleFields = fieldDefinitions.filter((f) => f.type !== "numeric");
  const chaosLocked = billing?.chaosSort === false && !activeSet?.isChaosMode;
  const repackLocked = billing?.repacks === false && !activeSet?.isRepackMode;
  const editable = !!activeSet?.isActive;

  const save = useMutation({
    mutationFn: (values: ModeFormValues) =>
      activeSet && serverValues
        ? applyMode(activeSet, bins, gameGuid, serverValues, values)
        : Promise.resolve(null),
    onSuccess: async (next, values) => {
      if (next) queryClient.setQueryData(binSetsQueryOptions(orgId).queryKey, next);
      form.reset(values);
      await queryClient.invalidateQueries({ queryKey: ["bin-sets"] });
    },
  });
  const reset = useMutation({
    mutationFn: () => (activeSet ? resetAutoAssign(activeSet.guid) : Promise.resolve(null)),
    onSuccess: (next) => {
      if (next) queryClient.setQueryData(binSetsQueryOptions(orgId).queryKey, next);
    },
  });

  usePreventRemove(isDirty && !save.isPending, ({ data }) => {
    Alert.alert(t("common.discardTitle"), t("common.discardDescription"), [
      { text: t("common.keepEditing"), style: "cancel" },
      { text: t("common.discard"), style: "destructive", onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  const binOptions = bins.map((bin) => ({ value: String(bin.binNumber), label: t("rules.bin", { number: bin.binNumber }) }));
  const fieldLabel = (field: string | null) => eligibleFields.find((f) => f.field === field)?.label ?? null;

  const confirmReset = () =>
    Alert.alert(t("rules.mode.resetTitle"), t("rules.mode.resetDescription"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("rules.mode.reset"), style: "destructive", onPress: () => reset.mutate() },
    ]);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <PageHeader title={t("rules.mode.title")} subtitle={activeSet?.name} onBack={() => router.back()} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: SCREEN_GUTTER, paddingBottom: SPACING.xxl * 2, gap: SPACING.xl }}
      >
        {!editable ? <Callout tone="info" title={t("rules.noActiveTitle")} description={t("rules.noActiveDescription")} /> : null}
        {save.isError ? <Callout tone="destructive" title={t("rules.mode.saveFailed")} description={upgradeRequiredMessage(save.error)} /> : null}
        {reset.isError ? <Callout tone="destructive" title={t("rules.mode.resetFailed")} /> : null}

        <Controller
          control={form.control}
          name="mode"
          render={({ field }) => (
            <ListGroup>
              {SORTING_MODES.map((option) => {
                const locked = (option === "chaos" && chaosLocked) || (option === "repack" && repackLocked);
                return (
                  <ListRow
                    key={option}
                    title={t(`rules.modes.${option}.title`)}
                    subtitle={locked ? t("rules.mode.featureLocked") : t(`rules.modes.${option}.description`)}
                    selected={field.value === option}
                    subtitleNumberOfLines={0}
                    disabled={!editable || locked}
                    onPress={() => {
                      field.onChange(option);
                      if (option === "auto-assign" && !autoAssignField && eligibleFields[0]) {
                        form.setValue("autoAssignField", eligibleFields[0].field, { shouldDirty: true });
                      }
                    }}
                  />
                );
              })}
            </ListGroup>
          )}
        />

        {mode === "scan-only" ? (
          <View style={{ gap: SPACING.sm }}>
            <SectionHeader title={t("rules.modes.scan-only.title")} />
            <ListGroup>
              <ListRow
                title={t("rules.mode.matchedBin")}
                subtitle={t("rules.mode.matchedBinDescription")}
                value={t("rules.bin", { number: form.watch("scanOnlyMatchedBin") })}
                disabled={!editable}
                onPress={() => setPicker("matched")}
              />
              <ListRow
                title={t("rules.mode.unmatchedBin")}
                subtitle={t("rules.mode.unmatchedBinDescription")}
                value={t("rules.bin", { number: form.watch("scanOnlyUnmatchedBin") })}
                disabled={!editable}
                onPress={() => setPicker("unmatched")}
              />
            </ListGroup>
          </View>
        ) : null}

        {mode === "auto-assign" ? (
          <View style={{ gap: SPACING.sm }}>
            <SectionHeader title={t("rules.modes.auto-assign.title")} />
            <ListGroup>
              <ListRow
                title={t("rules.mode.autoAssignField")}
                value={fieldLabel(autoAssignField) ?? t("rules.chooseField")}
                disabled={!editable || eligibleFields.length === 0}
                onPress={() => setPicker("field")}
              />
              {savedMode === "auto-assign" ? (
                <ListRow
                  icon="refresh"
                  tone="destructive"
                  title={t("rules.mode.reset")}
                  subtitle={t("rules.mode.resetHint")}
                  disabled={!editable || reset.isPending}
                  onPress={confirmReset}
                />
              ) : null}
            </ListGroup>
          </View>
        ) : null}

        {mode === "chaos" ? (
          <View style={{ gap: SPACING.sm }}>
            <SectionHeader title={t("rules.modes.chaos.title")} />
            <Controller
              control={form.control}
              name="chaosBinSize"
              render={({ field }) => (
                <ListGroup>
                  <ListRow
                    title={t("rules.mode.chaosBinSize")}
                    subtitle={t("rules.mode.chaosBinSizeDescription")}
                    right={
                      <Input
                        compact
                        accessibilityLabel={t("rules.mode.chaosBinSize")}
                        keyboardType="number-pad"
                        placeholder={t("rules.mode.chaosBinSizePlaceholder")}
                        editable={editable}
                        value={field.value}
                        onChangeText={(text) => {
                          const digits = text.replace(/\D/g, "");
                          field.onChange(digits === "" ? "" : String(Math.min(Math.max(Number(digits), 1), CHAOS_BIN_SIZE_MAX)));
                        }}
                      />
                    }
                  />
                </ListGroup>
              )}
            />
          </View>
        ) : null}

        {mode === "repack" ? (
          savedMode === "repack" ? (
            <ListGroup>
              <ListRow
                icon="rules"
                title={t("rules.repack.title")}
                subtitle={t("rules.repack.slotCount", { count: activeSet?.repackSlots.length ?? 0 })}
                onPress={() => router.push("/rules/repack")}
              />
            </ListGroup>
          ) : (
            <Callout tone="info" title={t("rules.mode.repackSaveFirst")} />
          )
        ) : null}

        {mode === "alphabet" ? <AppText size="sm" tone="secondary">{t("rules.mode.alphabetHint")}</AppText> : null}

        <Controller
          control={form.control}
          name="skipSaving"
          render={({ field }) => (
            <SwitchRow
              title={t("rules.mode.skipSaving")}
              description={t("rules.mode.skipSavingDescription")}
              value={field.value}
              disabled={!editable}
              onValueChange={field.onChange}
            />
          )}
        />
      </ScrollView>
      <OptionSheet
        visible={picker === "matched" || picker === "unmatched"}
        title={picker === "unmatched" ? t("rules.mode.unmatchedBin") : t("rules.mode.matchedBin")}
        options={binOptions}
        selected={[String(form.watch(picker === "unmatched" ? "scanOnlyUnmatchedBin" : "scanOnlyMatchedBin"))]}
        onSelect={(value) => {
          form.setValue(picker === "unmatched" ? "scanOnlyUnmatchedBin" : "scanOnlyMatchedBin", Number(value), {
            shouldDirty: true,
          });
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
      />
      <OptionSheet
        visible={picker === "field"}
        title={t("rules.mode.autoAssignField")}
        options={eligibleFields.map((f) => ({ value: f.field, label: f.label }))}
        selected={autoAssignField ? [autoAssignField] : []}
        onSelect={(value) => {
          form.setValue("autoAssignField", value, { shouldDirty: true });
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
      />
      <SaveBar
        visible={isDirty && editable}
        saving={save.isPending}
        onSave={form.handleSubmit((values) => save.mutate(values))}
        onDiscard={() => form.reset()}
      />
    </KeyboardAvoidingView>
  );
}
