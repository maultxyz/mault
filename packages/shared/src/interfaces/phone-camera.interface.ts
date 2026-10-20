import type { ScanRegion } from "./scanner.interface";

export type PhoneCameraMessageKind =
  | "camera_ready"
  | "camera_left"
  | "capture_requested"
  | "capture_response"
  | "desktop_disconnected"
  | "scan_region_updated";

export interface PhoneCameraMessage {
  kind: PhoneCameraMessageKind;
  requestId?: string;
  imageDataUrl?: string;
  scanRegion?: ScanRegion;
}
