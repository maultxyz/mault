import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, Share, View } from "react-native";
import { WEBHOOK_EVENTS, webhookFormSchema, type WebhookFormValues } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { PageHeader } from "@/components/ui/page-header";
import { PinnedActionsLayout } from "@/components/ui/pinned-actions-layout";
import { SectionHeader } from "@/components/ui/section-header";
import { SwitchRow } from "@/components/ui/switch-row";
import { TextField } from "@/components/ui/text-field";
import { createWebhook, updateWebhook, webhooksQueryOptions } from "@/features/integrations/api/webhooks";
import { useActiveOrg } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SPACING } from "@/lib/constants/theme";
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
  const [secret, setSecret] = useState<string | null>(null);
  const form = useForm<WebhookFormValues>({
    resolver: zodResolver(webhookFormSchema),
    defaultValues: { url: "", description: "", events: [...WEBHOOK_EVENTS] },
    values: endpoint ? { url: endpoint.url, description: endpoint.description ?? "", events: endpoint.events } : undefined,
    resetOptions: { keepDirtyValues: true },
  });

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
      router.back();
    },
  });

  if (secret) {
    return (
      <View collapsable={false} style={{ flex: 1, backgroundColor: colors.background }}>
        <PageHeader title={t("settings.webhooks.secretTitle")} subtitle={org?.name} />
        <PinnedActionsLayout
          actions={
            <>
              <Button size="lg" icon="share" label={t("settings.webhooks.share")} onPress={() => void Share.share({ message: secret })} />
              <Button variant="secondary" label={t("settings.apiKeys.revealDone")} onPress={() => router.back()} />
            </>
          }
        >
          <AppText size="sm" tone="secondary">
            {t("settings.webhooks.secretDescription")}
          </AppText>
          <View style={{ padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: colors.muted }}>
            <AppText mono selectable>
              {secret}
            </AppText>
          </View>
        </PinnedActionsLayout>
      </View>
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
        {save.isError ? <Callout tone="destructive" title={save.error.message} /> : null}
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
            <View style={{ gap: SPACING.sm }}>
              <SectionHeader title={t("settings.webhooks.eventsLabel")} />
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
            </View>
          )}
        />
      </PinnedActionsLayout>
    </View>
  );
}
