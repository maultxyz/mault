export type PiSerialErrorReason = "missing" | "busy" | "open-failed";

export type PiSerialControlMessage =
  | { type: "ready" }
  | { type: "error"; reason: PiSerialErrorReason };

export interface PiSorterDevice {
  id: string;
  label: string;
  builtin: boolean;
  busy: boolean;
}

export interface PiCameraDevice {
  id: string;
  label: string;
}

export interface PiBluetoothCapabilities {
  supported: boolean;
  powered?: boolean;
}
