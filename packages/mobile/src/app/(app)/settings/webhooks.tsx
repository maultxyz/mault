import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, View } from "react-native";
import type { WebhookEndpoint } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { OptionSheet } from "@/components/ui/option-sheet";
import { deleteWebhook, enableWebhook, testWebhook, webhooksQueryOptions } from "@/features/integrations/api/webhooks";
import { billingQueryOptions } from "@/features/org/api/billing";
import { SettingsPage } from "@/features/settings/components/settings-page";
import { useActiveOrg } from "@/hooks/use-org";
import { SPACING } from "@/lib/constants/theme";
import { formatShortDate } from "@/lib/dates";
import type { SettingsNotice } from "@/lib/interfaces/settings";

export default function WebhooksSettingsScreen() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const org = useActiveOrg();
  const orgId = org?.id ?? null;
  const list = useQuery(webhooksQueryOptions(orgId));
  const { data: billing } = useQuery(billingQueryOptions(orgId));
  const locked = billing?.apiAccess === false;
  const canManage = list.data?.canManage ?? false;
  const canAdd = canManage && !locked;
  const endpoints = list.data?.endpoints ?? [];
  const [actionsFor, setActionsFor] = useState<WebhookEndpoint | null>(null);
  const [notice, setNotice] = useState<SettingsNotice | null>(null);
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["webhooks", orgId] });
  const fail = (err: Error) => setNotice({ tone: "destructive", text: err.message });

  const test = useMutation({
    mutationFn: testWebhook,
    onSuccess: (result) =>
      setNotice(
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
    onSuccess: () => setNotice({ tone: "success", text: t("settings.webhooks.enabled") }),
    onSettled: invalidate,
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: deleteWebhook,
    onSuccess: () => setNotice({ tone: "success", text: t("settings.webhooks.deleted") }),
    onSettled: invalidate,
    onError: fail,
  });

  const openEditor = (endpoint?: WebhookEndpoint) => {
    setNotice(null);
    router.push({ pathname: "/settings/webhook-edit", params: endpoint ? { guid: endpoint.guid } : {} });
  };

  const runAction = (action: string) => {
    const endpoint = actionsFor;
    setActionsFor(null);
    if (!endpoint) return;
    if (action === "test") test.mutate(endpoint.guid);
    else if (action === "enable") enable.mutate(endpoint.guid);
    else if (action === "edit") openEditor(endpoint);
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
    <SettingsPage
      title={t("settings.webhooks.heading")}
      isLoading={list.isLoading}
      refreshing={list.isRefetching}
      onRefresh={() => void list.refetch()}
    >
      <AppText size="sm" tone="secondary">
        {t("settings.webhooks.description")}
      </AppText>
      {locked ? <Callout tone="info" title={t("settings.webhooks.upgrade")} /> : null}
      {!locked && list.data && !canManage ? <Callout tone="info" title={t("settings.webhooks.managersOnly")} /> : null}
      {list.isError ? <Callout tone="destructive" title={t("settings.webhooks.loadFailed")} /> : null}
      {notice ? <Callout tone={notice.tone} title={notice.text} /> : null}

      {list.data && endpoints.length === 0 ? <EmptyState icon="external" title={t("settings.webhooks.empty")} /> : null}

      {endpoints.length > 0 || canAdd ? (
        <View style={{ gap: SPACING.sm }}>
          <ListGroup>
            {endpoints.map((endpoint) => (
              <ListRow
                key={endpoint.guid}
                icon="external"
                title={endpoint.description || endpoint.url}
                subtitle={[endpoint.description ? endpoint.url : null, statusLine(endpoint)].filter(Boolean).join("\n")}
                subtitleNumberOfLines={3}
                tone={endpoint.isEnabled ? "default" : "destructive"}
                disabled={!canManage}
                onPress={canManage ? () => openEditor(endpoint) : undefined}
                onLongPress={canManage ? () => setActionsFor(endpoint) : undefined}
                longPressLabel={canManage ? t("settings.webhooks.actions") : undefined}
              />
            ))}
            {canAdd ? <ListRow icon="plus" title={t("settings.webhooks.add")} onPress={() => openEditor()} /> : null}
          </ListGroup>
        </View>
      ) : null}

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
    </SettingsPage>
  );
}
