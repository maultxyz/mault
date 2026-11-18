import type {
  SliderKey,
  CalibrationDebugParams,
} from "@/lib/interfaces/calibration";
import {
  CHANNEL_OFFSET,
  formatFeederSpeedWithPercent,
  formatPulseWithPercent,
  SERVO_PULSE_CENTER,
} from "@magic-vault/shared";

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
  feederStopPulse,
  binRoutes,
  firmwareVersion,
  board,
}: CalibrationDebugParams): string {
  const feederCenter = feederStopPulse ?? SERVO_PULSE_CENTER;
  const lines: string[] = [
    "Mault Calibration Debug",
    `Generated: ${new Date().toISOString()}`,
    `Firmware: ${firmwareVersion ? `${firmwareVersion}${board ? ` (${board})` : ""}` : "not connected"}`,
    `Channel layout: ${channelLayout} (offset ${CHANNEL_OFFSET[channelLayout]})`,
    `Module count: ${moduleCount}`,
    "",
    "Feeder:",
    `  stopPulse: ${feederStopPulse ?? `${SERVO_PULSE_CENTER} (default)`}`,
    `  speed: ${formatFeederSpeedWithPercent(feederConfig.speed, feederCenter)}`,
    `  duration: ${feederConfig.duration}ms`,
    `  pulseDuration: ${feederConfig.pulseDuration > 0 ? `${feederConfig.pulseDuration}ms` : "continuous"}`,
    `  pauseDuration: ${feederConfig.pauseDuration}ms`,
    `  settleDuration: ${feederConfig.settleDuration}ms`,
    `  reverseSpeed: ${formatFeederSpeedWithPercent(feederConfig.reverseSpeed, feederCenter)}`,
    `  reverseDuration: ${feederConfig.reverseDuration > 0 ? `${feederConfig.reverseDuration}ms` : "off"}`,
    `  feedRetryCount: ${feederConfig.feedRetryCount}`,
    "",
  ];

  for (const c of [...configs].sort((a, b) => a.moduleNumber - b.moduleNumber)) {
    lines.push(
      `Module ${c.moduleNumber}:`,
      `  bottom: closed=${formatPulseWithPercent(c.calibration.bottomClosed)} open=${formatPulseWithPercent(c.calibration.bottomOpen)}`,
      `  paddle: closed=${formatPulseWithPercent(c.calibration.paddleClosed)} open=${formatPulseWithPercent(c.calibration.paddleOpen)}`,
      `  pusher: left=${formatPulseWithPercent(c.calibration.pusherLeft)} neutral=${formatPulseWithPercent(c.calibration.pusherNeutral)} right=${formatPulseWithPercent(c.calibration.pusherRight)}`,
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
