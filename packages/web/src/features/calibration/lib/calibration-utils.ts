import type { SliderKey } from "@/lib/interfaces/calibration";
import {
  CHANNEL_OFFSET,
  type BinRoute,
  type ChannelLayout,
  type FeederCalibration,
  type ModuleConfig,
  type ServoCalibration,
} from "@magic-vault/shared";

export function getCalibrationKey(
  servo: "bottom" | "paddle" | "pusher",
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

export interface CalibrationDebugParams {
  channelLayout: ChannelLayout;
  moduleCount: number;
  configs: ModuleConfig[];
  feederConfig: FeederCalibration;
  binRoutes: BinRoute[];
  firmwareVersion: string | null;
  board: string | null;
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
    "",
  ];

  for (const c of [...configs].sort((a, b) => a.moduleNumber - b.moduleNumber)) {
    lines.push(
      `Module ${c.moduleNumber}:`,
      `  bottom: closed=${c.calibration.bottomClosed} open=${c.calibration.bottomOpen}`,
      `  paddle: closed=${c.calibration.paddleClosed} open=${c.calibration.paddleOpen}`,
      `  pusher: left=${c.calibration.pusherLeft} neutral=${c.calibration.pusherNeutral} right=${c.calibration.pusherRight}`,
    );
  }

  lines.push("", "Bin routes:");
  for (const r of [...binRoutes].sort((a, b) => a.binNumber - b.binNumber)) {
    lines.push(`  Bin ${r.binNumber} -> Module ${r.module} (${r.direction})`);
  }

  return lines.join("\n");
}
