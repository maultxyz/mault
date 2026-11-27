import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, View } from "react-native";
import { WEBHOOK_EVENTS, webhookFormSchema, type WebhookFormValues } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { FormSkeleton } from "@/components/ui/form-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { PinnedActionsLayout } from "@/components/ui/pinned-actions-layout";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { SectionSkeleton } from "@/components/ui/section-skeleton";
import { SwitchRow } from "@/components/ui/switch-row";
import { SwitchRowSkeleton } from "@/components/ui/switch-row-skeleton";
import { TextField } from "@/components/ui/text-field";
import { SecretReveal } from "@/features/integrations/components/secret-reveal";
import { useDiscardChangesGuard } from "@/features/settings/lib/use-leave-guard";
import { createWebhook, updateWebhook, webhooksQueryOptions } from "@/features/integrations/api/webhooks";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { useActiveOrg } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { translateFormErrorMessage } from "@/lib/form-validation";

export default function WebhookEditScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const queryClient = useQueryClient();
  const { guid } = useLocalSearchParams<{ guid?: string }>();
  const org = useActiveOrg();
  const orgId = org?.id ?? null;
  const list = useQuery(webhooksQueryOptions(orgId));
  const endpoint = guid ? (list.data?.endpoints.find((candidate) => candidate.guid === guid) ?? null) : null;
  const isNew = !guid;
  const isLoadingEndpoint = !isNew && list.isLoading;
  const isLoadError = !isNew && list.isError && !list.data;
  const [secret, setSecret] = useState<string | null>(null);
  const form = useForm<WebhookFormValues>({
    resolver: zodResolver(webhookFormSchema),
    defaultValues: { url: "", description: "", events: [...WEBHOOK_EVENTS] },
    values: endpoint ? { url: endpoint.url, description: endpoint.description ?? "", events: endpoint.events } : undefined,
    resetOptions: { keepDirtyValues: true },
  });

  const { leaveWithoutGuard } = useDiscardChangesGuard(form.formState.isDirty && !secret);

  const save = useMutation({
    mutationFn: (values: WebhookFormValues) => {
      const input = { url: values.url, description: values.description || null, events: values.events };
      return endpoint ? updateWebhook(endpoint.guid, input).then(() => null) : createWebhook(input).then((created) => created.secret);
    },
    onSuccess: async (createdSecret) => {
      await queryClient.invalidateQueries({ queryKey: ["webhooks", orgId] });
      if (createdSecret) {
        setSecret(createdSecret);
        AccessibilityInfo.announceForAccessibility(t("settings.webhooks.secretTitle"));
        return;
      }
      AccessibilityInfo.announceForAccessibility(t("settings.webhooks.saved"));
      leaveWithoutGuard();
    },
  });

  if (secret) {
    return (
      <SecretReveal
        title={t("settings.webhooks.secretTitle")}
        subtitle={org?.name}
        description={t("settings.webhooks.secretDescription")}
        secret={secret}
        copyLabel={t("settings.webhooks.copySecret")}
        copiedLabel={t("settings.webhooks.secretCopied")}
        copyFailedLabel={t("settings.webhooks.copyFailed")}
        shareLabel={t("settings.webhooks.share")}
        doneLabel={t("settings.apiKeys.revealDone")}
      />
    );
  }

  return (
    <View collapsable={false} style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader
        title={isNew ? t("settings.webhooks.addTitle") : t("settings.webhooks.editTitle")}
        subtitle={t("settings.webhooks.dialogDescription")}
      />
      <PinnedActionsLayout
        actions={
          <Button
            size="lg"
            label={isNew ? t("settings.webhooks.add") : t("settings.webhooks.save")}
            loading={save.isPending}
            disabled={!isNew && !endpoint}
            onPress={form.handleSubmit((values) => save.mutate(values))}
          />
        }
      >
        {save.isError ? <Callout tone="destructive" title={t("settings.webhooks.saveFailed")} /> : null}
        {isLoadError ? (
          <QueryErrorState onRetry={() => void list.refetch()} isRetrying={list.isFetching} />
        ) : isLoadingEndpoint ? (
          <>
            <FormSkeleton fields={2} />
            <SectionSkeleton>
              {Array.from({ length: 3 }).map((_, index) => (
                <SwitchRowSkeleton key={index} hasDescription />
              ))}
            </SectionSkeleton>
          </>
        ) : (
          <>
            <Controller
              control={form.control}
              name="url"
              render={({ field, fieldState }) => (
                <TextField
                  label={t("settings.webhooks.urlLabel")}
                  placeholder="https://shop.example.com/mault-webhook"
                  value={field.value}
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  error={translateFormErrorMessage(t, fieldState.error?.message)}
                />
              )}
            />
            <Controller
              control={form.control}
              name="description"
              render={({ field }) => (
                <TextField
                  label={t("settings.webhooks.descriptionLabel")}
                  placeholder={t("settings.webhooks.descriptionPlaceholder")}
                  value={field.value}
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                />
              )}
            />
            <Controller
              control={form.control}
              name="events"
              render={({ field, fieldState }) => (
                <SettingsSection title={t("settings.webhooks.eventsLabel")}>
                  {WEBHOOK_EVENTS.map((event) => (
                    <SwitchRow
                      key={event}
                      title={event}
                      description={t(`settings.webhooks.events.${event}`)}
                      value={field.value.includes(event)}
                      onValueChange={(on) =>
                        field.onChange(WEBHOOK_EVENTS.filter((candidate) => (candidate === event ? on : field.value.includes(candidate))))
                      }
                    />
                  ))}
                  {fieldState.error ? (
                    <AppText size="xs" accessibilityRole="alert" style={{ color: colors.destructiveForeground }}>
                      {translateFormErrorMessage(t, fieldState.error.message)}
                    </AppText>
                  ) : null}
                </SettingsSection>
              )}
            />
          </>
        )}
      </PinnedActionsLayout>
    </View>
  );
}
