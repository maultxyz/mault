import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, Alert } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Callout } from "@/components/ui/callout";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { useToast } from "@/components/ui/toast-provider";
import {
  disconnectStatsSync,
  revokeStatsSyncKey,
  runStatsSyncNow,
  statsSyncConnectionQueryOptions,
  statsSyncKeyQueryOptions,
} from "@/features/integrations/api/stats-sync";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { useActiveOrg } from "@/hooks/use-org";
import { AUTH_PROVIDER } from "@/lib/constants/config";
import { formatShortDate } from "@/lib/dates";

function StatsSyncKeySettingsSection() {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const orgId = useActiveOrg()?.id ?? null;
  const keyOptions = statsSyncKeyQueryOptions(orgId);
  const status = useQuery(keyOptions);
  const revoke = useMutation({
    mutationFn: revokeStatsSyncKey,
    onSuccess: (next) => {
      queryClient.setQueryData(keyOptions.queryKey, next);
      showToast({ message: t("settings.statsSync.key.revoked"), tone: "success" });
    },
    onError: () => showToast({ message: t("settings.statsSync.key.revokeFailed"), tone: "destructive" }),
  });
  const key = status.data?.key ?? null;
  const canManage = status.data?.canManage ?? false;

  const showKeyActions = () =>
    Alert.alert(t("settings.statsSync.key.actionsTitle"), undefined, [
      { text: t("settings.statsSync.key.regenerate"), onPress: () => router.push("/settings/stats-sync-key-new") },
      {
        text: t("settings.statsSync.key.revoke"),
        style: "destructive",
        onPress: () =>
          Alert.alert(t("settings.statsSync.key.revokeConfirmTitle"), t("settings.statsSync.key.revokeConfirmDescription"), [
            { text: t("settings.statsSync.cancel"), style: "cancel" },
            { text: t("settings.statsSync.key.revoke"), style: "destructive", onPress: () => revoke.mutate() },
          ]),
      },
      { text: t("settings.statsSync.cancel"), style: "cancel" },
    ]);

  return (
    <SettingsSection title={t("settings.statsSync.key.heading")} description={t("settings.statsSync.key.description")}>
      {status.isError ? <Callout tone="destructive" title={t("settings.statsSync.key.loadFailed")} /> : null}
      {status.data && !canManage ? <Callout tone="info" title={t("settings.statsSync.key.managersOnly")} /> : null}
      {status.data && !key && !canManage ? (
        <AppText size="sm" tone="secondary">
          {t("settings.statsSync.key.empty")}
        </AppText>
      ) : null}
      {status.data && (key || canManage) ? (
        <ListGroup>
          {key ? (
            <ListRow
              icon="key"
              title={`${key.keyPrefix}…`}
              subtitle={[
                t("settings.statsSync.key.createdBy", { name: key.createdBy, date: formatShortDate(key.createdAt, i18n.language) }),
                key.lastSyncedAt
                  ? t("settings.statsSync.key.lastSynced", { date: formatShortDate(key.lastSyncedAt, i18n.language) })
                  : t("settings.statsSync.key.neverSynced"),
                t("settings.statsSync.key.syncedScans", {
                  count: status.data.syncedScanCount,
                  formattedCount: status.data.syncedScanCount.toLocaleString(i18n.language),
                }),
              ].join("\n")}
              subtitleNumberOfLines={3}
              disabled={revoke.isPending}
              onPress={canManage ? showKeyActions : undefined}
              onLongPress={canManage ? showKeyActions : undefined}
              longPressLabel={canManage ? t("settings.statsSync.key.actionsTitle") : undefined}
            />
          ) : (
            <ListRow icon="plus" title={t("settings.statsSync.key.generate")} onPress={() => router.push("/settings/stats-sync-key-new")} />
          )}
        </ListGroup>
      ) : null}
    </SettingsSection>
  );
}

function StatsSyncConnectionSettingsSection() {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const orgId = useActiveOrg()?.id ?? null;
  const connectionOptions = statsSyncConnectionQueryOptions(orgId);
  const status = useQuery(connectionOptions);
  const syncNow = useMutation({
    mutationFn: runStatsSyncNow,
    onSuccess: (next) => {
      queryClient.setQueryData(connectionOptions.queryKey, next);
      AccessibilityInfo.announceForAccessibility(
        next.connection?.lastErrorCode
          ? t(`settings.statsSync.connection.errors.${next.connection.lastErrorCode}`)
          : t("settings.statsSync.connection.synced"),
      );
    },
    onError: () => showToast({ message: t("settings.statsSync.connection.syncFailed"), tone: "destructive" }),
  });
  const disconnect = useMutation({
    mutationFn: disconnectStatsSync,
    onSuccess: (next) => {
      queryClient.setQueryData(connectionOptions.queryKey, next);
      showToast({ message: t("settings.statsSync.connection.disconnected"), tone: "success" });
    },
    onError: () => showToast({ message: t("settings.statsSync.connection.disconnectFailed"), tone: "destructive" }),
  });
  const connection = status.data?.connection ?? null;
  const canManage = status.data?.canManage ?? false;

  const showConnectionActions = () =>
    Alert.alert(t("settings.statsSync.connection.actionsTitle"), undefined, [
      { text: t("settings.statsSync.connection.syncNow"), onPress: () => syncNow.mutate() },
      {
        text: t("settings.statsSync.connection.disconnect"),
        style: "destructive",
        onPress: () =>
          Alert.alert(
            t("settings.statsSync.connection.disconnectConfirmTitle"),
            t("settings.statsSync.connection.disconnectConfirmDescription"),
            [
              { text: t("settings.statsSync.cancel"), style: "cancel" },
              { text: t("settings.statsSync.connection.disconnect"), style: "destructive", onPress: () => disconnect.mutate() },
            ],
          ),
      },
      { text: t("settings.statsSync.cancel"), style: "cancel" },
    ]);

  return (
    <SettingsSection
      title={t("settings.statsSync.connection.heading")}
      description={t("settings.statsSync.connection.description", { url: status.data?.targetUrl ?? "" })}
    >
      {status.isError ? <Callout tone="destructive" title={t("settings.statsSync.connection.loadFailed")} /> : null}
      {status.data && !canManage ? <Callout tone="info" title={t("settings.statsSync.connection.managersOnly")} /> : null}
      {connection?.lastErrorCode ? (
        <Callout tone="destructive" title={t(`settings.statsSync.connection.errors.${connection.lastErrorCode}`)} />
      ) : null}
      {status.data && !connection && !canManage ? (
        <AppText size="sm" tone="secondary">
          {t("settings.statsSync.connection.notConnected")}
        </AppText>
      ) : null}
      {status.data && (connection || canManage) ? (
        <ListGroup>
          {connection ? (
            <ListRow
              icon={syncNow.isPending ? "refresh" : "upload"}
              title={`${connection.keyPrefix}…`}
              subtitle={[
                syncNow.isPending
                  ? t("settings.statsSync.connection.syncing")
                  : connection.lastSyncedAt
                    ? t("settings.statsSync.connection.lastSynced", { date: formatShortDate(connection.lastSyncedAt, i18n.language) })
                    : t("settings.statsSync.connection.neverSynced"),
                connection.syncedScanCount !== null
                  ? t("settings.statsSync.connection.syncedScans", {
                      count: connection.syncedScanCount,
                      formattedCount: connection.syncedScanCount.toLocaleString(i18n.language),
                    })
                  : null,
              ]
                .filter(Boolean)
                .join("\n")}
              subtitleNumberOfLines={2}
              disabled={syncNow.isPending || disconnect.isPending}
              onPress={canManage ? showConnectionActions : undefined}
              onLongPress={canManage ? showConnectionActions : undefined}
              longPressLabel={canManage ? t("settings.statsSync.connection.actionsTitle") : undefined}
            />
          ) : (
            <ListRow icon="plus" title={t("settings.statsSync.connection.connect")} onPress={() => router.push("/settings/stats-sync-connect")} />
          )}
        </ListGroup>
      ) : null}
    </SettingsSection>
  );
}

export function StatsSyncSettingsSection() {
  return AUTH_PROVIDER === "local" ? <StatsSyncConnectionSettingsSection /> : <StatsSyncKeySettingsSection />;
}
