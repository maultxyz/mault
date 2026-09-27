import {
  SERIAL_BUSY_ERROR,
  SERIAL_FED_EVENT,
  SERIAL_JAM_ERROR,
} from "@/lib/constants/firmware";

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
