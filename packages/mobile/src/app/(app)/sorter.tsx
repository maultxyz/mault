import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isFirmwareFeatureSupported } from "@magic-vault/shared";
import { router, useIsFocused } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, Alert, Linking, View } from "react-native";
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
import { LoadingLogo } from "@/components/ui/loading-logo";
import { LOADING_LOGO_INLINE_SIZE } from "@/lib/constants/loading";
import { IconButton } from "@/components/ui/icon-button";
import { useToast } from "@/components/ui/toast-provider";
import { deleteDevice, devicesQueryOptions } from "@/features/devices/api/devices";
import { useActiveOrgId } from "@/hooks/use-org";
import { useRetractCard } from "@/features/sorter/api/use-retract-card";
import { useSorter } from "@/features/sorter/api/use-sorter";
import { useWifiSorters } from "@/features/sorter/api/use-wifi-sorters";
import { CommLog } from "@/features/sorter/components/comm-log";
import { signalStrengthOf } from "@/features/sorter/lib/signal-strength";
import { BUSY_PHASES, PHASE_TONES } from "@/lib/constants/sorter";
import { SPACING } from "@/lib/constants/theme";
import { MIN_TOUCH_TARGET } from "@/lib/constants/ui";
import type { ManualSorterCommand } from "@/lib/interfaces/sorter";

export default function SorterScreen() {
  const { t } = useTranslation();
  const sorter = useSorter();
  const retract = useRetractCard();
  const [showLog, setShowLog] = useState(false);
  const busy = (BUSY_PHASES as readonly string[]).includes(sorter.phase);
  const connected = sorter.isConnected;
  const wifiSorters = useWifiSorters(!connected);
  const recentIds = new Set(sorter.recentSorters.map((recent) => recent.id));
  const nearbySorters = sorter.discovered.filter((found) => !recentIds.has(found.id));
  const orgId = useActiveOrgId();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const savedSorters = useQuery(devicesQueryOptions(orgId));
  const removeSorter = useMutation({
    mutationFn: deleteDevice,
    onSuccess: () => showToast({ message: t("sorter.saved.deleted"), tone: "success" }),
    onError: () => showToast({ message: t("sorter.saved.deleteFailed"), tone: "destructive" }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["devices"] }),
  });
  const isFocused = useIsFocused();
  const hasStartedDiscoveryRef = useRef(false);
  const [hasSearchedForSorters, setHasSearchedForSorters] = useState(false);
  const { phase: sorterPhase, error: sorterError, startDiscovery } = sorter;
  useEffect(() => {
    if (sorterPhase === "scanning") setHasSearchedForSorters(true);
  }, [sorterPhase]);
  useEffect(() => {
    if (!isFocused) {
      hasStartedDiscoveryRef.current = false;
      return;
    }
    if (hasStartedDiscoveryRef.current || connected || sorterPhase !== "idle" || sorterError) return;
    hasStartedDiscoveryRef.current = true;
    startDiscovery();
  }, [isFocused, connected, sorterPhase, sorterError, startDiscovery]);
  const canEmergencyStop = isFirmwareFeatureSupported(sorter.firmwareVersion, "emergencyStop");
  const stopSelfTest = () => {
    AccessibilityInfo.announceForAccessibility(t("scan.pause.emergency-stop.title"));
    void sorter.sendEmergencyStop();
  };
  const needsSetup = connected && !!sorter.device && !sorter.device.setupCompletedAt;
  const [isCompletingSetup, setIsCompletingSetup] = useState(false);
  const [setupCompletionFailed, setSetupCompletionFailed] = useState(false);
  const completeSetup = async () => {
    setIsCompletingSetup(true);
    setSetupCompletionFailed(false);
    try {
      setSetupCompletionFailed(!(await sorter.completeSetup()));
    } finally {
      setIsCompletingSetup(false);
    }
  };
  const [runningManualCommand, setRunningManualCommand] = useState<ManualSorterCommand | null>(null);
  const runManualCommand = async (command: ManualSorterCommand) => {
    setRunningManualCommand(command);
    try {
      const succeeded = command === "neutral" ? await sorter.sendNeutral() : await sorter.dropCard();
      showToast({
        message: succeeded ? t(`sorter.manual.${command}Done`) : t("sorter.manual.noResponse"),
        tone: succeeded ? "success" : "destructive",
      });
    } finally {
      setRunningManualCommand(null);
    }
  };
  const signalLabel = (rssi: number | null | undefined) =>
    rssi != null ? t(`sorter.signalStrength.${signalStrengthOf(rssi)}`) : undefined;
  const confirmRemoveSorter = (guid: string, name: string) =>
    Alert.alert(t("sorter.saved.deleteTitle", { name }), t("sorter.saved.deleteDescription"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("sorter.saved.delete"), style: "destructive", onPress: () => removeSorter.mutate(guid) },
    ]);

  return (
    <Screen
      header={
        <PageHeader
          title={sorter.device?.name ?? t("tabs.sorter")}
          onBack={() => router.back()}
        />
      }
    >
      <View
        accessibilityLiveRegion="polite"
        style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: SPACING.sm }}
      >
        <Pill tone={PHASE_TONES[sorter.phase]} label={t(`sorter.phase.${sorter.phase}`)} />
        {busy ? <LoadingLogo size={LOADING_LOGO_INLINE_SIZE} accessibilityLabel={t("common.loading")} /> : null}
        {sorter.firmwareVersion ? (
          <AppText size="xs" tone="secondary">
            {t("sorter.firmware", { version: sorter.firmwareVersion, board: sorter.board ?? "?" })}
          </AppText>
        ) : null}
      </View>
      {!connected && !sorter.error ? <AppText tone="secondary">{t("sorter.connectHint")}</AppText> : null}

      {sorter.error && !(sorter.error.code === "setup-incomplete" && needsSetup) ? (
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
          action={
            sorter.error.code === "bluetooth-unauthorized" ? (
              <Button
                size="sm"
                variant="secondary"
                label={t("common.openSettings")}
                onPress={() => void Linking.openSettings()}
              />
            ) : undefined
          }
        />
      ) : null}
      {needsSetup ? (
        <Callout
          tone="warning"
          title={t("sorter.setup.title")}
          description={setupCompletionFailed ? t("sorter.setup.failed") : t("sorter.setup.description")}
          action={
            <Button
              size="sm"
              variant="secondary"
              icon="check"
              label={t("sorter.setup.finish")}
              loading={isCompletingSetup}
              disabled={busy}
              onPress={() => void completeSetup()}
            />
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
      {(sorter.error?.code === "emergency-stopped" || sorter.error?.code === "emergency-stop-reset-failed") &&
      connected ? (
        <Button
          icon="refresh"
          label={t("sorter.resetEmergencyStop")}
          loading={sorter.resettingEmergencyStop}
          onPress={() => void sorter.resetEmergencyStop()}
        />
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
          {sorter.phase === "testing" && canEmergencyStop ? (
            <Button
              size="lg"
              variant="destructive"
              icon="handStop"
              label={t("scan.emergencyStop")}
              accessibilityHint={t("scan.emergencyStopHint")}
              onPress={stopSelfTest}
            />
          ) : (
            <Button
              size="lg"
              icon="selfTest"
              label={t("sorter.runSelfTest")}
              disabled={busy}
              onPress={() => void sorter.runSelfTest()}
            />
          )}
          <ListGroup>
            <ListRow
              icon="sorter"
              title={t("calibration.entryTitle")}
              subtitle={t("calibration.entrySubtitle")}
              onPress={() => router.push("/calibrate")}
            />
            <ListRow icon="rules" title={t("rules.title")} onPress={() => router.push("/rules")} />
            {sorter.hasWifi || sorter.board === "esp32" ? (
              <ListRow
                icon="wifi"
                title={t("sorterWifi.title")}
                subtitle={sorter.isCloudConnection ? t("sorterWifi.changeOverLocal") : undefined}
                onPress={() => router.push("/sorter-wifi")}
              />
            ) : null}
            <ListRow
              icon="edit"
              title={t("sorter.rename.title")}
              onPress={() => router.push({ pathname: "/sorter-name", params: { guid: sorter.device?.guid ?? "" } })}
            />
            <ListRow
              icon="refresh"
              title={t("sorter.neutral")}
              disabled={!sorter.isReady || runningManualCommand !== null}
              onPress={() => void runManualCommand("neutral")}
            />
            <ListRow
              icon="arrowDown"
              title={t("sorter.dropCard")}
              disabled={!sorter.isReady || runningManualCommand !== null}
              onPress={() => void runManualCommand("drop")}
            />
            <ListRow
              icon="arrowUp"
              title={t("sorter.retractCard")}
              subtitle={retract.retractLockedReason ?? undefined}
              disabled={!sorter.isReady || retract.isRetracting || retract.retractLockedReason !== null}
              onPress={() => void retract.retractCard()}
            />
          </ListGroup>
          <ListGroup>
            <ListRow icon="close" tone="destructive" title={t("sorter.disconnect")} onPress={() => void sorter.disconnect()} />
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
          {sorter.recentSorters.length > 0 ? (
            <View style={{ gap: SPACING.sm }}>
              <SectionHeader title={t("sorter.recent")} />
              <ListGroup>
                {sorter.recentSorters.map((recent) => {
                  const nearby = sorter.discovered.find((found) => found.id === recent.id);
                  return (
                    <ListRow
                      key={recent.id}
                      icon="sorter"
                      title={recent.name}
                      subtitle={signalLabel(nearby?.rssi)}
                      disabled={busy && sorter.phase !== "scanning"}
                      onPress={() => void sorter.connect(recent.id)}
                    />
                  );
                })}
              </ListGroup>
            </View>
          ) : null}
          {nearbySorters.length > 0 || sorter.recentSorters.length === 0 ? (
            <View style={{ gap: SPACING.sm }}>
              <SectionHeader title={t("sorter.nearby")} />
              {nearbySorters.length === 0 ? (
                <EmptyState
                  icon="bluetooth"
                  title={
                    sorter.phase === "scanning"
                      ? t("sorter.searching")
                      : hasSearchedForSorters
                        ? t("sorter.noneFound")
                        : t("sorter.notSearchedYet")
                  }
                  description={t("sorter.bluetoothOnly")}
                />
              ) : (
                <ListGroup>
                  {nearbySorters.map((found) => (
                    <ListRow
                      key={found.id}
                      icon="sorter"
                      title={found.name ?? t("sorter.unnamed")}
                      subtitle={signalLabel(found.rssi)}
                      onPress={() => void sorter.connect(found.id)}
                    />
                  ))}
                </ListGroup>
              )}
            </View>
          ) : null}
          {(savedSorters.data ?? []).length > 0 ? (
            <View style={{ gap: SPACING.sm }}>
              <SectionHeader title={t("sorter.saved.title")} />
              <ListGroup>
                {(savedSorters.data ?? []).map((saved) => (
                  <ListRow
                    key={saved.guid}
                    icon="sorter"
                    title={saved.name}
                    rightIsInteractive
                    right={
                      <View style={{ flexDirection: "row", gap: SPACING.sm }}>
                        <IconButton
                          icon="edit"
                          size={MIN_TOUCH_TARGET}
                          accessibilityLabel={t("sorter.saved.rename", { name: saved.name })}
                          onPress={() => router.push({ pathname: "/sorter-name", params: { guid: saved.guid } })}
                        />
                        <IconButton
                          icon="trash"
                          size={MIN_TOUCH_TARGET}
                          accessibilityLabel={t("sorter.saved.deleteTitle", { name: saved.name })}
                          disabled={removeSorter.isPending}
                          onPress={() => confirmRemoveSorter(saved.guid, saved.name)}
                        />
                      </View>
                    }
                  />
                ))}
              </ListGroup>
            </View>
          ) : null}
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
              accessibilityLabel={showLog ? t("sorter.hideCommLog") : t("sorter.showCommLog")}
              onPress={() => setShowLog((value) => !value)}
            />
          }
        />
        {showLog ? <CommLog /> : null}
      </View>
    </Screen>
  );
}
