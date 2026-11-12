import { isFirmwareFeatureSupported } from "./constants/firmware.constant";
import { FOIL_NUDGE_SERVO_TIMEOUT_MS, FOIL_NUDGE_SETTLE_MS } from "./constants/foil-nudge.constant";
import { supportsFoilDetection } from "./foil-detection";
import { detectFoilFromNudges, foilNudgeCommands, isFoilNudgeReplyOk } from "./foil-nudge";
import type { FoilNudgeDirection } from "./interfaces/foil-nudge.interface";
import type { ScanFoilNudgeInput, ScanFoilNudgeResult } from "./interfaces/scan-foil-nudge.interface";
import type { RgbaImage } from "./interfaces/vision-model.interface";

export async function executeScanFoilNudge(input: ScanFoilNudgeInput): Promise<ScanFoilNudgeResult> {
  const active = input.isActive ?? (() => true);
  if (!active() || !supportsFoilDetection(input.gameKey) || input.forceFoilType || input.foilOnlyFoilType ||
      !input.isReady || !(input.firmwareVersion === "pi-0.1.0" || /^\d+\.\d+\.\d+(?:[-+].*)?$/.test(input.firmwareVersion ?? "")) || !isFirmwareFeatureSupported(input.firmwareVersion, "pusherNudge") ||
      !input.calibration || !input.firmwareLimits) return null;
  if (![input.calibration.pusherLeft, input.calibration.pusherRight, input.calibration.pusherNeutral,
    input.firmwareLimits.maxPulse, input.firmwareLimits.maxTravelPercent].every((value) => Number.isFinite(value) && value > 0)) return null;
  if (![input.calibration.pusherLeft, input.calibration.pusherRight, input.calibration.pusherNeutral]
    .every((value) => Number.isInteger(value) && value >= 120 && value <= 490)) return null;
  const leftTravel = input.calibration.pusherLeft - input.calibration.pusherNeutral;
  const rightTravel = input.calibration.pusherRight - input.calibration.pusherNeutral;
  if (leftTravel * rightTravel >= 0) return null;
  const commands = foilNudgeCommands(input.calibration, input.firmwareLimits);
  if (!commands) return null;
  await input.prepareMotion?.();
  if (!active()) return null;
  const afterByDirection: Partial<Record<FoilNudgeDirection, RgbaImage>> = {};
  let motionAttempted = false;
  try {
    for (const { direction, command } of commands.nudges) {
      if (!active()) return null;
      motionAttempted = true;
      const reply = await input.sendCommand(command, FOIL_NUDGE_SERVO_TIMEOUT_MS);
      if (!reply.sent || !isFoilNudgeReplyOk(reply.line)) throw new Error("The foil nudge was not confirmed.");
      if (!active()) return null;
      await input.delay(FOIL_NUDGE_SETTLE_MS);
      if (!active()) return null;
      const image = await input.capture();
      if (image) afterByDirection[direction] = image;
    }
  } finally {
    if (motionAttempted) {
      const restored = await input.sendCommand(commands.restorePusher, FOIL_NUDGE_SERVO_TIMEOUT_MS);
      if (!restored.sent || !isFoilNudgeReplyOk(restored.line)) throw new Error("The foil nudge pusher could not be restored to neutral.");
    }
  }
  if (!active()) return null;
  const detection = detectFoilFromNudges(input.before, afterByDirection, input.gameKey);
  if (!detection || !input.encodeDiagnostics) return detection;
  const beforeDataUrl = await input.encodeDiagnostics(input.before);
  if (!beforeDataUrl) return detection;
  const afterDataUrlByDirection: Partial<Record<FoilNudgeDirection, string>> = {};
  for (const direction of commands.nudges.map((nudge) => nudge.direction)) {
    const image = afterByDirection[direction];
    const encoded = image ? await input.encodeDiagnostics(image) : null;
    if (encoded) afterDataUrlByDirection[direction] = encoded;
  }
  return { ...detection, nudgeImages: { beforeDataUrl, afterDataUrlByDirection } };
}
