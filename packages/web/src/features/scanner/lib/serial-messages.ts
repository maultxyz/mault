import {
  SERIAL_BUSY_ERROR,
  SERIAL_FED_EVENT,
  SERIAL_JAM_ERROR,
  SERIAL_READY_STATUS,
  SERIAL_RESET_REASONS,
  SERIAL_SERVO_DRIVER_MISSING,
} from "@/lib/constants/firmware";
import type { SerialResetReason } from "@/lib/interfaces/scanner";

function asFields(message: unknown): Record<string, unknown> | null {
  return typeof message === "object" && message !== null
    ? (message as Record<string, unknown>)
    : null;
}

export function isUnsolicitedSerialMessage(message: unknown): boolean {
  const fields = asFields(message);
  if (!fields) return false;
  return typeof fields.event === "string" || fields.error === SERIAL_JAM_ERROR;
}

export function isBusyResponse(message: unknown): boolean {
  return asFields(message)?.error === SERIAL_BUSY_ERROR;
}

export function isFedEvent(message: unknown): message is Record<string, unknown> {
  return asFields(message)?.event === SERIAL_FED_EVENT;
}

export function isFailedRouteResponse(response: unknown): boolean {
  const fields = asFields(response);
  return !fields || "error" in fields || fields.skipped === true;
}

export function withSeq(
  data: string,
  seq: number,
): { text: string; seq: number | null } {
  try {
    const parsed: unknown = JSON.parse(data);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { text: `${JSON.stringify({ seq, ...parsed })}\n`, seq };
    }
  } catch {}
  const line = data.trimEnd();
  return { text: `${line}\n`, seq: null };
}

export function replySeq(message: unknown): number | null {
  const seq = asFields(message)?.seq;
  return typeof seq === "number" ? seq : null;
}

export function isBootBanner(message: unknown): boolean {
  return (
    asFields(message)?.status === SERIAL_READY_STATUS &&
    replySeq(message) === null
  );
}

export function statusUptimeMs(message: unknown): number | null {
  const uptime = asFields(message)?.uptimeMs;
  return typeof uptime === "number" ? uptime : null;
}

export function statusResetReason(message: unknown): SerialResetReason | null {
  const reason = asFields(message)?.resetReason;
  if (typeof reason !== "string") return null;
  return (SERIAL_RESET_REASONS as readonly string[]).includes(reason)
    ? (reason as SerialResetReason)
    : "other";
}

export function isServoDriverMissing(message: unknown): boolean {
  return asFields(message)?.servoDriver === SERIAL_SERVO_DRIVER_MISSING;
}
