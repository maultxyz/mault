import { useQuery } from "@tanstack/react-query";
import { useKeepAwake } from "expo-keep-awake";
import { router, useIsFocused, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Camera, useCameraPermission, usePhotoOutput } from "react-native-vision-camera";
import { DEFAULT_SCAN_REGION } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { useCameraChoice } from "@/features/scanner/api/use-camera-choice";
import { usePhoneCameraResponder } from "@/features/scanner/api/use-phone-camera-responder";
import { CameraChip } from "@/features/scanner/components/camera-chip";
import { ScanRegionOverlay } from "@/features/scanner/components/scan-region-overlay";
import { captureFrame, imageToJpegDataUrl } from "@/features/scanner/lib/frame";
import { useSorter } from "@/features/sorter/api/use-sorter";
import { useAppState } from "@/hooks/use-app-state";
import { useActiveOrgId } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { CAPTURE_FLASH_MS, PHONE_CAMERA_JPEG_QUALITY } from "@/lib/constants/phone-camera";
import { CAMERA_ASPECT_RATIO, CAPTURE_TARGET_RESOLUTION } from "@/lib/constants/scanner";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";

export default function DesktopCameraScreen() {
  useKeepAwake();
  const { guid } = useLocalSearchParams<{ guid: string }>();
  const { t } = useTranslation();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const appState = useAppState();
  const sorter = useSorter();
  const permission = useCameraPermission();
  const camera = useCameraChoice();
  const device = camera.device;
  const { data: collections } = useQuery(collectionsQueryOptions(useActiveOrgId()));
  const collection = collections?.find((c) => c.guid === guid);
  const photoOutput = usePhotoOutput({ targetResolution: CAPTURE_TARGET_RESOLUTION, qualityPrioritization: "speed" });
  const [flash, setFlash] = useState(false);
  const [frameAspect, setFrameAspect] = useState(CAMERA_ASPECT_RATIO);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = focused && appState === "active" && permission.hasPermission && !!device;

  const capture = useCallback(async () => {
    const frame = await captureFrame(photoOutput);
    const { width, height } = frame.image;
    if (width > 0 && height > 0) setFrameAspect(Math.min(width, height) / Math.max(width, height));
    setFlash(true);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(false), CAPTURE_FLASH_MS);
    return imageToJpegDataUrl(frame.image, PHONE_CAMERA_JPEG_QUALITY);
  }, [photoOutput]);

  const responder = usePhoneCameraResponder({ collectionGuid: guid, enabled: active, capture });

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

  return (
    <View style={{ flex: 1, backgroundColor: colors.camera }}>
      {focused ? <StatusBar style="light" /> : null}
      {!permission.hasPermission ? (
        <View style={[StyleSheet.absoluteFill, { justifyContent: "center", padding: SCREEN_GUTTER }]}>
          <EmptyState
            icon="camera"
            title={t("scan.cameraPermissionTitle")}
            description={t("scan.cameraPermissionDescription")}
            action={<Button label={t("scan.allowCamera")} onPress={() => void permission.requestPermission()} />}
          />
        </View>
      ) : device ? (
        <>
          <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={active}
            outputs={[photoOutput]}
            resizeMode="cover"
            enableNativeTapToFocusGesture
          />
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
        <View style={[StyleSheet.absoluteFill, { justifyContent: "center" }]}>
          <EmptyState icon="camera" title={t("scan.noCamera")} />
        </View>
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
          <CameraChip dotColor={responder.connected ? colors.success : colors.warning} label={status} />
        </View>
      </View>

      <View
        style={{
          position: "absolute",
          left: SCREEN_GUTTER,
          right: SCREEN_GUTTER,
          bottom: insets.bottom + SPACING.lg,
          gap: SPACING.sm,
        }}
      >
        <AppText size="xs" style={{ color: colors.onCamera, textAlign: "center" }}>
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
