import { useIsFocused } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { PanResponder, StyleSheet, View } from "react-native";
import { Camera, type CameraRef, useCameraDevice, usePhotoOutput } from "react-native-vision-camera";
import { useLiveCorners } from "@/features/scanner/api/use-live-corners";
import { DetectedOutline } from "@/features/scanner/components/detected-outline";
import { ScanRegionOverlay } from "@/features/scanner/components/scan-region-overlay";
import { useAppState } from "@/hooks/use-app-state";
import { useTheme } from "@/hooks/use-theme";
import { CAMERA_ASPECT_RATIO, CAPTURE_TARGET_RESOLUTION } from "@/lib/constants/scanner";
import { RADIUS } from "@/lib/constants/theme";
import type { ScanRegionEditorProps } from "@/lib/interfaces/calibration";

export function ScanRegionEditor({ region, onChange }: ScanRegionEditorProps) {
  const colors = useTheme();
  const focused = useIsFocused();
  const appState = useAppState();
  const device = useCameraDevice("back");
  const photoOutput = usePhotoOutput({ targetResolution: CAPTURE_TARGET_RESOLUTION, qualityPrioritization: "speed" });
  const cameraRef = useRef<CameraRef>(null);
  const active = focused && appState === "active" && !!device;
  const corners = useLiveCorners(cameraRef, active, false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const latest = useRef({ region, onChange, size });
  latest.current = { region, onChange, size };
  const startRef = useRef(region);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          startRef.current = latest.current.region;
        },
        onPanResponderMove: (_, gesture) => {
          const { width, height } = latest.current.size;
          if (width <= 0 || height <= 0) return;
          latest.current.onChange({
            ...startRef.current,
            offsetX: startRef.current.offsetX + gesture.dx / width,
            offsetY: startRef.current.offsetY + gesture.dy / height,
          });
        },
      }),
    [],
  );

  return (
    <View
      {...responder.panHandlers}
      onLayout={(event) => setSize(event.nativeEvent.layout)}
      style={{
        width: "100%",
        aspectRatio: CAMERA_ASPECT_RATIO,
        borderRadius: RADIUS.lg,
        overflow: "hidden",
        backgroundColor: colors.camera,
      }}
    >
      {device ? (
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={active}
          outputs={[photoOutput]}
          resizeMode="cover"
        />
      ) : null}
      <ScanRegionOverlay region={region} frameAspect={CAMERA_ASPECT_RATIO} strokeColor={colors.onCamera} />
      {corners ? <DetectedOutline corners={corners} color={colors.primary} /> : null}
    </View>
  );
}
