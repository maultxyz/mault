import { SliderField } from "@/components/slider-field";
import { useCameraContext } from "@/features/scanner/api/use-camera";
import { zoomMultiplierLabel } from "@/features/scanner/lib/camera-zoom";
import type { CameraZoomControlProps } from "@/lib/interfaces/scanner";
import { useTranslation } from "react-i18next";

export function CameraZoomControl({ className }: CameraZoomControlProps) {
  const { t } = useTranslation("scanner");
  const { zoomRange, zoomLevel, setZoomLevel } = useCameraContext();
  if (!zoomRange) return null;
  const value = zoomLevel ?? zoomRange.min;

  return (
    <div className={className}>
      <SliderField
        label={t("cameraZoom.label")}
        valueLabel={zoomMultiplierLabel(value, zoomRange)}
        min={zoomRange.min}
        max={zoomRange.max}
        step={zoomRange.step || (zoomRange.max - zoomRange.min) / 100}
        value={value}
        onValueChange={setZoomLevel}
      />
      <p className="mt-1 text-2xs text-foreground/70">
        {t("cameraZoom.description")}
      </p>
    </div>
  );
}
