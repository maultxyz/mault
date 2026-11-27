import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, Image, View } from "react-native";
import { piHostScanControls } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { Skeleton } from "@/components/ui/skeleton";
import { Surface } from "@/components/ui/surface";
import { SwitchRow } from "@/components/ui/switch-row";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { useRaspberryPiCamera } from "@/features/raspberry-pis/api/use-raspberry-pi-camera";
import { useRaspberryPiScan } from "@/features/raspberry-pis/api/use-raspberry-pis";
import { RaspberryPiUpdateStatus } from "@/features/raspberry-pis/components/raspberry-pi-update-status";
import { useActiveOrgId } from "@/hooks/use-org";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import {
  RASPBERRY_PI_CAMERA_PLACEHOLDER_HEIGHT,
  RASPBERRY_PI_RENAME_ROUTE,
  RASPBERRY_PI_START_ROUTE,
  RASPBERRY_PI_STATUS_TONES,
} from "@/lib/constants/raspberry-pis";
import { formatShortDate } from "@/lib/dates";
import type { RaspberryPiCardProps } from "@/lib/interfaces/raspberry-pis";

export function RaspberryPiCard({ host, canManage, onRemove }: RaspberryPiCardProps) {
  const { t, i18n } = useTranslation();
  const { data: collections = [] } = useQuery(collectionsQueryOptions(useActiveOrgId()));
  const scan = useRaspberryPiScan(host.guid);
  const controls = piHostScanControls(host);
  const scanState = host.scanState;
  const statusLabel = t(`settings.raspberryPis.status.${controls.statusKey}`);
  const [isWatchingCamera, setIsWatchingCamera] = useState(false);
  const camera = useRaspberryPiCamera(host.guid, isWatchingCamera && host.connected);
  const announcedStatus = useRef(statusLabel);
  const isActive = controls.canPause || controls.canResume;
  const collectionName = (guid: string | null | undefined) =>
    collections.find((collection) => collection.guid === guid)?.name ?? "";
  const showsProgress = !!scanState && controls.statusKey !== "offline" && controls.statusKey !== "idle";

  useEffect(() => {
    if (announcedStatus.current === statusLabel) return;
    announcedStatus.current = statusLabel;
    AccessibilityInfo.announceForAccessibility(`${host.name}: ${statusLabel}`);
  }, [host.name, statusLabel]);

  return (
    <Surface>
      <View style={{ gap: SPACING.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>
          <View style={{ flex: 1, gap: SPACING.xs }}>
            <AppText weight="semibold" numberOfLines={1}>
              {host.name}
            </AppText>
            <AppText size="xs" tone="secondary">
              {[
                t("settings.raspberryPis.linkedOn", { date: formatShortDate(host.pairedAt, i18n.language) }),
                host.lastSeenAt
                  ? t("settings.raspberryPis.lastSeen", { date: formatShortDate(host.lastSeenAt, i18n.language) })
                  : null,
                host.update?.installedVersion
                  ? t("settings.raspberryPis.version", { version: host.update.installedVersion })
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </AppText>
          </View>
          <View accessibilityLiveRegion="polite">
            <Pill label={statusLabel} tone={RASPBERRY_PI_STATUS_TONES[controls.statusKey]} />
          </View>
        </View>

        {controls.statusKey === "offline" ? (
          <AppText size="sm" tone="secondary">
            {t("settings.raspberryPis.offlineHint")}
          </AppText>
        ) : null}

        <RaspberryPiUpdateStatus host={host} canManage={canManage} />

        {showsProgress ? (
          <View style={{ gap: SPACING.xs }}>
            <AppText size="sm" tone="secondary">
              {t("settings.raspberryPis.progress", {
                count: scanState.cardsScanned,
                collection: collectionName(scanState.collectionGuid),
              })}
            </AppText>
            {scanState.lastCard?.name ? (
              <AppText size="sm" tone="secondary" numberOfLines={1}>
                {t("settings.raspberryPis.lastCard", { name: scanState.lastCard.name })}
              </AppText>
            ) : null}
            {scanState.message ? <AppText size="sm">{scanState.message}</AppText> : null}
          </View>
        ) : null}

        {isWatchingCamera && host.connected ? (
          camera.isUnavailable ? (
            <AppText size="sm" tone="secondary" accessibilityRole="alert">
              {t("settings.raspberryPis.cameraUnavailable")}
            </AppText>
          ) : camera.frame ? (
            <Image
              source={{ uri: camera.frame }}
              accessibilityLabel={t("settings.raspberryPis.cameraAlt", { name: host.name })}
              resizeMode="contain"
              style={{ width: "100%", aspectRatio: 16 / 9, borderRadius: RADIUS.md }}
            />
          ) : (
            <View accessibilityLabel={t("settings.raspberryPis.cameraWaiting")} accessible>
              <Skeleton height={RASPBERRY_PI_CAMERA_PLACEHOLDER_HEIGHT} radius={RADIUS.md} />
            </View>
          )
        ) : null}

        {isActive && scanState ? (
          <SwitchRow
            title={t("settings.raspberryPis.autoFeedLabel")}
            value={scanState.autoFeed}
            disabled={scan.isPending}
            onValueChange={(autoFeed) => scan.mutate({ kind: "settings", body: { autoFeed } })}
          />
        ) : null}

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
          {controls.canStart ? (
            <Button
              icon="play"
              label={t("settings.raspberryPis.start")}
              onPress={() => router.push({ pathname: RASPBERRY_PI_START_ROUTE, params: { guid: host.guid } })}
            />
          ) : null}
          {controls.canPause ? (
            <Button
              variant="secondary"
              icon="pause"
              label={t("settings.raspberryPis.pause")}
              disabled={scan.isPending}
              onPress={() => scan.mutate({ kind: "action", action: "pause" })}
            />
          ) : null}
          {controls.canResume ? (
            <Button
              variant="secondary"
              icon="play"
              label={t("settings.raspberryPis.resume")}
              disabled={scan.isPending}
              onPress={() => scan.mutate({ kind: "action", action: "resume" })}
            />
          ) : null}
          {controls.canPause && scanState && !scanState.autoFeed ? (
            <Button
              variant="secondary"
              icon="arrowRight"
              label={t("settings.raspberryPis.feed")}
              disabled={scan.isPending}
              onPress={() => scan.mutate({ kind: "action", action: "feed" })}
            />
          ) : null}
          {controls.canStop ? (
            <Button
              variant="secondary"
              icon="stop"
              label={t("settings.raspberryPis.stop")}
              disabled={scan.isPending}
              onPress={() => scan.mutate({ kind: "stop" })}
            />
          ) : null}
          {controls.canEmergencyStop ? (
            <Button
              variant="destructive"
              icon="handStop"
              label={t("settings.raspberryPis.emergencyStop")}
              onPress={() => scan.mutate({ kind: "action", action: "emergency-stop" })}
            />
          ) : null}
          {host.connected ? (
            <Button
              variant={isWatchingCamera ? "primary" : "secondary"}
              icon="camera"
              label={t(isWatchingCamera ? "settings.raspberryPis.cameraHide" : "settings.raspberryPis.cameraShow")}
              onPress={() => setIsWatchingCamera((watching) => !watching)}
            />
          ) : null}
        </View>

        {canManage ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
            <Button
              variant="ghost"
              icon="edit"
              label={t("settings.raspberryPis.rename")}
              onPress={() => router.push({ pathname: RASPBERRY_PI_RENAME_ROUTE, params: { guid: host.guid } })}
            />
            <Button variant="ghost" icon="trash" label={t("settings.raspberryPis.remove")} onPress={() => onRemove(host)} />
          </View>
        ) : null}
      </View>
    </Surface>
  );
}
