import type { FoilCaptureForm, FoilCaptureFrame, FoilCaptureSequenceOptions, FoilLighting } from "@/lib/interfaces/foil-calibration";
import { mainLightLedMask, type LightLedCount } from "@magic-vault/shared";
import { FOIL_BRIGHTNESS_STEPS, FOIL_CALIBRATION_STEPS, FOIL_DIRECTION_LED_MASKS, FOIL_DIRECTION_STEPS, FOIL_STAGED_STEPS } from "../../../lib/constants/foil-calibration.ts";

export function foilExperimentSteps(mode: FoilCaptureForm["captureMode"], brightness: number, ledCount: LightLedCount = 16) {
  if (mode === "brightness" || mode === "direction" || mode === "staged") {
    return (mode === "brightness" ? FOIL_BRIGHTNESS_STEPS : mode === "staged" ? FOIL_STAGED_STEPS : FOIL_DIRECTION_STEPS)
      .map((step) => ({
        ...step,
        lighting: {
          ...step.lighting,
          ...(step.lighting.ledMask === FOIL_DIRECTION_LED_MASKS.diffuse && { ledMask: mainLightLedMask(ledCount) }),
        },
      }));
  }
  if (mode !== "color") throw new Error("Unknown foil capture mode");
  return foilCaptureSteps(brightness);
}

export function foilCaptureSteps(brightness: number) {
  if (!Number.isInteger(brightness) || brightness < 1 || brightness > 255) {
    throw new Error("Capture brightness must be an integer from 1 to 255");
  }
  return FOIL_CALIBRATION_STEPS.map((step) => ({
    ...step,
    lighting: { ...step.lighting, lightBrightness: brightness },
  }));
}

export function withFoilLedMask<T extends { setLight: object }>(command: T, ledMask: number | undefined) {
  if (ledMask === undefined) return command;
  return { ...command, setLight: { ...command.setLight, leds: ledMask, suppressWarnings: true } };
}

export function assertFoilLightingReply(line: string, settings: FoilLighting) {
  const reply: unknown = JSON.parse(line);
  if (!reply || typeof reply !== "object" ||
    !("status" in reply) || reply.status !== "ok" ||
    !("lightMode" in reply) || reply.lightMode !== settings.lightMode ||
    !("brightness" in reply) || reply.brightness !== settings.lightBrightness ||
    !("lightAlert" in reply) || reply.lightAlert !== "none") {
    throw new Error("Lighting state not confirmed or sorter alert active");
  }
  if (settings.ledMask !== undefined && (!("leds" in reply) || reply.leds !== settings.ledMask)) {
    throw new Error("Sorter firmware does not support LED direction");
  }
}

export async function captureFoilSequence(options: FoilCaptureSequenceOptions) {
  const frames: FoilCaptureFrame[] = [];
  try {
    for (const step of options.steps) {
      options.signal.throwIfAborted();
      options.onStep(step.id);
      await options.setLight(step.lighting);
      await options.wait(options.settleMs, options.signal);
      options.signal.throwIfAborted();
      frames.push(await options.capture(step));
      options.signal.throwIfAborted();
    }
    return frames;
  } finally {
    await options.setLight(options.restore);
  }
}

export function waitForFoilExposure(ms: number, signal: AbortSignal): Promise<void> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    signal.addEventListener("abort", abort, { once: true });
  });
}
