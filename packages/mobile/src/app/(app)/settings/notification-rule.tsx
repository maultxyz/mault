import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
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
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { PinnedActionsLayout } from "@/components/ui/pinned-actions-layout";
import { QueryErrorState } from "@/components/ui/query-error-state";
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
import { channelLabel, roleLabel } from "@/features/integrations/lib/discord-settings";
import { useRulesData } from "@/features/rules/api/use-rules-data";
import { RuleGroupEditor } from "@/features/rules/components/rule-group-editor";
import { createGroup } from "@/features/rules/lib/rules";
import { useActiveOrg } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { SPACING } from "@/lib/constants/theme";
import { notificationRuleFormSchema, type NotificationRuleFormValues } from "@magic-vault/shared";
import { translateFormErrorMessage } from "@/lib/form-validation";

export default function NotificationRuleScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
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

  const values = useMemo<NotificationRuleFormValues>(
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
  const form = useForm<NotificationRuleFormValues>({
    resolver: zodResolver(notificationRuleFormSchema),
    values,
    resetOptions: { keepDirtyValues: true },
  });
  const isLoading = rules.isLoading || integration.isLoading;
  const isLoadError = (rules.isError && !rules.data) || (integration.isError && !integration.data);
  const retryLoad = () => {
    void integration.refetch();
    if (gameGuid) void rules.refetch();
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["notification-rules", orgId] });

  const save = useMutation({
    mutationFn: (draft: NotificationRuleFormValues) => {
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

  const submit = form.handleSubmit(
    (draft) => {
      setError(null);
      save.mutate(draft);
    },
    (errors) =>
      setError(
        translateFormErrorMessage(t, (errors.name ?? errors.channelId ?? errors.rules)?.message) ??
          t("settings.discord.ruleDialog.saveFailed"),
      ),
  );

  const confirmDelete = () =>
    Alert.alert(t("settings.discord.rules.delete", { name: existing?.name ?? "" }), undefined, [
      { text: t("settings.discord.ruleDialog.cancel"), style: "cancel" },
      { text: t("settings.webhooks.delete"), style: "destructive", onPress: () => remove.mutate() },
    ]);

  return (
    <View collapsable={false} style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader
        title={existing ? t("settings.discord.ruleDialog.editTitle") : t("settings.discord.ruleDialog.addTitle")}
        subtitle={t("settings.discord.ruleDialog.description")}
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
                label={t("settings.webhooks.delete")}
                loading={remove.isPending}
                disabled={save.isPending}
                onPress={confirmDelete}
              />
            ) : null}
            <Button
              style={{ flex: 1 }}
              size={existing ? "md" : "lg"}
              label={t("settings.discord.ruleDialog.save")}
              loading={save.isPending}
              disabled={isLoading || isLoadError || remove.isPending}
              onPress={() => void submit()}
            />
          </>
        }
      >
        {error ? <Callout tone="destructive" title={error} /> : null}
        {isLoadError ? (
          <QueryErrorState onRetry={retryLoad} isRetrying={rules.isFetching || integration.isFetching} />
        ) : isLoading ? (
          <PageSkeleton />
        ) : (
          <>
            <Controller
              control={form.control}
              name="name"
              render={({ field }) => (
                <TextField
                  label={t("settings.discord.ruleDialog.name")}
                  value={field.value}
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  returnKeyType="done"
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
                    value={roleLabel(roles, field.value, t)}
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
            <View style={{ gap: SPACING.sm }}>
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
            </View>
          </>
        )}
      </PinnedActionsLayout>
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
