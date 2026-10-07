import type {
  SliderKey,
  CalibrationDebugParams,
  ServoName,
} from "@/lib/interfaces/calibration";
import { CHANNEL_OFFSET, type ServoCalibration } from "@magic-vault/shared";

export function getCalibrationKey(
  servo: ServoName,
  position: string,
): keyof ServoCalibration | null {
  if (servo === "bottom")
    return position === "open" ? "bottomOpen" : "bottomClosed";
  if (servo === "paddle")
    return position === "open" ? "paddleOpen" : "paddleClosed";
  if (servo === "pusher") {
    if (position === "left") return "pusherLeft";
    if (position === "right") return "pusherRight";
    return "pusherNeutral";
  }
  return null;
}

export function defaultSliderValues(modules: number[]): Record<SliderKey, number> {
  const vals = {} as Record<SliderKey, number>;
  for (const m of modules) {
    vals[`${m}:bottom`] = 307;
    vals[`${m}:paddle`] = 307;
    vals[`${m}:pusher`] = 307;
  }
  return vals;
}

// Plain-text dump of every calibration value, meant to be pasted into a
// support/Discord message - not consumed programmatically, so formatting
// favors readability over machine parsing.
export function buildCalibrationDebugText({
  channelLayout,
  moduleCount,
  configs,
  feederConfig,
  binRoutes,
  firmwareVersion,
  board,
}: CalibrationDebugParams): string {
  const lines: string[] = [
    "Magic Vault Calibration Debug",
    `Generated: ${new Date().toISOString()}`,
    `Firmware: ${firmwareVersion ? `${firmwareVersion}${board ? ` (${board})` : ""}` : "not connected"}`,
    `Channel layout: ${channelLayout} (offset ${CHANNEL_OFFSET[channelLayout]})`,
    `Module count: ${moduleCount}`,
    "",
    "Feeder:",
    `  speed: ${feederConfig.speed}`,
    `  duration: ${feederConfig.duration}ms`,
    `  pulseDuration: ${feederConfig.pulseDuration > 0 ? `${feederConfig.pulseDuration}ms` : "continuous"}`,
    `  pauseDuration: ${feederConfig.pauseDuration}ms`,
    `  settleDuration: ${feederConfig.settleDuration}ms`,
    `  reverseSpeed: ${feederConfig.reverseSpeed}`,
    `  reverseDuration: ${feederConfig.reverseDuration > 0 ? `${feederConfig.reverseDuration}ms` : "off"}`,
    "",
  ];

  for (const c of [...configs].sort((a, b) => a.moduleNumber - b.moduleNumber)) {
    lines.push(
      `Module ${c.moduleNumber}:`,
      `  bottom: closed=${c.calibration.bottomClosed} open=${c.calibration.bottomOpen}`,
      `  paddle: closed=${c.calibration.paddleClosed} open=${c.calibration.paddleOpen}`,
      `  pusher: left=${c.calibration.pusherLeft} neutral=${c.calibration.pusherNeutral} right=${c.calibration.pusherRight}`,
      `  paddleOpenDelay: ${c.calibration.paddleOpenDelay}ms`,
      `  pusherHoldDuration: ${c.calibration.pusherHoldDuration}ms`,
      `  paddleCloseDelay: ${c.calibration.paddleCloseDelay}ms`,
    );
  }

  lines.push("", "Bin routes:");
  for (const r of [...binRoutes].sort((a, b) => a.binNumber - b.binNumber)) {
    lines.push(`  Bin ${r.binNumber} -> Module ${r.module} (${r.direction})`);
  }

  return lines.join("\n");
}
