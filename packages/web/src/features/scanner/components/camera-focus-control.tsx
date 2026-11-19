import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useCameraContext } from "@/features/scanner/api/use-camera";
import { currentFocusDistance } from "@/features/scanner/lib/camera-focus";
import { browserMustUsePiCamera, isPiRelayTrack, lockTrackFocus } from "@/features/scanner/lib/pi-camera";
import type { CameraFocusControlProps } from "@/lib/interfaces/scanner";
import { cn } from "@/lib/utils";
import { useEffect, useId, useRef } from "react";
import { useTranslation } from "react-i18next";

export function CameraFocusControl({ className, onFocusChange, previewOnly = false, disabled = false }: CameraFocusControlProps) {
  const { t } = useTranslation("scanner");
  const focusLabelId = useId();
  const { stream, selectedCameraId, focusRange, focusDistance, setFocusDistance, applyFocusDistance } =
    useCameraContext();
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  if (!focusRange) return null;

  const changeFocus = onFocusChange ?? setFocusDistance;
  const isAuto = focusDistance === null;
  const midpoint = (focusRange.min + focusRange.max) / 2;

  const handleAutoChange = async (auto: boolean) => {
    if (auto) {
      changeFocus(null);
      return;
    }
    const track = stream?.getVideoTracks()[0];
    if (!browserMustUsePiCamera() && !(track && isPiRelayTrack(track))) {
      changeFocus((track && currentFocusDistance(track)) ?? midpoint);
      return;
    }
    try {
      const position = await lockTrackFocus(track, midpoint, selectedCameraId, !previewOnly);
      if (!mounted.current) {
        if (previewOnly) await applyFocusDistance(focusDistance, false);
        return;
      }
      changeFocus(position);
    } catch {
      if (previewOnly) {
        if (mounted.current) changeFocus(focusDistance);
        else void applyFocusDistance(focusDistance, false).catch(() => {});
      }
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
          <Switch disabled={disabled} checked={isAuto} onCheckedChange={handleAutoChange} />
        </span>
      </label>
      <Slider
        aria-labelledby={focusLabelId}
        min={focusRange.min}
        max={focusRange.max}
        step={focusRange.step || (focusRange.max - focusRange.min) / 100}
        value={focusDistance ?? midpoint}
        disabled={isAuto || disabled}
        onValueChange={changeFocus}
      />
      <p className="text-2xs text-foreground/70">
        {isAuto ? t("cameraFocus.autoOnHelp") : t("cameraFocus.autoOffHelp")}
      </p>
    </div>
  );
}
