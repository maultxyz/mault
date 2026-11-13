import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import type { OrgApiKey } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { apiKeysQueryOptions, revokeApiKey } from "@/features/integrations/api/api-keys";
import { billingQueryOptions } from "@/features/org/api/billing";
import { SettingsPage } from "@/features/settings/components/settings-page";
import { useActiveOrg } from "@/hooks/use-org";
import { formatShortDate } from "@/lib/dates";

export default function ApiKeysSettingsScreen() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const org = useActiveOrg();
  const orgId = org?.id ?? null;
  const keys = useQuery(apiKeysQueryOptions(orgId));
  const { data: billing } = useQuery(billingQueryOptions(orgId));
  const locked = billing?.apiAccess === false;
  const canManage = keys.data?.canManage ?? false;
  const canCreate = canManage && !locked;
  const apiKeys = keys.data?.keys ?? [];
  const revoke = useMutation({
    mutationFn: revokeApiKey,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["api-keys", orgId] }),
  });

  const confirmRevoke = (apiKey: OrgApiKey) =>
    Alert.alert(t("settings.apiKeys.revokeConfirmTitle"), t("settings.apiKeys.revokeConfirmDescription"), [
      { text: t("settings.apiKeys.cancel"), style: "cancel" },
      { text: t("settings.apiKeys.revoke"), style: "destructive", onPress: () => revoke.mutate(apiKey.guid) },
    ]);

  return (
    <SettingsPage
      title={t("settings.apiKeys.heading")}
      isLoading={keys.isLoading}
      refreshing={keys.isRefetching}
      onRefresh={() => void keys.refetch()}
    >
      <AppText size="sm" tone="secondary">
        {t("settings.apiKeys.description")}
      </AppText>
      {locked ? <Callout tone="info" title={t("settings.apiKeys.upgrade")} /> : null}
      {!locked && keys.data && !canManage ? <Callout tone="info" title={t("settings.apiKeys.managersOnly")} /> : null}
      {keys.isError ? <Callout tone="destructive" title={t("settings.apiKeys.loadFailed")} /> : null}
      {revoke.isError ? <Callout tone="destructive" title={t("settings.apiKeys.revokeFailed")} /> : null}

      {keys.data && apiKeys.length === 0 ? <EmptyState icon="key" title={t("settings.apiKeys.empty")} /> : null}

      {apiKeys.length > 0 || canCreate ? (
        <ListGroup>
          {apiKeys.map((apiKey) => (
            <ListRow
              key={apiKey.guid}
              icon="key"
              title={`${apiKey.name} · ${apiKey.keyPrefix}…`}
              subtitle={[
                apiKey.scope === "read_write" ? t("settings.apiKeys.readWrite") : t("settings.apiKeys.readOnly"),
                t("settings.apiKeys.createdBy", { name: apiKey.createdBy, date: formatShortDate(apiKey.createdAt, i18n.language) }),
                apiKey.lastUsedAt
                  ? t("settings.apiKeys.lastUsed", { date: formatShortDate(apiKey.lastUsedAt, i18n.language) })
                  : t("settings.apiKeys.neverUsed"),
              ].join("\n")}
              subtitleNumberOfLines={3}
              disabled={revoke.isPending && revoke.variables === apiKey.guid}
              onPress={canManage ? () => confirmRevoke(apiKey) : undefined}
              onLongPress={canManage ? () => confirmRevoke(apiKey) : undefined}
              longPressLabel={canManage ? t("settings.apiKeys.revoke") : undefined}
            />
          ))}
          {canCreate ? (
            <ListRow icon="plus" title={t("settings.apiKeys.create")} onPress={() => router.push("/settings/api-key-new")} />
          ) : null}
        </ListGroup>
      ) : null}
    </SettingsPage>
  );
}
