import type { HotkeyId } from "@/lib/interfaces/hotkeys";
import type { CardViewMode } from "@/lib/interfaces/cards";
import type { SessionViewer } from "@/lib/interfaces/collections";
import type {
  BinConfig,
  CardFilters,
  CardContour,
  CardScannerProps,
  CardSearchDiagnostics,
  CardSearchResult,
  OcrDiagnostics,
  ScanDetectionDiagnostics,
  UnmatchedReason,
  UnmatchedScanDetails,
  UnmatchedScanDiagnostics,
  BinRoute,
  Collection,
  CollectionCardsQuery,
  FieldMeta,
  GroupedScannedCard,
  PlayingCard,
  PlayingCardWithDistance,
  ScanRegion,
  MatchCandidateDiagnostic,
  MatchedScanDetails,
  ScanMatchSource,
  ScannedCard,
  ScannerStatus,
  ScanVectorizeSource,
  UnmatchedCard,
} from "@magic-vault/shared";
import type { ReactNode } from "react";
import type { PreTestHook } from "@/lib/interfaces/stations";
import type { Device } from "@/features/calibration/api/devices";
import type { ByteTransport } from "@/features/scanner/lib/transports";

export type PhoneCameraCaptureStatus = "idle" | "waiting" | "connected" | "error";

export type PhoneLocalCameraStatus =
  | "requesting-camera"
  | "camera-error"
  | "ready"
  | "disconnected";

export type CameraStatus = "idle" | "requesting" | "ready" | "error";
export type CameraSource = "local" | "phone";

export interface CameraRange {
  min: number;
  max: number;
  step: number;
}

export interface CameraFocusControlProps {
  className?: string;
}

export type CameraTrackSettings = MediaTrackSettings & {
  focusDistance?: number;
};

export type CameraTrackCapabilities = MediaTrackCapabilities & {
  focusMode?: string[];
  focusDistance?: CameraRange;
  zoom?: CameraRange;
};

export interface CameraContextValue {
  stream: MediaStream | null;
  status: CameraStatus;
  errorMessage: string;
  focusRange: CameraRange | null;
  focusDistance: number | null;
  cameras: MediaDeviceInfo[];
  selectedCameraId: string | null;
  setFocusDistance: (value: number | null) => void;
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

export interface MatchScope {
  collectionGuid?: string;
  preferredSetCode?: string | null;
}

export interface ScannedCardsContextValue {
  unmatchedCards: UnmatchedCard[];
  isLoading: boolean;
  autoFeed: boolean;
  forceFoilType: string | null;
  forceSetCode: string | null;
  elapsedMs: number;
  isTimerActive: boolean;
  recentScanTimes: number[];
  setScannerRunning: (running: boolean) => void;
  setAutoFeed: (enabled: boolean) => void;
  setForceFoilType: (foilType: string | null) => void;
  setForceSetCode: (setCode: string | null) => void;
  addCard: (
    card: PlayingCardWithDistance,
    capturedImageUrl?: string,
    alternativeMatches?: PlayingCardWithDistance[],
    vectorizedOn?: ScanVectorizeSource,
    details?: MatchedScanDetails,
  ) => void;
  addUnmatchedCard: (
    capturedImageUrl?: string,
    vectorizedOn?: ScanVectorizeSource,
    details?: UnmatchedScanDetails,
  ) => void;
  removeUnmatchedCard: (scanId: string) => void;
  identifyUnmatchedCard: (scanId: string, card: PlayingCard) => Promise<boolean>;
  sendCatchAllBin: () => void;
  binLimitReached: BinConfig | null;
  resolveBinLimit: () => Promise<void>;
  registerCardArrivedHook: (fn: () => void) => () => void;
  registerPauseHook: (fn: () => void) => () => void;
  registerResumeHook: (fn: () => void) => () => void;
  pause: () => void;
  isFeedHalted: () => boolean;
  clearFeedHalt: () => void;
  showJamToast: (options: JamToastOptions) => void;
  removeCard: (scanId: string) => void;
  removeCards: (scanIds: string[]) => void;
  correctCard: (scanId: string, card: PlayingCard) => void;
  confirmCard: (scanId: string) => void;
  setCardFoilType: (scanId: string, foilType: string | null) => void;
  markDownloaded: (scanIds: string[]) => void;
  clearCards: () => void;
}

export type SerialMessageListener = (message: unknown) => void;

export type SerialBoardType = "esp32" | "uno_r4";

export type SerialTransportType = "serial" | "bluetooth";

export type FlashFailureReason =
  | "wrong-chip"
  | "no-bootloader"
  | "download-failed"
  | "flash-failed"
  | "verify-failed";

export interface FlashEsp32Result {
  success: boolean;
  error?: string;
  reason?: FlashFailureReason;
  chip?: string;
}

export type FirmwareFlashState = "idle" | "flashing" | "success" | "error";

export interface FlashProgressCallbacks {
  onLog: (line: string) => void;
  onClearLog: () => void;
  onProgress: (fraction: number | null) => void;
}

export type ConnectTestRunner = (
  forTransport: ByteTransport,
  forDevice: Device | undefined,
) => Promise<void>;

export interface TestResult {
  ok: boolean;
  error: string | null;
  blockedModule: number | null;
}

export type FirmwareCheckResult =
  | { status: "ok"; version: string }
  | { status: "noVersion" | "noResponse" | "busy" | "disconnected" };

export interface RouteOptions {
  feedNext?: boolean;
}

export interface SkippedRouteResponse {
  skipped: true;
}

export interface PushTest {
  module: number;
  direction: "left" | "right";
  pusherHoldDuration: number;
  paddleCloseDelay: number;
}

export interface SerialContextValue {
  isConnected: boolean;
  isReady: boolean;
  sensorBlockedModule: number | null;
  reopenSensorBlockedToast: () => void;
  firmwareVersion: string | null;
  board: SerialBoardType | null;
  deviceId: string | null;
  transport: SerialTransportType | null;
  connect: (options?: { skipAutoTest?: boolean }) => Promise<void>;
  connectBluetooth: (options?: { skipAutoTest?: boolean }) => Promise<void>;
  disconnect: () => Promise<void>;
  sendRoute: (
    route: BinRoute,
    options?: RouteOptions,
  ) => Promise<unknown | null>;
  sendPushTest: (test: PushTest) => Promise<unknown | null>;
  sendRawCommand: (line: string, timeoutMs: number) => Promise<RawCommandResult>;
  isRouteBusy: () => boolean;
  readIR: () => Promise<boolean[] | null>;
  sendTest: () => Promise<TestResult>;
  runTest: () => Promise<void>;
  checkFirmwareVersion: () => Promise<FirmwareCheckResult>;
  sendCommand: (data: string) => Promise<boolean>;
  receiveResponse: (timeoutMs?: number) => Promise<string>;
  subscribe: (listener: SerialMessageListener) => () => void;
  registerPreTestHook: (fn: PreTestHook) => () => void;
  getCommLog: () => CommLogEntry[];
  subscribeCommLog: (listener: () => void) => () => void;
  isFlashing: boolean;
  flashProgress: number | null;
  flashLog: string[];
  flashEsp32: (firmwareUrl: string) => Promise<FlashEsp32Result>;
}

export interface ScannerControlsProps {
  status: ScannerStatus;
  orientation?: "horizontal" | "vertical";
  isConnected: boolean;
  isReady: boolean;
  isFeeding: boolean;
  isClearingDevice: boolean;
  onForceScan: () => void;
  onPause: () => void;
  onResume: () => void;
  onFeed: () => void;
  onClearDevice: () => void;
}

export interface ScannerControlButtonProps {
  tooltip: string;
  hotkey?: HotkeyId;
  onClick: () => void;
  disabled?: boolean;
  selected?: boolean;
  children: ReactNode;
}

export interface ScannerOverlayProps {
  status: ScannerStatus;
  errorMessage: string;
  isCameraActive: boolean;
  isConnected: boolean;
  isReady: boolean;
  sensorBlockedModule: number | null;
  onResolveSensorBlocked: () => void;
  firmwareVersion: string | null;
  hasCatchAll: boolean;
  autoFeed: boolean;
  cameraSource: CameraSource;
  phonePairingStatus: PhoneCameraCaptureStatus;
  hasPhonePhoto: boolean;
  dailyLimitReached: boolean;
  onRetryError: () => void;
  onConnectCamera: () => void;
  onOpenPhonePairing: () => void;
  onConnectScanner: () => void;
  onConnectScannerBluetooth: () => void;
  bluetoothSupported: boolean;
}

export interface SetStats {
  code: string;
  name: string;
  count: number;
  value: number;
}

export interface ScanStats {
  totalCount: number;
  uniqueCount: number;
  totalValue: number;
  avgValue: number;
  hasPricing: boolean;
  mostValuable: { name: string; price: number } | null;
  sets: SetStats[];
  rarities: { key: string; label: string; count: number }[];
  colors: { key: string; label: string; bg: string; count: number }[];
  foilTypes: { key: string; label: string; count: number }[];
}

export interface BinFillLevel {
  binNumber: number;
  count: number;
  capacity: number | null;
  percent: number;
}

export interface RawCommandResult {
  status: "ok" | "disconnected" | "busy" | "noResponse";
  line: string | null;
}

export interface CommLogEntry {
  direction: "sent" | "received";
  text: string;
  timestamp: number;
}

export interface CommLogEntriesProps {
  entries: CommLogEntry[];
}

export type ConnectionStatus = "connecting" | "connected" | "error" | "closed";

export interface SessionError {
  id: string;
  message: string;
  timestamp: number;
}

export interface SessionMonitorState {
  collection: Collection | null;
  recentCards: ScannedCard[];
  cardsVersion: number;
  unmatchedCards: UnmatchedCard[];
  viewers: SessionViewer[];
  errors: SessionError[];
  status: ConnectionStatus;
}

export interface MonitorCardsSource {
  collectionGuid: string;
  shareToken?: string | null;
}

export interface MonitorCardGridProps {
  entries: GroupedScannedCard[];
  status: ConnectionStatus;
  cardCount: number;
  matchingCount: number;
  isLoading: boolean;
  viewMode: CardViewMode;
  groupDuplicates: boolean;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  showBinLocation: boolean;
  onOpenCard?: (scanId: string) => void;
}

export interface SessionMonitorViewProps {
  session: SessionMonitorState;
  cardsSource: MonitorCardsSource;
  header?: ReactNode;
  toolbarLeading?: ReactNode;
  binCount?: number;
  showBinLocation: boolean;
  canEditCards?: boolean;
  backHref?: string;
}

export interface MonitorCardsState {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortKey: string | null;
  setSortKey: (key: string | null) => void;
  sortableFields: FieldMeta[];
  filters: CardFilters;
  setFilters: (filters: CardFilters) => void;
  activeFilterCount: number;
  cardsQuery: CollectionCardsQuery;
  viewMode: CardViewMode;
  setViewMode: (mode: CardViewMode) => void;
  groupDuplicates: boolean;
  setGroupDuplicates: (grouped: boolean) => void;
  entries: GroupedScannedCard[];
  isLoading: boolean;
  page: number;
  pageCount: number;
  setPage: (page: number) => void;
  stats: ScanStats | null;
  cardCount: number;
  matchingCount: number;
  filteredCount: number;
  needsReviewCount: number;
  openScanId: string | undefined;
  setOpenScanId: (scanId: string | null) => void;
}

export type MobileMonitorTab = "cards" | "activity";

export interface MobileMonitorTabItem {
  key: MobileMonitorTab;
  label: string;
  badge?: number;
}

export interface MobileSessionMonitorProps {
  session: SessionMonitorState;
  cards: MonitorCardsState;
  collectionGuid: string;
  header?: ReactNode;
  toolbarLeading?: ReactNode;
  binCount?: number;
  canEditCards: boolean;
  backHref?: string;
}

export interface MobileMonitorCardsProps {
  cards: MonitorCardsState;
  status: ConnectionStatus;
  binCount?: number;
  canEditCards: boolean;
}

export interface MobileMonitorActivityProps {
  session: SessionMonitorState;
  stats: ScanStats | null;
  canEditCards: boolean;
  onOpenCard?: (scanId: string) => void;
}

export interface MobileCardTileProps {
  entry: GroupedScannedCard;
  onOpen?: () => void;
}

export interface MobileStatTileProps {
  label: string;
  value: string;
}

export interface MobileCardDetailDrawerProps {
  collectionGuid: string;
  scanId: string | undefined;
  onClose: () => void;
}

export interface MobileCardDetailBodyProps {
  collectionGuid: string;
  scanId: string;
  onClose: () => void;
}

export interface MonitorCardDetailProps {
  collectionGuid: string;
  scanId: string;
  cardsQuery: CollectionCardsQuery;
  onNavigate: (scanId: string | null) => void;
  onClose: () => void;
}

export interface SessionLockProps {
  className?: string;
  bannerClassName?: string;
  children: ReactNode;
}

export interface JamToastOptions {
  module: number;
  binNumber?: number;
}

export interface JamToastBodyProps {
  description: string;
  dropLabel: string;
  markClearedLabel: string;
  onDrop: () => void;
  onMarkCleared: () => void;
}

export interface ScanStatsProps {
  className?: string;
  scrollable?: boolean;
}

export interface CardScannerComponentProps extends CardScannerProps {
  controlsContainer?: HTMLElement | null;
}

export interface UnmatchedDiagnosticsDetailsProps {
  diagnostics: UnmatchedScanDiagnostics;
}

export interface OrientedSearch {
  result: CardSearchResult;
  embedding: number[] | null;
}

export interface OrientedCandidate extends OrientedSearch {
  canvas: HTMLCanvasElement;
  orientation: "upright" | "rotated";
}

export interface OrientedSearchPick extends OrientedCandidate {
  alternate: OrientedCandidate | null;
}

export interface TextSearchOutcome {
  pick: OrientedSearchPick | null;
  ocr: OcrDiagnostics | null;
}

export interface ResolvedSearchMatches {
  card: PlayingCardWithDistance | null;
  alternativeMatches: PlayingCardWithDistance[];
  noMatchReason: UnmatchedReason | null;
  lookupFailedCardIds?: string[];
  candidates: MatchCandidateDiagnostic[];
}

export interface ScanAttemptOutcome extends ResolvedSearchMatches {
  debugImageUrl: string;
  detectedContour: CardContour | null;
  vectorizedOn: ScanVectorizeSource;
  detection: ScanDetectionDiagnostics;
  search: CardSearchDiagnostics | null;
  orientation: "upright" | "rotated";
  embedding: number[] | null;
  topDistance: number | null;
  ocr: OcrDiagnostics | null;
  needsReview: boolean;
  matchedBy: ScanMatchSource;
  detectedColor: string | null;
}

export interface ScanOutcome {
  card: PlayingCardWithDistance | null;
  alternativeMatches: PlayingCardWithDistance[];
  debugImageUrl: string;
  detectedContour: CardContour | null;
  vectorizedOn: ScanVectorizeSource;
  matched: MatchedScanDetails | null;
  noMatch: UnmatchedScanDetails | null;
}

export interface UnmatchedRateToastProps {
  toastId: string | number;
  suggestOcr: boolean;
  onOpenCalibration: () => void;
  onOpenSettings: () => void;
}

export interface UnmatchedCardsPanelProps {
  cards: UnmatchedCard[];
  onRemove?: (scanId: string) => void;
  onIdentify?: (card: UnmatchedCard) => void;
}

export interface IdentifiableUnmatchedCardsPanelProps {
  cards: UnmatchedCard[];
  onRemove?: (scanId: string) => void;
}

export interface IdentifyUnmatchedDialogProps {
  entry: UnmatchedCard | null;
  collectionGuid: string | undefined;
  onClose: () => void;
}

export interface ForcedSetOptionProps {
  label: string;
  detail?: string;
  active: boolean;
  onSelect: () => void;
}
