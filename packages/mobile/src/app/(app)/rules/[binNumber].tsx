import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams, useNavigation, usePreventRemove } from "expo-router";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Switch, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Callout } from "@/components/ui/callout";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { SaveBar } from "@/components/ui/save-bar";
import { SectionHeader } from "@/components/ui/section-header";
import { saveBinConfig } from "@/features/rules/api/bin-sets";
import { useRulesData } from "@/features/rules/api/use-rules-data";
import { RuleGroupEditor } from "@/features/rules/components/rule-group-editor";
import { binSchema } from "@/features/rules/lib/bin-schema";
import { emptyRules, modeLocksBinRules, overflowSourcesFor, overflowTargetsFor } from "@/features/rules/lib/rules";
import { binSetMode } from "@magic-vault/shared";
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
  const { gameGuid, activeSet, bins, fieldDefinitions, freeformOptions } = useRulesData();
  const bin = bins.find((b) => b.binNumber === binNumber);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [catchAllError, setCatchAllError] = useState(false);

  const serverValues = useMemo<BinFormValues | undefined>(
    () =>
      bin
        ? {
            rules: bin.rules ?? emptyRules(),
            isCatchAll: !!bin.isCatchAll,
            isDisabled: !!bin.isDisabled,
            overflowBin: bin.overflowBin ?? null,
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

  const editableSet = !!activeSet?.isActive;
  const sources = overflowSourcesFor(binNumber, bins);
  const targets = overflowTargetsFor(binNumber, bins);
  const pickList = !!bin?.pickList;
  const mode = binSetMode(activeSet);
  const isScanOnly = mode === "scan-only";
  const modeLocksRules = modeLocksBinRules(mode);
  const readOnly = !editableSet || pickList || isScanOnly;
  const rulesLocked = readOnly || sources.length > 0 || modeLocksRules;
  const otherCatchAll = bins.some((b) => b.binNumber !== binNumber && b.isCatchAll);

  const save = useMutation({
    mutationFn: (values: BinFormValues) =>
      saveBinConfig({
        binNumber,
        gameGuid,
        rules: values.rules,
        isCatchAll: values.isCatchAll,
        isDisabled: values.isCatchAll ? false : values.isDisabled,
        overflowBin: values.isCatchAll ? null : values.overflowBin,
        isOverride: bin?.isOverride,
        overridePriority: bin?.overridePriority,
        lowMatchPercent: bin?.lowMatchPercent,
        maxCopies: bin?.maxCopies,
        maxCopiesBy: bin?.maxCopiesBy,
      }),
    onSuccess: async (_, values) => {
      form.reset(values);
      await queryClient.invalidateQueries({ queryKey: ["bin-sets"] });
    },
  });

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
        contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: SCREEN_GUTTER, paddingBottom: SPACING.xxl * 2, gap: SPACING.xl }}
      >
        {activeSet && !activeSet.isActive ? (
          <Callout tone="info" title={t("rules.noActiveTitle")} description={t("rules.noActiveDescription")} />
        ) : null}
        {pickList ? <Callout tone="info" title={t("rules.pickListNotice")} /> : null}
        {save.isError ? <Callout tone="destructive" title={t("rules.saveFailed")} /> : null}

        {isScanOnly ? <Callout tone="info" title={t("rules.scanOnlyLocked")} /> : null}

        <View style={{ gap: SPACING.sm }}>
          {catchAllError ? <Callout tone="warning" title={t("rules.needCatchAll")} /> : null}
          <ListGroup>
            <Controller
              control={form.control}
              name="isCatchAll"
              render={({ field }) => (
                <ListRow
                  title={t("rules.catchAllLabel")}
                  subtitle={t("rules.catchAllDescription")}
                  disabled={readOnly}
                  right={
                    <Switch
                      accessibilityLabel={t("rules.catchAllLabel")}
                      value={field.value}
                      disabled={readOnly}
                      trackColor={{ false: colors.muted, true: colors.primary }}
                      thumbColor={colors.background}
                      ios_backgroundColor={colors.muted}
                      onValueChange={(next) => {
                        if (!next && !otherCatchAll) {
                          setCatchAllError(true);
                          return;
                        }
                        setCatchAllError(false);
                        field.onChange(next);
                      }}
                    />
                  }
                />
              )}
            />
          </ListGroup>
        </View>

        {!isScanOnly ? (
          <View style={{ gap: SPACING.md }}>
            <View style={{ gap: 2 }}>
              <SectionHeader title={isCatchAll ? t("rules.overrideLabel") : t("rules.rulesLabel")} />
              <AppText size="sm" tone="secondary">
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

        {!isCatchAll ? (
          <View style={{ gap: SPACING.sm }}>
            <SectionHeader title={t("rules.settingsTitle")} />
            <ListGroup>
              <Controller
                control={form.control}
                name="isDisabled"
                render={({ field }) => (
                  <ListRow
                    title={t("rules.disabledLabel")}
                    subtitle={t("rules.disabledDescription")}
                    disabled={readOnly}
                    right={
                      <Switch
                        accessibilityLabel={t("rules.disabledLabel")}
                        value={field.value}
                        disabled={readOnly}
                        trackColor={{ false: colors.muted, true: colors.primary }}
                        thumbColor={colors.background}
                        ios_backgroundColor={colors.muted}
                        onValueChange={field.onChange}
                      />
                    }
                  />
                )}
              />
              {!modeLocksRules && !isScanOnly ? (
                <ListRow
                  title={t("rules.overflowLabel")}
                  subtitle={targets.length === 0 && overflowBin == null ? t("rules.overflowNoOptions") : undefined}
                  value={overflowBin != null ? t("rules.bin", { number: overflowBin }) : t("rules.overflowNone")}
                  disabled={readOnly || (targets.length === 0 && overflowBin == null)}
                  onPress={() => setOverflowOpen(true)}
                />
              ) : null}
            </ListGroup>
          </View>
        ) : null}
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
