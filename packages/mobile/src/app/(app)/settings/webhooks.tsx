import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Alert, Share, View } from "react-native";
import { WEBHOOK_EVENTS, type WebhookEndpoint } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { Screen } from "@/components/ui/screen";
import { Surface } from "@/components/ui/surface";
import { SwitchRow } from "@/components/ui/switch-row";
import { TextField } from "@/components/ui/text-field";
import {
  createWebhook,
  deleteWebhook,
  enableWebhook,
  testWebhook,
  updateWebhook,
  webhooksQueryOptions,
} from "@/features/integrations/api/webhooks";
import { webhookSchema } from "@/features/integrations/lib/webhook-schema";
import { billingQueryOptions } from "@/features/org/api/billing";
import { useActiveOrg } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import { formatShortDate } from "@/lib/dates";
import type { WebhookValues } from "@/lib/interfaces/forms";

export default function WebhooksSettingsScreen() {
  const { t, i18n } = useTranslation();
  const colors = useTheme();
  const queryClient = useQueryClient();
  const org = useActiveOrg();
  const orgId = org?.id ?? null;
  const list = useQuery(webhooksQueryOptions(orgId));
  const { data: billing } = useQuery(billingQueryOptions(orgId));
  const locked = billing?.apiAccess === false;
  const canManage = list.data?.canManage ?? false;
  const [editing, setEditing] = useState<WebhookEndpoint | "new" | null>(null);
  const [actionsFor, setActionsFor] = useState<WebhookEndpoint | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "destructive"; text: string } | null>(null);
  const form = useForm<WebhookValues>({
    resolver: zodResolver(webhookSchema),
    defaultValues: { url: "", description: "", events: [...WEBHOOK_EVENTS] },
  });
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["webhooks", orgId] });
  const fail = (err: Error) => setMessage({ tone: "destructive", text: err.message });

  const save = useMutation({
    mutationFn: (values: WebhookValues) => {
      const input = { url: values.url, description: values.description || null, events: values.events };
      return editing && editing !== "new"
        ? updateWebhook(editing.guid, input).then(() => null)
        : createWebhook(input).then((created) => created.secret);
    },
    onSuccess: (createdSecret) => {
      setEditing(null);
      if (createdSecret) setSecret(createdSecret);
      else setMessage({ tone: "success", text: t("settings.webhooks.saved") });
      invalidate();
    },
    onError: fail,
  });
  const test = useMutation({
    mutationFn: testWebhook,
    onSuccess: (result) =>
      setMessage(
        result.ok
          ? { tone: "success", text: t("settings.webhooks.testSucceeded", { status: result.status }) }
          : {
              tone: "destructive",
              text: t("settings.webhooks.testRejected", { error: result.error ?? t("settings.webhooks.unknownError") }),
            },
      ),
    onSettled: invalidate,
    onError: fail,
  });
  const enable = useMutation({
    mutationFn: enableWebhook,
    onSuccess: () => setMessage({ tone: "success", text: t("settings.webhooks.enabled") }),
    onSettled: invalidate,
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: deleteWebhook,
    onSuccess: () => setMessage({ tone: "success", text: t("settings.webhooks.deleted") }),
    onSettled: invalidate,
    onError: fail,
  });

  const startEditing = (target: WebhookEndpoint | "new") => {
    form.reset(
      target === "new"
        ? { url: "", description: "", events: [...WEBHOOK_EVENTS] }
        : { url: target.url, description: target.description ?? "", events: target.events },
    );
    setEditing(target);
  };

  const runAction = (action: string) => {
    const endpoint = actionsFor;
    setActionsFor(null);
    if (!endpoint) return;
    if (action === "test") test.mutate(endpoint.guid);
    else if (action === "enable") enable.mutate(endpoint.guid);
    else if (action === "edit") startEditing(endpoint);
    else if (action === "delete") {
      Alert.alert(t("settings.webhooks.deleteConfirmTitle"), t("settings.webhooks.deleteConfirmDescription"), [
        { text: t("settings.webhooks.cancel"), style: "cancel" },
        { text: t("settings.webhooks.delete"), style: "destructive", onPress: () => remove.mutate(endpoint.guid) },
      ]);
    }
  };

  const statusLine = (endpoint: WebhookEndpoint) => {
    if (!endpoint.isEnabled) return t("settings.webhooks.disabled");
    if (!endpoint.lastDeliveryAt) return t("settings.webhooks.neverDelivered");
    const date = formatShortDate(endpoint.lastDeliveryAt, i18n.language);
    return endpoint.lastError
      ? t("settings.webhooks.lastFailed", { date, error: endpoint.lastError })
      : t("settings.webhooks.lastSucceeded", { date, status: endpoint.lastStatus });
  };

  return (
    <Screen
      refreshing={list.isRefetching}
      onRefresh={() => void list.refetch()}
      header={<PageHeader title={t("settings.webhooks.heading")} subtitle={org?.name} onBack={() => router.back()} />}
    >
      <AppText size="sm" tone="secondary">
        {t("settings.webhooks.description")}
      </AppText>
      {locked ? <Callout tone="info" title={t("settings.webhooks.upgrade")} /> : null}
      {!locked && list.data && !canManage ? <Callout tone="info" title={t("settings.webhooks.managersOnly")} /> : null}
      {list.isError ? <Callout tone="destructive" title={t("settings.webhooks.loadFailed")} /> : null}
      {message ? <Callout tone={message.tone} title={message.text} /> : null}

      {secret ? (
        <Surface style={{ gap: SPACING.md }}>
          <AppText heading weight="semibold">
            {t("settings.webhooks.secretTitle")}
          </AppText>
          <AppText size="xs" tone="secondary">
            {t("settings.webhooks.secretDescription")}
          </AppText>
          <View style={{ padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: colors.muted }}>
            <AppText mono selectable>
              {secret}
            </AppText>
          </View>
          <View style={{ flexDirection: "row", gap: SPACING.sm }}>
            <Button style={{ flex: 1 }} variant="secondary" label={t("settings.webhooks.share")} onPress={() => void Share.share({ message: secret })} />
            <Button style={{ flex: 1 }} label={t("settings.apiKeys.revealDone")} onPress={() => setSecret(null)} />
          </View>
        </Surface>
      ) : null}

      {editing ? (
        <Surface style={{ gap: SPACING.md }}>
          <View>
            <AppText heading weight="semibold">
              {editing === "new" ? t("settings.webhooks.addTitle") : t("settings.webhooks.editTitle")}
            </AppText>
            <AppText size="xs" tone="secondary">
              {t("settings.webhooks.dialogDescription")}
            </AppText>
          </View>
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
                error={fieldState.error ? t("settings.webhooks.invalidUrl") : undefined}
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
                <AppText size="sm" weight="medium">
                  {t("settings.webhooks.eventsLabel")}
                </AppText>
                {WEBHOOK_EVENTS.map((event) => (
                  <SwitchRow
                    key={event}
                    title={event}
                    description={t(`settings.webhooks.events.${event}`)}
                    value={field.value.includes(event)}
                    onValueChange={(on) =>
                      field.onChange(WEBHOOK_EVENTS.filter((e) => (e === event ? on : field.value.includes(e))))
                    }
                  />
                ))}
                {fieldState.error ? (
                  <AppText size="xs" style={{ color: colors.destructive }}>
                    {t("settings.webhooks.eventsRequired")}
                  </AppText>
                ) : null}
              </View>
            )}
          />
          <View style={{ flexDirection: "row", gap: SPACING.sm }}>
            <Button style={{ flex: 1 }} variant="ghost" label={t("settings.webhooks.cancel")} onPress={() => setEditing(null)} />
            <Button
              style={{ flex: 1 }}
              label={editing === "new" ? t("settings.webhooks.add") : t("settings.webhooks.save")}
              loading={save.isPending}
              onPress={form.handleSubmit((values) => save.mutate(values))}
            />
          </View>
        </Surface>
      ) : canManage && !locked ? (
        <Button icon="plus" label={t("settings.webhooks.add")} onPress={() => startEditing("new")} />
      ) : null}

      {list.data && list.data.endpoints.length === 0 && !editing ? (
        <EmptyState icon="external" title={t("settings.webhooks.empty")} />
      ) : (
        <ListGroup>
          {(list.data?.endpoints ?? []).map((endpoint) => (
            <ListRow
              key={endpoint.guid}
              icon="external"
              title={endpoint.description || endpoint.url}
              subtitle={[endpoint.description ? endpoint.url : null, statusLine(endpoint)].filter(Boolean).join("\n")}
              tone={endpoint.isEnabled ? "default" : "destructive"}
              disabled={!canManage}
              onPress={() => setActionsFor(endpoint)}
            />
          ))}
        </ListGroup>
      )}

      <OptionSheet
        visible={!!actionsFor}
        title={actionsFor?.description || actionsFor?.url || t("settings.webhooks.actions")}
        options={[
          { value: "test", label: t("settings.webhooks.sendTest") },
          ...(actionsFor && !actionsFor.isEnabled ? [{ value: "enable", label: t("settings.webhooks.enable") }] : []),
          { value: "edit", label: t("settings.webhooks.edit") },
          { value: "delete", label: t("settings.webhooks.delete") },
        ]}
        selected={[]}
        onSelect={runAction}
        onClose={() => setActionsFor(null)}
      />
    </Screen>
  );
}
