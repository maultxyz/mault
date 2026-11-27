import { useTranslation } from "react-i18next";
import { Linking, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SPACING } from "@/lib/constants/theme";
import type { CameraPermissionEmptyStateProps } from "@/lib/interfaces/scanner";

export function CameraPermissionEmptyState({ canRequestPermission, onRequestPermission }: CameraPermissionEmptyStateProps) {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon="camera"
      title={t("scan.cameraPermissionTitle")}
      description={t("scan.cameraPermissionDescription")}
      action={
        canRequestPermission ? (
          <Button label={t("scan.allowCamera")} onPress={onRequestPermission} />
        ) : (
          <View style={{ alignItems: "center", gap: SPACING.md }}>
            <AppText tone="secondary" style={{ textAlign: "center" }}>
              {t("scan.cameraPermissionSettings")}
            </AppText>
            <Button label={t("common.openSettings")} onPress={() => void Linking.openSettings()} />
          </View>
        )
      }
    />
  );
}
