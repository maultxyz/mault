import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { Callout } from "@/components/ui/callout";
import { OptionSheet } from "@/components/ui/option-sheet";
import { SectionHeader } from "@/components/ui/section-header";
import { SelectField } from "@/components/ui/select-field";
import { SwitchRow } from "@/components/ui/switch-row";
import { TextField } from "@/components/ui/text-field";
import { useRulesData } from "@/features/rules/api/use-rules-data";
import { RuleGroupEditor } from "@/features/rules/components/rule-group-editor";
import { createGroup } from "@/features/rules/lib/rules";
import { SettingsPage } from "@/features/settings/components/settings-page";
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
    <SettingsPage
      title={existing ? t("settings.sounds.ruleDialog.editTitle") : t("settings.sounds.ruleDialog.addTitle")}
      isLoading={rules.isLoading || clips.isLoading}
      isDirty={isDirty}
      isSaving={save.isPending}
      isLeavingWithoutGuard={remove.isPending}
      isSaveBarVisible={isDirty || !existing}
      onSave={() => void submit()}
      onDiscard={() => form.reset(values)}
      onSaveBarDiscard={() => (existing ? form.reset(values) : router.back())}
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
            returnKeyType="done"
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
        <ListGroup>
          <ListRow
            icon="trash"
            tone="destructive"
            title={t("settings.sounds.rules.delete", { name: existing.name })}
            disabled={remove.isPending}
            onPress={confirmDelete}
          />
        </ListGroup>
      ) : null}
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
    </SettingsPage>
  );
}
