import type { PhoneCameraCaptureStatus } from "@/features/scanner/api/use-phone-camera-capture";
import type {
  BinRoute,
  HealthCheck,
  PlayingCard,
  PlayingCardWithDistance,
  ScanRegion,
  ScannedCard,
  ScannerStatus,
} from "@magic-vault/shared";

export type CameraStatus = "idle" | "requesting" | "ready" | "error";
export type CameraSource = "local" | "phone";

export interface ZoomRange {
  min: number;
  max: number;
  step: number;
}

export interface CameraContextValue {
  stream: MediaStream | null;
  status: CameraStatus;
  errorMessage: string;
  zoom: number;
  zoomRange: ZoomRange | null;
  cameras: MediaDeviceInfo[];
  selectedCameraId: string | null;
  setZoom: (value: number) => void;
  selectCamera: (deviceId: string) => void;
  retryCamera: () => Promise<void>;
  stopCamera: () => void;
  cameraSource: CameraSource;
  phonePairingStatus: PhoneCameraCaptureStatus;
  phonePairingUrl: string | null;
  startPhonePairing: () => void;
  stopPhonePairing: () => void;
  requestPhoneCapture: () => Promise<string | null>;
  sendPhoneScanRegion: (region: ScanRegion) => void;
}

export interface ScannedCardsContextValue {
  cards: ScannedCard[];
  isLoading: boolean;
  autoFeed: boolean;
  elapsedMs: number;
  isTimerActive: boolean;
  setAutoFeed: (enabled: boolean) => void;
  addCard: (
    card: PlayingCardWithDistance,
    capturedImageUrl?: string,
    alternativeMatches?: PlayingCardWithDistance[],
  ) => void;
  sendCatchAllBin: () => void;
  registerCardArrivedHook: (fn: () => void) => () => void;
  registerPauseHook: (fn: () => void) => () => void;
  removeCard: (scanId: string) => void;
  removeCards: (scanIds: string[]) => void;
  correctCard: (scanId: string, card: PlayingCard) => void;
  toggleFoil: (scanId: string, isFoil: boolean) => void;
  markDownloaded: (scanIds: string[]) => void;
  clearCards: () => void;
}

export type SerialMessageListener = (message: unknown) => void;

export type SerialBoardType = "esp32" | "uno_r4";

export interface FlashEsp32Result {
  success: boolean;
  error?: string;
}

export interface TestResult {
  ok: boolean;
  error: string | null;
}

export interface SerialContextValue {
  isConnected: boolean;
  isReady: boolean;
  firmwareVersion: string | null;
  board: SerialBoardType | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  sendRoute: (route: BinRoute) => Promise<unknown | null>;
  sendTest: () => Promise<TestResult>;
  sendCommand: (data: string) => Promise<boolean>;
  receiveResponse: (timeoutMs?: number) => Promise<string>;
  subscribe: (listener: SerialMessageListener) => () => void;
  registerPreTestHook: (fn: () => Promise<void>) => () => void;
  isFlashing: boolean;
  flashProgress: number | null;
  flashLog: string[];
  flashEsp32: (firmwareUrl: string) => Promise<FlashEsp32Result>;
}

export interface ScannerControlsProps {
  status: ScannerStatus;
  duplicateCardName?: string;
  onForceAddDuplicate: () => void;
  onForceScan: () => void;
  onSkipDuplicate: () => void;
  onPause: () => void;
  onResume: () => void;
}

export interface ScannerOverlayProps {
  status: ScannerStatus;
  errorMessage: string;
  isCameraActive: boolean;
  isConnected: boolean;
  isReady: boolean;
  firmwareVersion: string | null;
  hasCatchAll: boolean;
  autoFeed: boolean;
  cameraSource: CameraSource;
  phonePairingStatus: PhoneCameraCaptureStatus;
  hasPhonePhoto: boolean;
  apiHealthCheck: HealthCheck | null;
  dailyLimitReached: boolean;
  onRetryError: () => void;
  onConnectScanner: () => void;
}

export interface SetStats {
  code: string;
  name: string;
  count: number;
  value: number;
}
