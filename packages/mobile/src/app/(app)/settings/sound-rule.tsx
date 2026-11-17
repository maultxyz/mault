import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams, useNavigation, usePreventRemove } from "expo-router";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Alert, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { SaveBar } from "@/components/ui/save-bar";
import { Screen } from "@/components/ui/screen";
import { SectionHeader } from "@/components/ui/section-header";
import { SelectField } from "@/components/ui/select-field";
import { SwitchRow } from "@/components/ui/switch-row";
import { TextField } from "@/components/ui/text-field";
import { useRulesData } from "@/features/rules/api/use-rules-data";
import { RuleGroupEditor } from "@/features/rules/components/rule-group-editor";
import { createGroup } from "@/features/rules/lib/rules";
import {
  addSoundRule,
  deleteSoundRule,
  soundClipsQueryOptions,
  soundRulesQueryOptions,
  updateSoundRule,
} from "@/features/sounds/api/sounds";
import { useActiveOrg } from "@/hooks/use-org";
import { soundRuleFormSchema, type SoundRuleFormValues } from "@magic-vault/shared";
import { translateFormErrorMessage } from "@/lib/form-validation";

export default function SoundRuleScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { guid } = useLocalSearchParams<{ guid?: string }>();
  const org = useActiveOrg();
  const orgId = org?.id ?? null;
  const { gameGuid, fieldDefinitions, freeformOptions } = useRulesData();
  const rules = useQuery(soundRulesQueryOptions(orgId, gameGuid));
  const clips = useQuery(soundClipsQueryOptions(orgId));
  const existing = guid ? rules.data?.find((rule) => rule.guid === guid) : undefined;
  const [clipOpen, setClipOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const values = useMemo<SoundRuleFormValues>(
    () =>
      existing
        ? { name: existing.name, clipGuid: existing.clipGuid ?? "", isEnabled: existing.isEnabled, rules: existing.rules }
        : { name: "", clipGuid: clips.data?.[0]?.guid ?? "", isEnabled: true, rules: createGroup(fieldDefinitions) },
    [existing, clips.data, fieldDefinitions],
  );
  const form = useForm<SoundRuleFormValues>({
    resolver: zodResolver(soundRuleFormSchema),
    values,
    resetOptions: { keepDirtyValues: true },
  });
  const isDirty = form.formState.isDirty;
  const rulesKey = soundRulesQueryOptions(orgId, gameGuid).queryKey;

  const finish = (latest: Awaited<ReturnType<typeof deleteSoundRule>>) => {
    queryClient.setQueryData(rulesKey, latest);
    void queryClient.invalidateQueries({ queryKey: ["sound-rules", orgId, "count"] });
    router.back();
  };

  const save = useMutation({
    mutationFn: (draft: SoundRuleFormValues) => {
      const input = { ...draft, name: draft.name.trim() };
      return existing ? updateSoundRule(existing.guid, input) : addSoundRule(gameGuid ?? "", input);
    },
    onSuccess: (latest, draft) => {
      form.reset(draft);
      finish(latest);
    },
    onError: (err: Error) => setError(err.message || t("settings.sounds.ruleDialog.saveFailed")),
  });
  const remove = useMutation({
    mutationFn: () => deleteSoundRule(existing?.guid ?? ""),
    onSuccess: (latest) => {
      form.reset(values);
      finish(latest);
    },
    onError: (err: Error) => setError(err.message || t("settings.sounds.rules.saveFailed")),
  });

  usePreventRemove(isDirty && !save.isPending && !remove.isPending, ({ data }) => {
    Alert.alert(t("common.discardTitle"), t("settings.discardDescription"), [
      { text: t("common.keepEditing"), style: "cancel" },
      {
        text: t("common.discard"),
        style: "destructive",
        onPress: () => {
          form.reset(values);
          navigation.dispatch(data.action);
        },
      },
    ]);
  });

  const submit = form.handleSubmit(
    (draft) => {
      setError(null);
      save.mutate(draft);
    },
    (errors) =>
      setError(
        translateFormErrorMessage(t, (errors.name ?? errors.clipGuid ?? errors.rules)?.message) ??
          t("settings.sounds.ruleDialog.saveFailed"),
      ),
  );

  const confirmDelete = () =>
    Alert.alert(t("settings.sounds.rules.delete", { name: existing?.name ?? "" }), t("settings.sounds.rules.deleteConfirm"), [
      { text: t("settings.sounds.ruleDialog.cancel"), style: "cancel" },
      { text: t("cardDetail.remove"), style: "destructive", onPress: () => remove.mutate() },
    ]);

  return (
    <View style={{ flex: 1 }}>
      <Screen
        header={
          <PageHeader
            title={existing ? t("settings.sounds.ruleDialog.editTitle") : t("settings.sounds.ruleDialog.addTitle")}
            subtitle={org?.name}
            onBack={() => router.back()}
          />
        }
      >
        <AppText size="sm" tone="secondary">
          {t("settings.sounds.ruleDialog.description")}
        </AppText>
        {error ? <Callout tone="destructive" title={error} /> : null}
        <Controller
          control={form.control}
          name="name"
          render={({ field }) => (
            <TextField
              label={t("settings.sounds.ruleDialog.name")}
              value={field.value}
              onBlur={field.onBlur}
              onChangeText={field.onChange}
            />
          )}
        />
        <Controller
          control={form.control}
          name="clipGuid"
          render={({ field }) => (
            <SelectField
              label={t("settings.sounds.ruleDialog.clip")}
              value={clips.data?.find((clip) => clip.guid === field.value)?.name ?? null}
              placeholder={t("settings.sounds.ruleDialog.clipPlaceholder")}
              onPress={() => setClipOpen(true)}
            />
          )}
        />
        <Controller
          control={form.control}
          name="isEnabled"
          render={({ field }) => (
            <SwitchRow title={t("settings.sounds.ruleDialog.enabled")} value={field.value} onValueChange={field.onChange} />
          )}
        />
        <SectionHeader title={t("settings.sounds.ruleDialog.conditions")} />
        <Controller
          control={form.control}
          name="rules"
          render={({ field }) => (
            <RuleGroupEditor
              group={field.value}
              onChange={field.onChange}
              fieldDefinitions={fieldDefinitions}
              freeformOptions={freeformOptions}
            />
          )}
        />
        {existing ? (
          <Button
            variant="ghost"
            icon="trash"
            label={t("settings.sounds.rules.delete", { name: existing.name })}
            loading={remove.isPending}
            onPress={confirmDelete}
          />
        ) : null}
      </Screen>
      <SaveBar
        visible={isDirty || !existing}
        saving={save.isPending}
        onSave={() => void submit()}
        onDiscard={() => (existing ? form.reset(values) : router.back())}
      />
      <OptionSheet
        visible={clipOpen}
        title={t("settings.sounds.ruleDialog.clip")}
        options={(clips.data ?? []).map((clip) => ({ value: clip.guid, label: clip.name }))}
        selected={[form.watch("clipGuid")]}
        onSelect={(value) => {
          setClipOpen(false);
          form.setValue("clipGuid", value, { shouldDirty: true });
        }}
        onClose={() => setClipOpen(false)}
      />
    </View>
  );
}
