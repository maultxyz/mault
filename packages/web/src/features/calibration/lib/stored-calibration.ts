import {
  FEEDER_CALIBRATION_FIELDS,
  SERVO_CALIBRATION_FIELDS,
  STORED_SERVO_CALIBRATION_OPTIONAL_FIELDS,
} from "@/lib/constants/calibration";
import type {
  CalibrationDifference,
  DeviceCalibration,
  StoredCalibration,
} from "@/lib/interfaces/calibration";
import {
  DEFAULT_CALIBRATION,
  type FeederCalibration,
  type ModuleConfig,
  type ServoCalibration,
} from "@magic-vault/shared";

function pickNumbers<K extends string>(
  source: unknown,
  fields: K[],
): Record<K, number> | null {
  if (!source || typeof source !== "object") return null;
  const record = source as Record<string, unknown>;
  const picked = {} as Record<K, number>;
  for (const field of fields) {
    const value = record[field];
    if (typeof value !== "number") return null;
    picked[field] = value;
  }
  return picked;
}

export function parseStoredModule(reply: unknown): ServoCalibration | null {
  if (!reply || typeof reply !== "object") return null;
  const withDefaults = { ...(reply as Record<string, unknown>) };
  for (const field of STORED_SERVO_CALIBRATION_OPTIONAL_FIELDS) {
    if (typeof withDefaults[field] !== "number") {
      withDefaults[field] = DEFAULT_CALIBRATION[field];
    }
  }
  return pickNumbers(withDefaults, SERVO_CALIBRATION_FIELDS);
}

export function parseStoredFeeder(reply: unknown): FeederCalibration | null {
  if (!reply || typeof reply !== "object") return null;
  return pickNumbers(
    (reply as Record<string, unknown>).feeder,
    FEEDER_CALIBRATION_FIELDS,
  );
}

function moduleCalibration(
  modules: ModuleConfig[],
  moduleNumber: number,
): ServoCalibration | undefined {
  return modules.find((c) => c.moduleNumber === moduleNumber)?.calibration;
}

export function diffCalibration(
  app: DeviceCalibration,
  stored: StoredCalibration,
  moduleCount: number,
): CalibrationDifference[] {
  const differences: CalibrationDifference[] = [];
  for (let moduleNumber = 1; moduleNumber <= moduleCount; moduleNumber++) {
    const device = moduleCalibration(stored.modules, moduleNumber);
    if (!device) continue;
    const saved =
      moduleCalibration(app.modules, moduleNumber) ?? DEFAULT_CALIBRATION;
    for (const field of SERVO_CALIBRATION_FIELDS) {
      if (saved[field] === device[field]) continue;
      differences.push({
        moduleNumber,
        field,
        appValue: saved[field],
        deviceValue: device[field],
      });
    }
  }
  for (const field of FEEDER_CALIBRATION_FIELDS) {
    if (app.feeder[field] === stored.feeder[field]) continue;
    differences.push({
      moduleNumber: null,
      field,
      appValue: app.feeder[field],
      deviceValue: stored.feeder[field],
    });
  }
  return differences;
}

export function adoptStoredModules(
  modules: ModuleConfig[],
  stored: StoredCalibration,
  moduleNumbers: number[],
): ModuleConfig[] {
  const adopted = moduleNumbers.flatMap((moduleNumber) => {
    const calibration = moduleCalibration(stored.modules, moduleNumber);
    return calibration ? [{ moduleNumber, calibration }] : [];
  });
  const kept = modules.filter(
    (c) => !adopted.some((a) => a.moduleNumber === c.moduleNumber),
  );
  return [...kept, ...adopted].sort((a, b) => a.moduleNumber - b.moduleNumber);
}

export function groupDifferences(
  differences: CalibrationDifference[],
): [number | null, CalibrationDifference[]][] {
  const groups = new Map<number | null, CalibrationDifference[]>();
  for (const difference of differences) {
    const group = groups.get(difference.moduleNumber) ?? [];
    group.push(difference);
    groups.set(difference.moduleNumber, group);
  }
  return [...groups.entries()];
}
