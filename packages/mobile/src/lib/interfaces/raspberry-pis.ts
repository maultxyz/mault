import type {
  PiHostScanAction,
  PiHostSummary,
  PiScanSessionSettingsBody,
  PiScanSessionStartBody,
} from "@magic-vault/shared";

export interface RaspberryPiList {
  hosts: PiHostSummary[];
  canManage: boolean;
}

export type RaspberryPiScanRequest =
  | { kind: "start"; body: PiScanSessionStartBody }
  | { kind: "settings"; body: PiScanSessionSettingsBody }
  | { kind: "stop" }
  | { kind: "action"; action: PiHostScanAction };

export interface RaspberryPiScanOptions {
  reportsErrorsInline?: boolean;
}

export interface RaspberryPiUpdateStatusProps {
  host: PiHostSummary;
  canManage: boolean;
}

export interface RaspberryPiCardProps {
  host: PiHostSummary;
  canManage: boolean;
  onRemove: (host: PiHostSummary) => void;
}

export type RaspberryPiStartPicker = "collection" | "condition" | "foil" | null;

export interface RaspberryPiCamera {
  frame: string | null;
  isUnavailable: boolean;
}
