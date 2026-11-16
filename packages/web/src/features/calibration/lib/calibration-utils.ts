import type {
  SliderKey,
  CalibrationDebugParams,
} from "@/lib/interfaces/calibration";
import { CHANNEL_OFFSET } from "@magic-vault/shared";

export function defaultSliderValues(modules: number[]): Record<SliderKey, number> {
  const vals = {} as Record<SliderKey, number>;
  for (const m of modules) {
    vals[`${m}:bottom`] = 307;
    vals[`${m}:paddle`] = 307;
    vals[`${m}:pusher`] = 307;
  }
  return vals;
}

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
    "Mault Calibration Debug",
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
    `  feedRetryCount: ${feederConfig.feedRetryCount}`,
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
