import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Alert, View } from "react-native";
import type { PiHostSummary } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { useRaspberryPis } from "@/features/raspberry-pis/api/use-raspberry-pis";
import { RaspberryPiCard } from "@/features/raspberry-pis/components/raspberry-pi-card";
import { SettingsPage } from "@/features/settings/components/settings-page";
import { RASPBERRY_PI_LINK_ROUTE } from "@/lib/constants/raspberry-pis";
import { SPACING } from "@/lib/constants/theme";

export default function RaspberryPisSettingsScreen() {
  const { t } = useTranslation();
  const { query, remove } = useRaspberryPis();
  const hosts = query.data?.hosts ?? [];
  const canManage = query.data?.canManage ?? false;

  const confirmRemove = (host: PiHostSummary) =>
    Alert.alert(
      t("settings.raspberryPis.removeConfirmTitle", { name: host.name }),
      t("settings.raspberryPis.removeConfirmDescription"),
      [
        { text: t("settings.raspberryPis.cancel"), style: "cancel" },
        { text: t("settings.raspberryPis.remove"), style: "destructive", onPress: () => remove.mutate(host.guid) },
      ],
    );

  return (
    <SettingsPage
      title={t("settings.raspberryPis.heading")}
      isLoading={query.isLoading}
      isLoadError={query.isError && !query.data}
      isRetryingLoad={query.isRefetching}
      onRetryLoad={() => void query.refetch()}
      onRefresh={() => query.refetch()}
    >
      <AppText size="sm" tone="secondary">
        {t("settings.raspberryPis.description")}
      </AppText>
      {query.data && !canManage ? <Callout tone="info" title={t("settings.raspberryPis.managersOnly")} /> : null}
      {query.data && hosts.length === 0 ? (
        <EmptyState
          icon="sorter"
          title={t("settings.raspberryPis.empty")}
          description={t("settings.raspberryPis.emptyDescription")}
        />
      ) : null}
      {hosts.length > 0 ? (
        <View style={{ gap: SPACING.md }}>
          {hosts.map((host) => (
            <RaspberryPiCard key={host.guid} host={host} canManage={canManage} onRemove={confirmRemove} />
          ))}
        </View>
      ) : null}
      {canManage ? (
        <ListGroup>
          <ListRow icon="plus" title={t("settings.raspberryPis.link")} onPress={() => router.push(RASPBERRY_PI_LINK_ROUTE)} />
        </ListGroup>
      ) : null}
    </SettingsPage>
  );
}
