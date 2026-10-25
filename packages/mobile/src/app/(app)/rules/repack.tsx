import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import { router, useNavigation, usePreventRemove } from "expo-router";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import {
  getRepackSiftBin,
  REPACK_UNIQUE_BY_NAME,
  REPACK_UNIQUE_BY_PRINTING,
  type RepackSlot,
} from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { SaveBar } from "@/components/ui/save-bar";
import { SectionHeader } from "@/components/ui/section-header";
import { Surface } from "@/components/ui/surface";
import { SwitchRow } from "@/components/ui/switch-row";
import { binSetsQueryOptions } from "@/features/devices/api/devices";
import { setRepackConfig } from "@/features/rules/api/bin-sets";
import { useRulesData } from "@/features/rules/api/use-rules-data";
import { RuleGroupEditor } from "@/features/rules/components/rule-group-editor";
import { repackSchema } from "@/features/rules/lib/mode-schema";
import { emptyRules } from "@/features/rules/lib/rules";
import { useActiveOrgId } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { REPACK_ALLOW_DUPLICATES_VALUE } from "@/lib/constants/rules";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { RepackFormValues } from "@/lib/interfaces/forms";

function createSlot(): RepackSlot {
  return { id: Crypto.randomUUID(), rule: emptyRules(), targetCount: 1 };
}

export default function RepackEditorScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const orgId = useActiveOrgId();
  const { activeSet, bins, fieldDefinitions, freeformOptions } = useRulesData();
  const [uniqueByOpen, setUniqueByOpen] = useState(false);
  const editable = !!activeSet?.isActive && !!activeSet.isRepackMode;
  const siftBin = getRepackSiftBin(bins);

  const serverValues = useMemo<RepackFormValues | undefined>(
    () =>
      activeSet
        ? {
            repackUniqueBy: activeSet.repackUniqueBy ?? REPACK_ALLOW_DUPLICATES_VALUE,
            repackSiftRules: activeSet.repackSiftRules,
            repackSlots: activeSet.repackSlots.length > 0 ? activeSet.repackSlots : [createSlot()],
            repackMultiplePacks: activeSet.repackMultiplePacks,
          }
        : undefined,
    [activeSet],
  );
  const form = useForm<RepackFormValues>({
    resolver: zodResolver(repackSchema),
    values: serverValues,
    resetOptions: { keepDirtyValues: true },
  });
  const { isDirty } = form.formState;

  const save = useMutation({
    mutationFn: (values: RepackFormValues) =>
      activeSet
        ? setRepackConfig(activeSet.guid, {
            isRepackMode: true,
            repackSlots: values.repackSlots,
            repackUniqueBy: values.repackUniqueBy === REPACK_ALLOW_DUPLICATES_VALUE ? null : values.repackUniqueBy,
            repackSiftRules: values.repackSiftRules,
            repackMultiplePacks: values.repackMultiplePacks,
          })
        : Promise.resolve(null),
    onSuccess: (next, values) => {
      if (next) queryClient.setQueryData(binSetsQueryOptions(orgId).queryKey, next);
      form.reset(values);
    },
  });

  usePreventRemove(isDirty && !save.isPending, ({ data }) => {
    Alert.alert(t("common.discardTitle"), t("common.discardDescription"), [
      { text: t("common.keepEditing"), style: "cancel" },
      { text: t("common.discard"), style: "destructive", onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  const uniqueByOptions = [
    { value: REPACK_ALLOW_DUPLICATES_VALUE, label: t("rules.repack.uniqueByAllow") },
    { value: REPACK_UNIQUE_BY_PRINTING, label: t("rules.repack.uniqueByPrinting") },
    { value: REPACK_UNIQUE_BY_NAME, label: t("rules.repack.uniqueByName") },
    ...fieldDefinitions
      .filter((f) => f.field !== "name")
      .map((f) => ({ value: f.field, label: t("rules.repack.uniqueByField", { field: f.label }) })),
  ];
  const uniqueBy = form.watch("repackUniqueBy");

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <PageHeader title={t("rules.repack.title")} subtitle={activeSet?.name} onBack={() => router.back()} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingBottom: SPACING.xxl * 2, gap: SPACING.xxl }}
      >
        <AppText size="sm" tone="secondary">
          {t("rules.modes.repack.description")}
        </AppText>
        {save.isError ? <Callout tone="destructive" title={t("rules.repack.saveFailed")} /> : null}

        <View style={{ gap: SPACING.sm }}>
          <ListGroup>
            <ListRow
              title={t("rules.repack.uniqueByLabel")}
              subtitle={t("rules.repack.uniqueByDescription")}
              value={uniqueByOptions.find((o) => o.value === uniqueBy)?.label}
              disabled={!editable}
              onPress={() => setUniqueByOpen(true)}
            />
          </ListGroup>
        </View>

        <Controller
          control={form.control}
          name="repackMultiplePacks"
          render={({ field }) => (
            <SwitchRow
              title={t("rules.repack.multiplePacksLabel")}
              description={t("rules.repack.multiplePacksDescription")}
              value={field.value}
              disabled={!editable}
              onValueChange={field.onChange}
            />
          )}
        />

        <Controller
          control={form.control}
          name="repackSiftRules"
          render={({ field }) => (
            <View style={{ gap: SPACING.sm }}>
              <SwitchRow
                title={t("rules.repack.siftLabel")}
                description={t("rules.repack.siftDescription")}
                value={field.value != null}
                disabled={!editable}
                onValueChange={(on) => field.onChange(on ? emptyRules() : null)}
              />
              {field.value != null ? (
                <View style={{ gap: SPACING.sm }}>
                  <AppText size="xs" tone="secondary">
                    {siftBin ? t("rules.repack.siftHint", { bin: siftBin.binNumber }) : t("rules.repack.siftNoBin")}
                  </AppText>
                  <RuleGroupEditor
                    group={field.value}
                    onChange={field.onChange}
                    fieldDefinitions={fieldDefinitions}
                    freeformOptions={freeformOptions}
                    disabled={!editable}
                  />
                </View>
              ) : null}
            </View>
          )}
        />

        <Controller
          control={form.control}
          name="repackSlots"
          render={({ field }) => (
            <View style={{ gap: SPACING.md }}>
              <SectionHeader title={t("rules.repack.slotsLabel")} />
              {field.value.map((slot, index) => (
                <Surface key={slot.id} style={{ gap: SPACING.md }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>
                    <AppText weight="medium" style={{ flex: 1 }}>
                      {t("rules.repack.slotCountLabel")}
                    </AppText>
                    <Input
                      compact
                      accessibilityLabel={t("rules.repack.slotCountLabel")}
                      keyboardType="number-pad"
                      editable={editable}
                      value={String(slot.targetCount)}
                      onChangeText={(text) => {
                        const next = [...field.value];
                        next[index] = { ...slot, targetCount: Math.max(1, Number(text.replace(/\D/g, "")) || 1) };
                        field.onChange(next);
                      }}
                    />
                    <IconButton
                      icon="trash"
                      size={36}
                      accessibilityLabel={t("rules.repack.removeSlot")}
                      disabled={!editable}
                      onPress={() => field.onChange(field.value.filter((_, i) => i !== index))}
                    />
                  </View>
                  <RuleGroupEditor
                    group={slot.rule}
                    onChange={(rule) => {
                      const next = [...field.value];
                      next[index] = { ...slot, rule };
                      field.onChange(next);
                    }}
                    fieldDefinitions={fieldDefinitions}
                    freeformOptions={freeformOptions}
                    disabled={!editable}
                  />
                </Surface>
              ))}
              <Button
                variant="secondary"
                icon="plus"
                label={t("rules.repack.addSlot")}
                disabled={!editable}
                onPress={() => field.onChange([...field.value, createSlot()])}
              />
            </View>
          )}
        />
      </ScrollView>
      <OptionSheet
        visible={uniqueByOpen}
        title={t("rules.repack.uniqueByLabel")}
        options={uniqueByOptions}
        selected={[uniqueBy]}
        onSelect={(value) => {
          form.setValue("repackUniqueBy", value, { shouldDirty: true });
          setUniqueByOpen(false);
        }}
        onClose={() => setUniqueByOpen(false)}
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
