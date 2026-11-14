import { useTranslation } from "react-i18next";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
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
          <AppText tone="secondary">{t("scan.cameraPermissionSettings")}</AppText>
        )
      }
    />
  );
}
