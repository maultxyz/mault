import { useQuery } from "@tanstack/react-query";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { router, useIsFocused } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DEFAULT_SCAN_REGION } from "@magic-vault/shared";
import {
  Camera,
  type CameraRef,
  useCameraDevice,
  useCameraPermission,
  usePhotoOutput,
} from "react-native-vision-camera";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Screen } from "@/components/ui/screen";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { useLiveCorners } from "@/features/scanner/api/use-live-corners";
import { useScanSession } from "@/features/scanner/api/use-scan-session";
import { CameraChip } from "@/features/scanner/components/camera-chip";
import { CameraNotice } from "@/features/scanner/components/camera-notice";
import { DetectedOutline } from "@/features/scanner/components/detected-outline";
import { LastScanCard } from "@/features/scanner/components/last-scan-card";
import { ScanRegionOverlay } from "@/features/scanner/components/scan-region-overlay";
import { ShutterButton } from "@/features/scanner/components/shutter-button";
import { captureFrame } from "@/features/scanner/lib/frame";
import { useSorter } from "@/features/sorter/api/use-sorter";
import { useAppState } from "@/hooks/use-app-state";
import { useActiveOrgId } from "@/hooks/use-org";
import { usePricing } from "@/hooks/use-pricing";
import { useTheme } from "@/hooks/use-theme";
import {
  CAMERA_ASPECT_RATIO,
  CAPTURE_TARGET_RESOLUTION,
  LIVE_DETECTION_PAUSED_PHASES,
  PAUSE_TONES,
  RUNNING_PHASES,
} from "@/lib/constants/scanner";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";

export default function ScanScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const pricing = usePricing();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const appState = useAppState();
  const sorter = useSorter();
  const { data: collections } = useQuery(collectionsQueryOptions(useActiveOrgId()));
  const collection = collections?.find((c) => c.isActive) ?? null;
  const permission = useCameraPermission();
  const device = useCameraDevice("back");
  const photoOutput = usePhotoOutput({
    targetResolution: CAPTURE_TARGET_RESOLUTION,
    qualityPrioritization: "speed",
  });
  const [frameAspect, setFrameAspect] = useState(CAMERA_ASPECT_RATIO);
  const capture = useCallback(async () => {
    const frame = await captureFrame(photoOutput);
    const { width, height } = frame.pixels;
    if (width > 0 && height > 0) setFrameAspect(Math.min(width, height) / Math.max(width, height));
    return frame;
  }, [photoOutput]);
  const session = useScanSession({ capture });
  const working = RUNNING_PHASES.includes(session.phase);
  const cameraRef = useRef<CameraRef>(null);
  const liveCorners = useLiveCorners(
    cameraRef,
    focused && appState === "active" && !!device && permission.hasPermission && !session.modelError,
    LIVE_DETECTION_PAUSED_PHASES.includes(session.phase),
  );
  const latest = session.feed[0] ?? null;
  const latestPrice = latest?.card ? pricing.priceOf(latest.card) : null;
  const phaseColor =
    session.phase === "error"
      ? colors.destructive
      : working
        ? colors.success
        : session.phase === "paused" || session.phase === "loading-models"
          ? colors.warning
          : colors.onCamera;
  const sorterColor = sorter.isReady ? colors.success : sorter.isConnected ? colors.warning : colors.destructive;
  const pauseNotice = session.phase === "paused" && session.pauseReason && session.pauseReason !== "user";

  useEffect(() => {
    if (!session.isRunning) return;
    void activateKeepAwakeAsync();
    return () => deactivateKeepAwake();
  }, [session.isRunning]);

  if (!permission.hasPermission) {
    return (
      <Screen header={<PageHeader title={t("tabs.scan")} />}>
        <EmptyState
          icon="camera"
          title={t("scan.cameraPermissionTitle")}
          description={t("scan.cameraPermissionDescription")}
          action={
            permission.canRequestPermission ? (
              <Button label={t("scan.allowCamera")} onPress={() => void permission.requestPermission()} />
            ) : (
              <AppText tone="secondary">{t("scan.cameraPermissionSettings")}</AppText>
            )
          }
        />
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.camera }}>
      {focused ? <StatusBar style="light" /> : null}
      {device ? (
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={focused && appState === "active"}
          outputs={[photoOutput]}
          resizeMode="cover"
          enableNativeTapToFocusGesture
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { justifyContent: "center" }]}>
          <EmptyState icon="camera" title={t("scan.noCamera")} />
        </View>
      )}
      {device ? (
        <ScanRegionOverlay
          region={sorter.device?.scanRegion ?? DEFAULT_SCAN_REGION}
          frameAspect={frameAspect}
          strokeColor={working ? colors.success : colors.onCamera}
        />
      ) : null}
      {liveCorners ? <DetectedOutline corners={liveCorners} color={colors.primary} /> : null}

      <View
        pointerEvents="box-none"
        style={{ paddingTop: insets.top + SPACING.md, paddingHorizontal: SCREEN_GUTTER, gap: SPACING.sm }}
      >
        <View pointerEvents="box-none" style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>
          <View style={{ flex: 1, minWidth: 0, alignItems: "flex-start" }}>
            <CameraChip
              icon="collections"
              label={collection ? collection.name : t("scan.chooseCollection")}
              onPress={() =>
                collection
                  ? router.push({ pathname: "/collection/[guid]", params: { guid: collection.guid } })
                  : router.navigate("/")
              }
            />
          </View>
          <CameraChip dotColor={phaseColor} label={t(`scan.phase.${session.phase}`)} />
        </View>
        <View pointerEvents="box-none" style={{ alignItems: "flex-start" }}>
          <CameraChip
            icon="sorter"
            dotColor={sorterColor}
            label={sorter.device?.name ? `${sorter.device.name} · ${t(`sorter.phase.${sorter.phase}`)}` : t("sorter.phase.idle")}
            onPress={() => router.push("/sorter")}
          />
        </View>
        {!collection ? (
          <CameraNotice
            tone="warning"
            title={t("scan.noCollectionTitle")}
            description={t("scan.noCollectionDescription")}
            actionLabel={t("scan.chooseCollection")}
            onAction={() => router.navigate("/")}
          />
        ) : null}
        {session.unsupportedMode ? (
          <CameraNotice
            tone="warning"
            title={t(`scan.unsupported.${session.unsupportedMode}.title`)}
            description={t(`scan.unsupported.${session.unsupportedMode}.description`)}
          />
        ) : null}
        {sorter.notice ? (
          <CameraNotice
            tone="warning"
            title={t("sorter.restarted.title")}
            description={t(`sorter.resetReasons.${sorter.notice.reason}`)}
            actionLabel={t("common.dismiss")}
            onAction={sorter.dismissNotice}
          />
        ) : null}
        {session.modelError ? (
          <CameraNotice tone="destructive" title={t("scan.modelErrorTitle")} description={session.modelError} />
        ) : null}
        {pauseNotice && session.pauseReason ? (
          <CameraNotice
            tone={PAUSE_TONES[session.pauseReason]}
            title={t(`scan.pause.${session.pauseReason}.title`)}
            description={t(`scan.pause.${session.pauseReason}.description`, { detail: session.pauseDetail ?? "" })}
          />
        ) : null}
      </View>

      <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
        <View
          pointerEvents="box-none"
          style={{ paddingHorizontal: SCREEN_GUTTER, paddingBottom: SPACING.lg, gap: SPACING.md }}
        >
          {latest ? (
            <LastScanCard entry={latest} priceLabel={latestPrice != null ? pricing.format(latestPrice) : null} />
          ) : null}
          {session.sessionCount > 0 && collection ? (
            <View style={{ alignItems: "center" }}>
              <CameraChip
                label={t("scan.sessionCount", { count: session.sessionCount })}
                onPress={() => router.push({ pathname: "/collection/[guid]", params: { guid: collection.guid } })}
              />
            </View>
          ) : null}
          <View style={{ alignItems: "center" }}>
            <ShutterButton
              running={session.isRunning}
              label={
                session.isRunning ? t("scan.pauseAction") : session.phase === "paused" ? t("scan.resume") : t("scan.start")
              }
              disabled={!session.isRunning && !session.canStart}
              onPress={
                session.isRunning ? session.pause : session.phase === "paused" ? session.resume : session.start
              }
            />
          </View>
        </View>
      </View>
    </View>
  );
}
