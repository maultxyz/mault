import type { HotkeyId } from "@/lib/interfaces/hotkeys";
import type { AppToast } from "@/lib/interfaces/toast";
import type { CardViewMode, ReviewSession } from "@/lib/interfaces/cards";
import type { SessionViewer } from "@/lib/interfaces/collections";
import type {
  BinConfig,
  CardCondition,
  CardFilters,
  EmptyBinOptions,
  CardContour,
  CornerDetection,
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
  Result,
  UnmatchedCard,
} from "@magic-vault/shared";
import type { ReactNode } from "react";
import type { PreTestHook } from "@/lib/interfaces/stations";
import type { Device } from "@/lib/interfaces/calibration";
import type { TFunction } from "i18next";

export type PhoneCameraCaptureStatus =
  | "idle"
  | "waiting"
  | "connected"
  | "error";

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
  unmatchedCount: number;
  isLoading: boolean;
  autoFeed: boolean;
  forceFoilType: string | null;
  forceSetCode: string | null;
  elapsedMs: number;
  isTimerActive: boolean;
  recentScanTimes: number[];
  sessionScanCount: number;
  lastRoutedBin: LastRoutedBin | null;
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
  removeUnmatchedCard: (scanId: string) => Promise<boolean>;
  identifyUnmatchedCard: (
    scanId: string,
    card: PlayingCard,
  ) => Promise<boolean>;
  promptAddedCardBin: (collectionGuid: string, added: ScannedCard) => boolean;
  sendCatchAllBin: () => void;
  binLimitReached: BinConfig | null;
  resolveBinLimit: (options: EmptyBinOptions) => Promise<boolean>;
  dismissBinLimit: () => void;
  fullBins: number[] | null;
  fullBinCount: number;
  emptyNextFullBin: (options: EmptyBinOptions) => Promise<boolean>;
  dismissFullBins: () => void;
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
  markCardReviewed: (scanId: string) => void;
  setCardFoilType: (scanId: string, foilType: string | null) => void;
  setCardCondition: (scanId: string, condition: CardCondition) => void;
  setCardsCondition: (scanIds: string[], condition: CardCondition) => void;
  markDownloaded: (scanIds: string[]) => void;
  clearCards: () => void;
}

export type SerialMessageListener = (message: unknown) => void;

export type SerialBoardType = "esp32" | "uno_r4";

export type SerialTransportType = "serial" | "bluetooth" | "cloud";

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

export interface FlashImagePart {
  data: Uint8Array;
  address: number;
}

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
  servoDriverMissing: boolean;
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
  paddleOpenDelay: number;
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
  connectCloud: (
    deviceGuid: string,
    options?: { skipAutoTest?: boolean },
  ) => Promise<boolean>;
  disconnect: () => Promise<void>;
  sendRoute: (
    route: BinRoute,
    options?: RouteOptions,
  ) => Promise<unknown | null>;
  sendPushTest: (test: PushTest) => Promise<unknown | null>;
  sendRawCommand: (
    line: string,
    timeoutMs: number,
  ) => Promise<RawCommandResult>;
  isRouteBusy: () => boolean;
  readIR: () => Promise<boolean[] | null>;
  sendNeutral: () => Promise<boolean>;
  sendTest: () => Promise<TestResult>;
  runTest: () => Promise<void>;
  checkFirmwareVersion: () => Promise<FirmwareCheckResult>;
  sendCommand: (data: string) => Promise<boolean>;
  sendRequest: (
    command: object,
    timeoutMs?: number,
  ) => Promise<SerialRequestResult>;
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
  isResettingDevice: boolean;
  onForceScan: () => void;
  onPause: () => void;
  onResume: () => void;
  onFeed: () => void;
  onClearDevice: () => void;
  onResetDevice: () => void;
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
  onConnectScannerCloud: (deviceGuid: string) => void;
  bluetoothSupported: boolean;
  handScanActive: boolean;
  lastRoutedBin: LastRoutedBin | null;
  onEnableHandScan: () => void;
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
  rarities: {
    key: string;
    label: string;
    bg: string;
    textClass: string;
    count: number;
  }[];
  colors: {
    key: string;
    label: string;
    bg: string;
    textClass: string;
    count: number;
  }[];
  foilTypes: { key: string; label: string; count: number }[];
}

export interface BinFillLevel {
  binNumber: number;
  count: number;
  capacity: number | null;
  percent: number;
}

export interface BinCardCounts {
  counts: Map<number, number>;
  updatedAt: number;
}

export interface ComputedBinFillLevels {
  levels: BinFillLevel[];
  countsUpdatedAt: number;
}

export interface PendingBinCard {
  binNumber: number;
  savedAt: number | null;
}

export type BinLevelStatus = "normal" | "warning" | "full";

export interface LastRoutedBin {
  binNumber: number;
  at: number;
}

export interface BinLevelLayout {
  rows: (number | undefined)[][];
  bottom: number[];
}

export interface BinLevelCellProps {
  level: BinFillLevel;
  isCatchAll: boolean;
  isDisabled: boolean;
  flashKey: number | null;
  onEmpty: (binNumber: number) => void;
  className?: string;
}

export interface BinLevelSummary {
  totalCards: number;
  fullest: BinFillLevel | null;
  needsEmptying: number;
}

export interface SerialRequestResult {
  sent: boolean;
  line: string;
}

export interface PendingSerialReply {
  seq: number | null;
  resolve: (line: string) => void;
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
  unmatchedCount: number;
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
  onStartReview?: () => void;
}

export interface MobileMonitorActivityProps {
  session: SessionMonitorState;
  collectionGuid: string;
  stats: ScanStats | null;
  canEditCards: boolean;
  onOpenCard?: (scanId: string) => void;
}

export interface MobileCardTileProps {
  entry: GroupedScannedCard;
  onOpen?: () => void;
  onLongPress?: () => void;
}

export interface MobileCardActionsDrawerProps {
  entry: GroupedScannedCard | null;
  onOpenDetails: (scanId: string) => void;
  onClose: () => void;
}

export interface MobileCardActionsBodyProps {
  entry: GroupedScannedCard;
  onOpenDetails: () => void;
  onClose: () => void;
}

export interface MobileCardDetailDrawerProps {
  collectionGuid: string;
  scanId: string | undefined;
  reviewMode?: boolean;
  onNavigate: (scanId: string | null) => void;
  onReviewComplete: (count: number) => void;
  onClose: () => void;
}

export interface MobileCardDetailBodyProps {
  collectionGuid: string;
  scanId: string;
  reviewMode: boolean;
  reviewSession: ReviewSession;
  onNavigate: (scanId: string | null) => void;
  onReviewComplete: (count: number) => void;
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
  renderChrome?: (chrome: ScannerChromeContext) => ReactNode;
}

export interface ScannerChromeContext {
  status: ScannerStatus;
  errorMessage: string;
  isCameraActive: boolean;
  isConnected: boolean;
  isReady: boolean;
  sensorBlockedModule: number | null;
  firmwareVersion: string | null;
  hasCatchAll: boolean;
  autoFeed: boolean;
  allowDuplicates: boolean;
  isAtScanLimit: boolean;
  bluetoothSupported: boolean;
  cameras: MediaDeviceInfo[];
  selectedCameraId: string | null;
  onPause: () => void;
  onResume: () => void;
  onScanOnce: () => void;
  onRetry: () => void;
  onConnectBluetooth: () => void;
  onResolveSensorBlocked: () => void;
  onSelectCamera: (deviceId: string) => void;
  onAutoFeedChange: (value: boolean) => void;
  onAllowDuplicatesChange: (value: boolean) => void;
  isFeeding: boolean;
  isClearingDevice: boolean;
  isResettingDevice: boolean;
  onFeed: () => void;
  onClearDevice: () => void;
  onResetDevice: () => void;
  handScan: boolean;
  handScanActive: boolean;
  lastRoutedBin: LastRoutedBin | null;
  onHandScanChange: (value: boolean) => void;
}

export interface MobileScanControlsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chrome: ScannerChromeContext;
}

export interface MobileSessionScansSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionGuid: string | undefined;
  count: number;
}

export interface UnmatchedDiagnosticsDetailsProps {
  diagnostics: UnmatchedScanDiagnostics;
  className?: string;
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
  lowConfidenceMatch: boolean;
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
  stationName: string | null;
  suggestOcr: boolean;
  onOpenCalibration: () => void;
  onOpenSettings: () => void;
}

export interface UnmatchedCardsPanelProps {
  cards: UnmatchedCard[];
  total: number;
  collectionGuid?: string;
  canIdentify?: boolean;
  onRemove?: (scanId: string) => Promise<boolean>;
}

export interface UnmatchedCardsGridDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  openIndex: number | null;
  onOpenIndexChange: (index: number | null) => void;
  collectionGuid: string;
  canIdentify: boolean;
  onRemove?: (scanId: string) => Promise<boolean>;
}

export interface UnmatchedCardsBrowserProps {
  collectionGuid: string;
  openIndex: number | null;
  onOpenIndexChange: (index: number | null) => void;
  canIdentify: boolean;
  onRemove?: (scanId: string) => Promise<boolean>;
  onClose?: () => void;
  className?: string;
}

export interface UnmatchedViewState {
  isOpen: boolean;
  openIndex: number | null;
  open: (index?: number | null) => void;
  setOpenIndex: (index: number | null) => void;
  close: () => void;
}

export interface UnmatchedCardDetailProps {
  collectionGuid: string;
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  canIdentify: boolean;
  onRemove?: (scanId: string) => Promise<boolean>;
}

export interface UnmatchedCardTileProps {
  entry: UnmatchedCard;
  onOpen: () => void;
}

export interface UnmatchedCardImageProps {
  entry: UnmatchedCard;
  className?: string;
}

export interface ForcedSetPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface ForcedSetOptionProps {
  label: string;
  detail?: string;
  active: boolean;
  onSelect: () => void;
}

export interface BinCorrection {
  id: string;
  scanId: string;
  cardName: string;
  currentBin?: number;
  targetBin?: number;
  pickListName?: string;
  releasedPickListName?: string;
  addedCard?: ScannedCard;
}

export interface CorrectedBinTarget {
  bin?: BinConfig;
  pickListName?: string;
}

export interface BinCorrectionDialogProps {
  correction: BinCorrection | null;
  onMoved: (correction: BinCorrection) => void;
  onClose: () => void;
}

export interface CorrectionAutoCloseTimerProps {
  seconds: number;
  willMove: boolean;
  onElapsed: () => void;
}

export interface BinCorrectionTileProps {
  label: string;
  bin: number | undefined;
}

export interface ByteTransport {
  kind: SerialTransportType;
  start(): void;
  write(data: Uint8Array<ArrayBuffer>): Promise<void>;
  onData(cb: (chunk: Uint8Array) => void): void;
  onDisconnect(cb: () => void): void;
  onError(cb: (error: unknown) => void): void;
  close(): Promise<void>;
  setMtu?(mtu: number): void;
}

export interface ClientDewarpResult {
  detection: CornerDetection;
  dewarpedCanvas: HTMLCanvasElement | null;
  frame: HTMLCanvasElement;
}

export interface RouteCardToBinParams {
  route: BinRoute;
  sendRoute: (
    route: BinRoute,
    options?: RouteOptions,
  ) => Promise<unknown | null>;
  toast: AppToast;
  t: TFunction;
  failedKey: string;
  cardName?: string;
  collectionGuid: string | undefined;
  isAutoFeedEnabled: () => boolean;
  isPipelinedFeedEnabled: () => boolean;
  pause: () => void;
  triggerAutoFeed: () => void;
  onJam: (options: JamToastOptions) => void;
}

export type OnnxExecutionProviderPreference = "webgpu" | "wasm";

export interface AutoFeedSerial {
  sendRequest: (
    command: object,
    timeoutMs?: number,
  ) => Promise<SerialRequestResult>;
  ignoreIrSensors: boolean;
}

export interface PendingCapture {
  requestId: string;
  resolve: (dataUrl: string | null) => void;
  timeout: ReturnType<typeof setTimeout>;
}

export interface OcrBetaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export interface PhoneCameraPairingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: PhoneCameraCaptureStatus;
  pairingUrl: string | null;
  onRetry: () => void;
  onDisconnect: () => void;
}

export interface ScannerMenuProps {
  isCameraActive: boolean;
  isConnected: boolean;
  autoFeed: boolean;
  allowDuplicates: boolean;
  cameras: MediaDeviceInfo[];
  selectedCameraId: string | null;
  phonePairingStatus: PhoneCameraCaptureStatus;
  scanningBlocked: boolean;
  onCameraConnect: () => void;
  onCameraDisconnect: () => void;
  onCameraSelect: (deviceId: string) => void;
  onOpenPhonePairing: () => void;
  onScannerConnect: () => void;
  onScannerConnectBluetooth: () => void;
  onScannerConnectCloud: (deviceGuid: string) => void;
  bluetoothSupported: boolean;
  onScannerDisconnect: () => void;
  onScannerRetry: () => void;
  onCalibrate: () => void;
  onAutoFeedChange: (enabled: boolean) => void;
  onAllowDuplicatesChange: (enabled: boolean) => void;
  onConnectAnotherUsb: () => void;
  onConnectAnotherBluetooth: () => void;
  onConnectAnotherCloud: (deviceGuid: string) => void;
  canConnectAnotherSorter: boolean;
  sorterLimitIsHardCap: boolean;
  onUpgrade: () => void;
  handScan: boolean;
  onHandScanChange: (enabled: boolean) => void;
}

export interface SessionStatsPanelProps {
  stats: ScanStats | null;
  totalCards: number;
}

export interface DebugCardSet {
  mockCards: PlayingCardWithDistance[];
  multiMatch: {
    card: PlayingCardWithDistance;
    imageUrl: string;
    alternates: PlayingCardWithDistance[];
  };
}


export interface ScanSaveOptions {
  deviceGuid?: string;
  orgId?: string | null;
  isRetry?: boolean;
}

export type CardSaveResult = Result<ScannedCard> & {
  scanLimitReached?: boolean;
  sorterLimitReached?: boolean;
  binLimitReached?: boolean;
  binNumber?: number;
};

export type UnmatchedSaveResult = Result<UnmatchedCard> & {
  binLimitReached?: boolean;
  binNumber?: number;
};

interface ScanSaveTarget {
  orgId: string | null;
  collectionGuid: string;
  deviceGuid?: string;
}

export interface CardScanSave extends ScanSaveTarget {
  record: ScannedCard;
}

export interface UnmatchedScanSave extends ScanSaveTarget {
  record: UnmatchedCard;
}

export type PendingScanSave =
  | (CardScanSave & { kind: "card"; scanId: string; queuedAt: number })
  | (UnmatchedScanSave & {
      kind: "unmatched";
      scanId: string;
      queuedAt: number;
    });

export interface PendingScanSavesContextValue {
  saveCard: (save: CardScanSave) => Promise<CardSaveResult>;
  saveUnmatched: (save: UnmatchedScanSave) => Promise<UnmatchedSaveResult>;
  pendingCount: number;
}

export interface DeployPauseContextValue {
  reportDeployPause: (resume: () => void) => void;
}

export interface DeployPauseDialogProps {
  open: boolean;
  pausedCount: number;
  onResume: () => void;
  onClose: () => void;
}

export type QrScannerStatus = "starting" | "scanning" | "error";

export interface QrPairingScannerProps {
  onResult: (text: string) => void;
}

export interface MobileScanChromeProps {
  chrome: ScannerChromeContext;
}

export interface MobileScanNoticeProps {
  title: string;
  description?: string;
  tone?: "neutral" | "warning" | "error";
  action?: ReactNode;
}

export interface MobileScanOptionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chrome: ScannerChromeContext;
  onChooseCollection: () => void;
  onChoosePreset: () => void;
  onChooseCamera: () => void;
}

export interface MobileCameraSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chrome: ScannerChromeContext;
}

export interface MobileCollectionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface MobilePresetSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export type CloudTransportFailure = "offline" | "inUse" | "failed";

export interface OutlineAnimator {
  setTarget: (contour: CardContour | null) => void;
  cancel: () => void;
}
