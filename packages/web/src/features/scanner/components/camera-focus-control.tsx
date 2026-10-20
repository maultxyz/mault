import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useCameraContext } from "@/features/scanner/api/use-camera";
import { currentFocusDistance } from "@/features/scanner/lib/camera-focus";
import type { CameraFocusControlProps } from "@/lib/interfaces/scanner";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function CameraFocusControl({ className }: CameraFocusControlProps) {
  const { t } = useTranslation("scanner");
  const { stream, focusRange, focusDistance, setFocusDistance } =
    useCameraContext();
  if (!focusRange) return null;

  const isAuto = focusDistance === null;
  const midpoint = (focusRange.min + focusRange.max) / 2;

  const handleAutoChange = (auto: boolean) => {
    if (auto) {
      setFocusDistance(null);
      return;
    }
    const track = stream?.getVideoTracks()[0];
    setFocusDistance((track && currentFocusDistance(track)) ?? midpoint);
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium">
          {t("cameraFocus.label")}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-foreground/70">
          {t("cameraFocus.auto")}
          <Switch checked={isAuto} onCheckedChange={handleAutoChange} />
        </span>
      </label>
      <Slider
        min={focusRange.min}
        max={focusRange.max}
        step={focusRange.step || (focusRange.max - focusRange.min) / 100}
        value={focusDistance ?? midpoint}
        disabled={isAuto}
        onValueChange={setFocusDistance}
      />
    </div>
  );
}
