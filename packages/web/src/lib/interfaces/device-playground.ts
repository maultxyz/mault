import type { FirmwareFeature } from "@magic-vault/shared";

export type DeviceCommandFieldType =
  | "number"
  | "optionalNumber"
  | "select"
  | "boolean";

export type DeviceCommandValue = number | string | boolean | null;

export type DeviceCommandValues = Record<string, DeviceCommandValue>;

export interface DeviceCommandField {
  name: string;
  type: DeviceCommandFieldType;
  min?: number;
  max?: number;
  options?: string[];
  defaultValue: DeviceCommandValue;
  feature?: FirmwareFeature;
}

export type DeviceCommandGroup =
  | "status"
  | "servos"
  | "feeder"
  | "routing"
  | "calibration";

export interface DeviceCommand {
  id: string;
  command: string;
  group: DeviceCommandGroup;
  fields: DeviceCommandField[];
  timeoutMs: number;
  feature?: FirmwareFeature;
  build: (values: DeviceCommandValues) => unknown;
}

export interface DeviceCommandOutcome {
  status: "ok" | "disconnected" | "busy" | "noResponse";
  line: string | null;
  elapsedMs: number;
  sentAt: number;
}

export interface DeviceCommandCardProps {
  command: DeviceCommand;
  disabled: boolean;
}

export interface DeviceCommandOutcomeProps {
  outcome: DeviceCommandOutcome;
}

export interface DeviceCommandFieldInputProps {
  commandId: string;
  field: DeviceCommandField;
  disabled: boolean;
}

export interface DeviceFirmwareNoteProps {
  feature: FirmwareFeature;
}

export interface DeviceRawConsoleProps {
  disabled: boolean;
}

export interface DeviceStopBarProps {
  disabled: boolean;
}
