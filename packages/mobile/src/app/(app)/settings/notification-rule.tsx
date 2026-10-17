import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams, useNavigation, usePreventRemove } from "expo-router";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Alert, View } from "react-native";
import type { NotificationRuleInput } from "@magic-vault/shared";
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
import {
  addNotificationRule,
  deleteNotificationRule,
  discordIntegrationQueryOptions,
  notificationRulesQueryOptions,
  updateNotificationRule,
} from "@/features/integrations/api/discord";
import { notificationRuleSchema } from "@/features/integrations/lib/discord-settings-schema";
import { channelLabel } from "@/features/integrations/lib/discord-settings";
import { useRulesData } from "@/features/rules/api/use-rules-data";
import { RuleGroupEditor } from "@/features/rules/components/rule-group-editor";
import { createGroup } from "@/features/rules/lib/rules";
import { useActiveOrg } from "@/hooks/use-org";
import { SPACING } from "@/lib/constants/theme";
import type { NotificationRuleValues } from "@/lib/interfaces/forms";

export default function NotificationRuleScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { guid } = useLocalSearchParams<{ guid?: string }>();
  const org = useActiveOrg();
  const orgId = org?.id ?? null;
  const { gameGuid, fieldDefinitions, freeformOptions } = useRulesData();
  const integration = useQuery(discordIntegrationQueryOptions(orgId));
  const rules = useQuery(notificationRulesQueryOptions(orgId, gameGuid));
  const existing = guid ? rules.data?.find((rule) => rule.guid === guid) : undefined;
  const channels = integration.data?.guild?.channels ?? [];
  const roles = integration.data?.guild?.roles ?? [];
  const [picker, setPicker] = useState<"channel" | "role" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const values = useMemo<NotificationRuleValues>(
    () =>
      existing
        ? {
            name: existing.name,
            channelId: existing.channelId ?? "",
            roleId: existing.roleId,
            isEnabled: existing.isEnabled,
            rules: existing.rules,
          }
        : { name: "", channelId: "", roleId: null, isEnabled: true, rules: createGroup(fieldDefinitions) },
    [existing, fieldDefinitions],
  );
  const form = useForm<NotificationRuleValues>({
    resolver: zodResolver(notificationRuleSchema),
    values,
    resetOptions: { keepDirtyValues: true },
  });
  const isDirty = form.formState.isDirty;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["notification-rules", orgId] });

  const save = useMutation({
    mutationFn: (draft: NotificationRuleValues) => {
      const input: NotificationRuleInput = { ...draft, name: draft.name.trim() };
      return existing ? updateNotificationRule(existing.guid, input) : addNotificationRule(gameGuid ?? "", input);
    },
    onSuccess: async (_, draft) => {
      form.reset(draft);
      await invalidate();
      router.back();
    },
    onError: (err: Error) => setError(err.message || t("settings.discord.ruleDialog.saveFailed")),
  });
  const remove = useMutation({
    mutationFn: () => deleteNotificationRule(existing?.guid ?? ""),
    onSuccess: async () => {
      form.reset(values);
      await invalidate();
      router.back();
    },
    onError: (err: Error) => setError(err.message || t("settings.discord.rules.saveFailed")),
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
      if (draft.rules.conditions.length === 0) {
        setError(t("settings.discord.ruleDialog.validation.conditionsRequired"));
        return;
      }
      setError(null);
      save.mutate(draft);
    },
    (errors) =>
      setError(
        errors.name
          ? t("settings.discord.ruleDialog.validation.nameRequired")
          : errors.channelId
            ? t("settings.discord.ruleDialog.validation.channelRequired")
            : t("settings.discord.ruleDialog.saveFailed"),
      ),
  );

  const confirmDelete = () =>
    Alert.alert(t("settings.discord.rules.delete", { name: existing?.name ?? "" }), undefined, [
      { text: t("settings.discord.ruleDialog.cancel"), style: "cancel" },
      { text: t("settings.webhooks.delete"), style: "destructive", onPress: () => remove.mutate() },
    ]);

  const roleLabel = (roleId: string | null) => {
    if (!roleId) return t("settings.discord.roles.none");
    const role = roles.find((r) => r.id === roleId);
    return role ? `@${role.name}` : t("settings.discord.roles.unknown", { id: roleId });
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen
        header={
          <PageHeader
            title={existing ? t("settings.discord.ruleDialog.editTitle") : t("settings.discord.ruleDialog.addTitle")}
            subtitle={org?.name}
            onBack={() => router.back()}
          />
        }
      >
        <AppText size="sm" tone="secondary">
          {t("settings.discord.ruleDialog.description")}
        </AppText>
        {error ? <Callout tone="destructive" title={error} /> : null}
        <Controller
          control={form.control}
          name="name"
          render={({ field }) => (
            <TextField
              label={t("settings.discord.ruleDialog.name")}
              value={field.value}
              onBlur={field.onBlur}
              onChangeText={field.onChange}
            />
          )}
        />
        <Controller
          control={form.control}
          name="channelId"
          render={({ field }) => (
            <SelectField
              label={t("settings.discord.ruleDialog.channel")}
              value={field.value ? channelLabel(channels, field.value, t, "") : null}
              placeholder={t("settings.discord.ruleDialog.channelPlaceholder")}
              onPress={() => setPicker("channel")}
            />
          )}
        />
        <Controller
          control={form.control}
          name="roleId"
          render={({ field }) => (
            <View style={{ gap: SPACING.xs }}>
              <SelectField
                label={t("settings.discord.ruleDialog.role")}
                value={roleLabel(field.value)}
                placeholder={t("settings.discord.roles.none")}
                onPress={() => setPicker("role")}
              />
              <AppText size="xs" tone="secondary">
                {t("settings.discord.ruleDialog.roleHint")}
              </AppText>
            </View>
          )}
        />
        <Controller
          control={form.control}
          name="isEnabled"
          render={({ field }) => (
            <SwitchRow title={t("settings.discord.ruleDialog.enabled")} value={field.value} onValueChange={field.onChange} />
          )}
        />
        <SectionHeader title={t("settings.discord.ruleDialog.conditions")} />
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
            label={t("settings.discord.rules.delete", { name: existing.name })}
            loading={remove.isPending}
            onPress={confirmDelete}
          />
        ) : null}
      </Screen>
      <SaveBar visible={isDirty || !existing} saving={save.isPending} onSave={() => void submit()} onDiscard={() => (existing ? form.reset(values) : router.back())} />
      <OptionSheet
        visible={picker === "channel"}
        title={t("settings.discord.ruleDialog.channel")}
        options={channels.map((channel) => ({ value: channel.id, label: channelLabel(channels, channel.id, t, "") }))}
        selected={[form.watch("channelId")]}
        onSelect={(value) => {
          setPicker(null);
          form.setValue("channelId", value, { shouldDirty: true });
        }}
        onClose={() => setPicker(null)}
      />
      <OptionSheet
        visible={picker === "role"}
        title={t("settings.discord.ruleDialog.role")}
        options={[
          { value: "", label: t("settings.discord.roles.none") },
          ...roles.map((role) => ({ value: role.id, label: role.canPing ? `@${role.name}` : `@${role.name} (${t("settings.discord.roles.cantPing")})` })),
        ]}
        selected={[form.watch("roleId") ?? ""]}
        onSelect={(value) => {
          setPicker(null);
          form.setValue("roleId", value === "" ? null : value, { shouldDirty: true });
        }}
        onClose={() => setPicker(null)}
      />
    </View>
  );
}
