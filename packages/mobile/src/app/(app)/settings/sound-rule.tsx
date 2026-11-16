import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Alert, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { PinnedActionsLayout } from "@/components/ui/pinned-actions-layout";
import { QueryErrorState } from "@/components/ui/query-error-state";
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
import { useTheme } from "@/hooks/use-theme";
import { SPACING } from "@/lib/constants/theme";
import { soundRuleFormSchema, type SoundRuleFormValues } from "@magic-vault/shared";
import { translateFormErrorMessage } from "@/lib/form-validation";

export default function SoundRuleScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
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
  const isLoading = rules.isLoading || clips.isLoading;
  const isLoadError = (rules.isError && !rules.data) || (clips.isError && !clips.data);
  const retryLoad = () => {
    void clips.refetch();
    if (gameGuid) void rules.refetch();
  };
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
    <View collapsable={false} style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader
        title={existing ? t("settings.sounds.ruleDialog.editTitle") : t("settings.sounds.ruleDialog.addTitle")}
        subtitle={t("settings.sounds.ruleDialog.description")}
      />
      <PinnedActionsLayout
        actionsDirection="row"
        actions={
          <>
            {existing ? (
              <Button
                style={{ flex: 1 }}
                variant="destructive"
                icon="trash"
                label={t("cardDetail.remove")}
                loading={remove.isPending}
                disabled={save.isPending}
                onPress={confirmDelete}
              />
            ) : null}
            <Button
              style={{ flex: 1 }}
              size={existing ? "md" : "lg"}
              label={t("settings.sounds.ruleDialog.save")}
              loading={save.isPending}
              disabled={isLoading || isLoadError || remove.isPending}
              onPress={() => void submit()}
            />
          </>
        }
      >
        {error ? <Callout tone="destructive" title={error} /> : null}
        {isLoadError ? (
          <QueryErrorState onRetry={retryLoad} isRetrying={rules.isFetching || clips.isFetching} />
        ) : isLoading ? (
          <PageSkeleton />
        ) : (
          <>
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
            <View style={{ gap: SPACING.sm }}>
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
            </View>
          </>
        )}
      </PinnedActionsLayout>
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
