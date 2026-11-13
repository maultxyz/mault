import { useCameraContext } from "@/features/scanner/api/use-camera";
import { IconLoader2 } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function CameraConnectingOverlay() {
  const { t } = useTranslation("scanner");
  const { status } = useCameraContext();
  if (status !== "requesting") return null;

  return (
    <div
      role="status"
      className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-black/40 text-white"
    >
      <IconLoader2 aria-hidden className="size-6 animate-spin" />
      <span className="text-xs">{t("cameraConnecting")}</span>
    </div>
  );
}
