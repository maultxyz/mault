import type { LightSettings } from "@magic-vault/shared";

export function assertCameraLightReply(line: string, settings: LightSettings, ledMask: number) {
  const reply: unknown = JSON.parse(line);
  if (!reply || typeof reply !== "object" ||
    !("status" in reply) || reply.status !== "ok" ||
    !("lightMode" in reply) || reply.lightMode !== settings.lightMode ||
    !("brightness" in reply) || reply.brightness !== settings.lightBrightness ||
    !("leds" in reply) || reply.leds !== ledMask) {
    throw new Error("Lighting state not confirmed");
  }
}

export function assertCameraLightPreviewAvailable(line: string) {
  const reply: unknown = JSON.parse(line);
  if (!reply || typeof reply !== "object" ||
    !("lightAlert" in reply) || reply.lightAlert !== "none" ||
    ("warningActive" in reply && reply.warningActive === true)) {
    throw new Error("Lighting preview overridden by a sorter warning");
  }
}

export async function restoreCameraLightAfterPreview(
  pending: Promise<void> | null,
  restore: () => Promise<void>,
) {
  if (pending) await Promise.allSettled([pending]);
  await restore();
}
