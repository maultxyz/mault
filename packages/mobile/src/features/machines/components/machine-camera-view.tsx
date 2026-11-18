import { machineShowsLiveCamera } from "@magic-vault/shared";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useMachineCameraFrame } from "@/features/machines/api/use-machine-camera-frame";
import { useMachineCommand } from "@/features/machines/api/use-machine-command";
import { useTheme } from "@/hooks/use-theme";
import { MACHINE_CAMERA_ASPECT_RATIO, MACHINE_CONTROL_BUTTON_SIZE } from "@/lib/constants/machines";
import { RADIUS, SPACING, SURFACE_RADIUS } from "@/lib/constants/theme";
import { DISABLED_OPACITY, SHUTTER_ICON_SIZE } from "@/lib/constants/ui";
import type { MachineCameraViewProps } from "@/lib/interfaces/machines";

export function MachineCameraView({ machine, isVisible }: MachineCameraViewProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const { imageUri, isConnecting } = useMachineCameraFrame(machine, isVisible);
  const command = useMachineCommand();
  const showsCamera = machineShowsLiveCamera(machine);
  const canToggle = machine.canPause || machine.canResume;
  const toggleLabel = machine.canPause
    ? t("machines.controls.pause")
    : machine.sessionScanCount > 0
      ? t("machines.controls.resume")
      : t("machines.controls.start");

  return (
    <View
      style={{
        aspectRatio: MACHINE_CAMERA_ASPECT_RATIO,
        borderRadius: SURFACE_RADIUS,
        overflow: "hidden",
        backgroundColor: colors.camera,
      }}
    >
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          accessible
          accessibilityLabel={t("machines.camera.label", { name: machine.name })}
          contentFit="contain"
          transition={0}
          style={StyleSheet.absoluteFill}
        />
      ) : isConnecting ? (
        <View accessible accessibilityLabel={t("machines.camera.loading")} style={StyleSheet.absoluteFill}>
          <Skeleton height="100%" radius={0} />
        </View>
      ) : (
        <View
          style={[
            StyleSheet.absoluteFill,
            { alignItems: "center", justifyContent: "center", gap: SPACING.sm, padding: SPACING.xl },
          ]}
        >
          <Icon name="camera" size={32} color={colors.onCamera} />
          <AppText size="sm" style={{ color: colors.onCamera, textAlign: "center" }}>
            {machine.hasCamera && !showsCamera ? t("machines.camera.idle") : t("machines.camera.unavailable")}
          </AppText>
        </View>
      )}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "space-between",
          padding: SPACING.md,
        }}
      >
        {machine.canEmergencyStop ? (
          <Button
            variant="destructive"
            icon="handStop"
            label={t("machines.controls.emergencyStop")}
            accessibilityHint={t("machines.controls.emergencyStopHint")}
            disabled={command.isPending}
            onPress={() => command.mutate({ machine, command: "emergencyStop" })}
          />
        ) : (
          <View />
        )}
        {canToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={toggleLabel}
            accessibilityState={{ disabled: command.isPending }}
            disabled={command.isPending}
            onPress={() => command.mutate({ machine, command: machine.canPause ? "pause" : "resume" })}
            style={({ pressed }) => ({
              width: MACHINE_CONTROL_BUTTON_SIZE,
              height: MACHINE_CONTROL_BUTTON_SIZE,
              borderRadius: RADIUS.full,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: machine.canPause ? colors.destructive : colors.primary,
              opacity: command.isPending ? DISABLED_OPACITY : 1,
              transform: [{ scale: pressed ? 0.94 : 1 }],
            })}
          >
            <Icon name={machine.canPause ? "pause" : "play"} size={SHUTTER_ICON_SIZE} color={colors.onCamera} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
