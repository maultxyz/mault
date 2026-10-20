import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { PageHeader } from "@/components/ui/page-header";
import { Pill } from "@/components/ui/pill";
import { Screen } from "@/components/ui/screen";
import { SectionHeader } from "@/components/ui/section-header";
import { useSorter } from "@/features/sorter/api/use-sorter";
import { useWifiSorters } from "@/features/sorter/api/use-wifi-sorters";
import { CommLog } from "@/features/sorter/components/comm-log";
import { useTheme } from "@/hooks/use-theme";
import { BUSY_PHASES, PHASE_TONES } from "@/lib/constants/sorter";
import { SPACING } from "@/lib/constants/theme";

export default function SorterScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const sorter = useSorter();
  const [showLog, setShowLog] = useState(false);
  const busy = (BUSY_PHASES as readonly string[]).includes(sorter.phase);
  const connected = sorter.isConnected;
  const wifiSorters = useWifiSorters(!connected);

  return (
    <Screen
      header={
        <PageHeader
          title={sorter.device?.name ?? t("tabs.sorter")}
          onBack={() => router.back()}
          subtitle={
            sorter.firmwareVersion
              ? t("sorter.firmware", { version: sorter.firmwareVersion, board: sorter.board ?? "?" })
              : null
          }
          actions={
            <>
              {busy ? <ActivityIndicator size="small" color={colors.primaryText} /> : null}
              <Pill tone={PHASE_TONES[sorter.phase]} label={t(`sorter.phase.${sorter.phase}`)} />
            </>
          }
        />
      }
    >
      {!connected && !sorter.error ? <AppText tone="secondary">{t("sorter.connectHint")}</AppText> : null}

      {sorter.error ? (
        <Callout
          tone="destructive"
          title={t(`sorter.errors.${sorter.error.code}.title`)}
          description={
            sorter.error.code === "sensor-blocked" && sorter.sensorNote
              ? t(`sorter.sensorBlocked.${sorter.sensorNote}`, { module: sorter.error.module })
              : t(`sorter.errors.${sorter.error.code}.description`, {
                  module: sorter.error.module,
                  detail: sorter.error.detail ?? "",
                })
          }
        />
      ) : null}
      {sorter.error?.code === "sensor-blocked" && connected ? (
        <View style={{ flexDirection: "row", gap: SPACING.sm }}>
          <Button
            style={{ flex: 1 }}
            variant="secondary"
            icon="arrowDown"
            label={t("sorter.sensorBlocked.dropCard")}
            loading={sorter.clearingSensor}
            onPress={() => void sorter.dropBlockedCard()}
          />
          <Button
            style={{ flex: 1 }}
            icon="check"
            label={t("sorter.sensorBlocked.markCleared")}
            disabled={sorter.clearingSensor}
            onPress={() => void sorter.markSensorCleared()}
          />
        </View>
      ) : null}

      {sorter.notice ? (
        <Callout
          tone="warning"
          title={t("sorter.restarted.title")}
          description={t("sorter.restarted.description", {
            reason: t(`sorter.resetReasons.${sorter.notice.reason}`),
          })}
          action={<Button size="sm" variant="ghost" label={t("common.dismiss")} onPress={sorter.dismissNotice} />}
        />
      ) : null}

      {connected ? (
        <>
          <Button
            size="lg"
            icon="selfTest"
            label={t("sorter.runSelfTest")}
            disabled={busy}
            onPress={() => void sorter.runSelfTest()}
          />
          <ListGroup>
            <ListRow
              icon="sorter"
              title={t("calibration.entryTitle")}
              subtitle={t("calibration.entrySubtitle")}
              onPress={() => router.push("/calibrate")}
            />
            <ListRow
              icon="refresh"
              title={t("sorter.neutral")}
              disabled={!sorter.isReady}
              onPress={() => void sorter.sendNeutral()}
            />
            <ListRow
              icon="arrowDown"
              title={t("sorter.dropCard")}
              disabled={!sorter.isReady}
              onPress={() => void sorter.clearDevice()}
            />
            <ListRow
              icon="close"
              tone="destructive"
              title={t("sorter.disconnect")}
              onPress={() => void sorter.disconnect()}
            />
          </ListGroup>
        </>
      ) : (
        <>
          <Button
            size="lg"
            icon="bluetooth"
            label={sorter.phase === "scanning" ? t("sorter.stopSearching") : t("sorter.findSorters")}
            loading={busy && sorter.phase !== "scanning"}
            onPress={sorter.phase === "scanning" ? sorter.stopDiscovery : sorter.startDiscovery}
          />
          <View style={{ gap: SPACING.sm }}>
            <SectionHeader title={t("sorter.nearby")} />
            {sorter.discovered.length === 0 ? (
              <EmptyState
                icon="bluetooth"
                title={sorter.phase === "scanning" ? t("sorter.searching") : t("sorter.noneFound")}
                description={t("sorter.bluetoothOnly")}
              />
            ) : (
              <ListGroup>
                {sorter.discovered.map((found) => (
                  <ListRow
                    key={found.id}
                    icon="sorter"
                    title={found.name ?? t("sorter.unnamed")}
                    subtitle={found.rssi != null ? t("sorter.signal", { rssi: found.rssi }) : undefined}
                    onPress={() => void sorter.connect(found.id)}
                  />
                ))}
              </ListGroup>
            )}
          </View>
          {wifiSorters.length > 0 ? (
            <View style={{ gap: SPACING.sm }}>
              <SectionHeader title={t("sorter.overWifi")} />
              <ListGroup>
                {wifiSorters.map((wifi) => (
                  <ListRow
                    key={wifi.guid}
                    icon="wifi"
                    title={wifi.name}
                    subtitle={t(`sorter.wifiStatus.${!wifi.online ? "offline" : wifi.inUse ? "inUse" : "online"}`)}
                    disabled={busy || !wifi.online || wifi.inUse}
                    onPress={() => void sorter.connectCloud(wifi.guid)}
                  />
                ))}
              </ListGroup>
            </View>
          ) : null}
        </>
      )}

      <View style={{ gap: SPACING.sm }}>
        <SectionHeader
          title={t("sorter.commLog")}
          action={
            <Button
              size="sm"
              variant="ghost"
              label={showLog ? t("common.hide") : t("common.show")}
              onPress={() => setShowLog((value) => !value)}
            />
          }
        />
        {showLog ? <CommLog entries={sorter.commLog} /> : null}
      </View>
    </Screen>
  );
}
