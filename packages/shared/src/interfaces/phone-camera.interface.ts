import type { CardContour, ScanRegion } from "./scanner.interface";

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
  imageIsStoredOnServer?: boolean;
  capturesWhenCardSettles?: boolean;
  maxCardSettleWaitMs?: number;
  scanRegion?: ScanRegion;
}

export interface PhoneCameraCardObservation {
  cardPresent: boolean;
  contour: CardContour | null;
  frameLongSidePx: number;
}

export interface WaitUntilCardSettlesOptions {
  observeCard: () => Promise<PhoneCameraCardObservation | null>;
  maxWaitMs: number;
  isCancelled?: () => boolean;
  minimumGapBetweenObservationsMs?: number;
}
