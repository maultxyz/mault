import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useCameraContext } from "@/features/scanner/api/use-camera";
import { currentFocusDistance } from "@/features/scanner/lib/camera-focus";
import { browserMustUsePiCamera, isPiRelayTrack, lockTrackFocus } from "@/features/scanner/lib/pi-camera";
import type { CameraFocusControlProps } from "@/lib/interfaces/scanner";
import { cn } from "@/lib/utils";
import { useId } from "react";
import { useTranslation } from "react-i18next";

export function CameraFocusControl({ className }: CameraFocusControlProps) {
  const { t } = useTranslation("scanner");
  const focusLabelId = useId();
  const { stream, focusRange, focusDistance, setFocusDistance } =
    useCameraContext();
  if (!focusRange) return null;

  const isAuto = focusDistance === null;
  const midpoint = (focusRange.min + focusRange.max) / 2;

  const handleAutoChange = async (auto: boolean) => {
    if (auto) {
      setFocusDistance(null);
      return;
    }
    const track = stream?.getVideoTracks()[0];
    if (!browserMustUsePiCamera() && !(track && isPiRelayTrack(track))) {
      setFocusDistance((track && currentFocusDistance(track)) ?? midpoint);
      return;
    }
    try {
      setFocusDistance(await lockTrackFocus(track, midpoint));
    } catch {
      // Keep auto selected rather than saving an arbitrary manual position.
    }
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label className="flex items-center justify-between gap-2">
        <span id={focusLabelId} className="text-xs font-medium">
          {t("cameraFocus.label")}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-foreground/70">
          {t("cameraFocus.auto")}
          <Switch checked={isAuto} onCheckedChange={handleAutoChange} />
        </span>
      </label>
      <Slider
        aria-labelledby={focusLabelId}
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
