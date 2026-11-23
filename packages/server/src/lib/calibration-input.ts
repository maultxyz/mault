import {
  CALIBRATION_INPUT_VALUE_MAX,
  CALIBRATION_INPUT_VALUE_MIN,
} from "./constants/calibration-input";

export function pickCalibrationValues<Key extends string>(
  body: unknown,
  keys: readonly Key[],
): Partial<Record<Key, number>> | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return null;
  const source = body as Record<string, unknown>;
  const picked: Partial<Record<Key, number>> = {};
  for (const key of keys) {
    if (!Object.hasOwn(source, key) || source[key] === undefined) continue;
    const value = source[key];
    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < CALIBRATION_INPUT_VALUE_MIN ||
      value > CALIBRATION_INPUT_VALUE_MAX
    ) {
      return null;
    }
    picked[key] = value;
  }
  return picked;
}
