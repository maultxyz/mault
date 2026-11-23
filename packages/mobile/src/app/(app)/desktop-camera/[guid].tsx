import { useQuery } from "@tanstack/react-query";
import { useKeepAwake } from "expo-keep-awake";
import { router, useIsFocused, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, Alert, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Camera, type CameraRef, useCameraPermission, usePhotoOutput } from "react-native-vision-camera";
import { DEFAULT_SCAN_REGION, waitUntilCardSettles } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { useCameraChoice } from "@/features/scanner/api/use-camera-choice";
import { useCameraTorch } from "@/features/scanner/api/use-camera-torch";
import { CameraPermissionEmptyState } from "@/features/scanner/components/camera-permission-empty-state";
import { TorchBrightness } from "@/features/scanner/components/torch-brightness";
import { TorchToggle } from "@/features/scanner/components/torch-toggle";
import { usePhoneCameraResponder } from "@/features/scanner/api/use-phone-camera-responder";
import { CameraEmptyStateFrame } from "@/features/scanner/components/camera-empty-state-frame";
import { CameraChip } from "@/features/scanner/components/camera-chip";
import { ScanRegionOverlay } from "@/features/scanner/components/scan-region-overlay";
import { useLiveFrameSource } from "@/features/scanner/api/use-live-frame-source";
import { capturePhotoImage, imageToJpegTempFile } from "@/features/scanner/lib/frame";
import { detectCornersInImage, warmCornerDetector } from "@/features/scanner/lib/inference";
import { useSorter } from "@/features/sorter/api/use-sorter";
import { useAppState } from "@/hooks/use-app-state";
import { useActiveOrgId } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { CAPTURE_FLASH_MS, PHONE_CAMERA_JPEG_QUALITY } from "@/lib/constants/phone-camera";
import { CAMERA_ASPECT_RATIO, CAPTURE_TARGET_RESOLUTION } from "@/lib/constants/scanner";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import { useCameraMountReady } from "@/hooks/use-camera-mount-ready";
import type { PhoneCameraCaptureRequest } from "@/lib/interfaces/scanner";

export default function DesktopCameraScreen() {
  useKeepAwake();
  const { guid } = useLocalSearchParams<{ guid: string }>();
  const { t } = useTranslation();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const cameraMounted = useCameraMountReady(focused);
  const appState = useAppState();
  const sorter = useSorter();
  const permission = useCameraPermission();
  const camera = useCameraChoice();
  const cameraRef = useRef<CameraRef>(null);
  const device = camera.device;
  const torch = useCameraTorch(device, cameraRef);
  const { liveFrameOutput, grabLiveFrame } = useLiveFrameSource(cameraRef);
  const { data: collections } = useQuery(collectionsQueryOptions(useActiveOrgId()));
  const collection = collections?.find((c) => c.guid === guid);
  const photoOutput = usePhotoOutput({ targetResolution: CAPTURE_TARGET_RESOLUTION, qualityPrioritization: "speed" });
  const [flash, setFlash] = useState(false);
  const [frameAspect, setFrameAspect] = useState(CAMERA_ASPECT_RATIO);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = cameraMounted && appState === "active" && permission.hasPermission && !!device;

  const capture = useCallback(
    async ({ maxCardSettleWaitMs, isSuperseded }: PhoneCameraCaptureRequest) => {
      if (maxCardSettleWaitMs > 0) {
        await waitUntilCardSettles({
          observeCard: async () => {
            const image = await grabLiveFrame();
            const detection = await detectCornersInImage(image, image.width, image.height);
            return {
              cardPresent: detection.cardPresent,
              contour: detection.contour,
              frameLongSidePx: Math.max(image.width, image.height),
            };
          },
          maxWaitMs: maxCardSettleWaitMs,
          isCancelled: isSuperseded,
        });
        if (isSuperseded()) return null;
      }
      const { image } = await capturePhotoImage(photoOutput);
      const { width, height } = image;
      if (width > 0 && height > 0) setFrameAspect(Math.min(width, height) / Math.max(width, height));
      setFlash(true);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setFlash(false), CAPTURE_FLASH_MS);
      return imageToJpegTempFile(image, PHONE_CAMERA_JPEG_QUALITY);
    },
    [photoOutput, grabLiveFrame],
  );

  const responder = usePhoneCameraResponder({ collectionGuid: guid, enabled: active, capture });

  useEffect(() => {
    if (active) warmCornerDetector().catch(() => {});
  }, [active]);

  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!responder.sessionEnded) return;
    Alert.alert(t("phoneCamera.sessionEndedTitle"), t("phoneCamera.sessionEndedDescription"), [
      { text: t("phoneCamera.disconnect"), style: "destructive", onPress: () => router.back() },
    ]);
  }, [responder.sessionEnded, t]);

  const switchCamera = () => {
    const index = camera.devices.findIndex((d) => d.id === device?.id);
    const next = camera.devices[(index + 1) % camera.devices.length];
    if (next) camera.select(next.id);
  };

  const status = responder.connected ? t("phoneCamera.ready") : t("phoneCamera.connecting");
  const announcedStatusRef = useRef(status);
  useEffect(() => {
    if (announcedStatusRef.current === status) return;
    announcedStatusRef.current = status;
    AccessibilityInfo.announceForAccessibility(status);
  }, [status]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.camera }}>
      {focused ? <StatusBar style="light" /> : null}
      {!permission.hasPermission ? (
        <CameraEmptyStateFrame>
          <CameraPermissionEmptyState
            canRequestPermission={permission.canRequestPermission}
            onRequestPermission={() => void permission.requestPermission()}
          />
        </CameraEmptyStateFrame>
      ) : device ? (
        <>
          {cameraMounted ? (
            <Camera
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={active}
              outputs={[photoOutput, ...(liveFrameOutput ? [liveFrameOutput] : [])]}
              resizeMode="cover"
              enableNativeTapToFocusGesture
              onStarted={torch.onCameraStarted}
            />
          ) : null}
          <ScanRegionOverlay
            region={responder.scanRegion ?? sorter.device?.scanRegion ?? DEFAULT_SCAN_REGION}
            frameAspect={frameAspect}
            strokeColor={responder.connected ? colors.success : colors.onCamera}
          />
          {flash ? (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.onCamera, opacity: 0.6 }]} />
          ) : null}
        </>
      ) : (
        <CameraEmptyStateFrame>
          <EmptyState icon="camera" title={t("scan.noCamera")} />
        </CameraEmptyStateFrame>
      )}

      <View
        pointerEvents="box-none"
        style={{ paddingTop: insets.top + SPACING.md, paddingHorizontal: SCREEN_GUTTER, gap: SPACING.sm }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>
          <View style={{ flex: 1, minWidth: 0, alignItems: "flex-start" }}>
            <CameraChip
              icon="desktop"
              label={collection ? t("phoneCamera.streamingTo", { name: collection.name }) : t("phoneCamera.title")}
            />
          </View>
          <View accessibilityLiveRegion="polite">
            <CameraChip dotColor={responder.connected ? colors.success : colors.warning} label={status} />
          </View>
          <TorchToggle torch={torch} />
        </View>
        <TorchBrightness torch={torch} />
      </View>

      <View
        style={{
          position: "absolute",
          left: SCREEN_GUTTER,
          right: SCREEN_GUTTER,
          bottom: insets.bottom + SPACING.lg,
          gap: SPACING.md,
        }}
      >
        <AppText size="xs" accessibilityLiveRegion="polite" style={{ color: colors.onCamera, textAlign: "center" }}>
          {responder.capturedCount > 0
            ? t("phoneCamera.captured", { count: responder.capturedCount })
            : t("phoneCamera.keepOpen")}
        </AppText>
        <View style={{ flexDirection: "row", gap: SPACING.sm }}>
          {camera.devices.length > 1 ? (
            <Button style={{ flex: 1 }} variant="secondary" icon="camera" label={t("phoneCamera.switchCamera")} onPress={switchCamera} />
          ) : null}
          <Button style={{ flex: 1 }} variant="secondary" label={t("phoneCamera.disconnect")} onPress={() => router.back()} />
        </View>
      </View>
    </View>
  );
}
