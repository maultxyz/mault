import type { SorterWifiFormValues, SorterWifiStatus } from "@magic-vault/shared";
import type {
  BinRoute,
  RetractCardOutcome,
  RouteOptions,
  SerialMessageListener,
  SerialReply,
  SerialRequestResult,
  SerialResetReason,
} from "@magic-vault/shared";
import type { Device, RecentSorter } from "@magic-vault/shared";

export interface ByteTransport {
  readonly id: string;
  readonly name: string | null;
  start(): Promise<void>;
  write(data: Uint8Array): Promise<void>;
  onData(cb: (chunk: Uint8Array) => void): void;
  onDisconnect(cb: () => void): void;
  setMtu(mtu: number): void;
  close(): Promise<void>;
}

export interface DiscoveredSorter {
  id: string;
  name: string | null;
  rssi: number | null;
}

export interface WifiSorter {
  guid: string;
  name: string;
  online: boolean;
  inUse: boolean;
}

export type CloudOpenResult =
  | { ok: true; transport: ByteTransport }
  | { ok: false; code: SorterErrorCode };

export type SorterPhase =
  | "idle"
  | "scanning"
  | "connecting"
  | "identifying"
  | "syncing"
  | "testing"
  | "ready"
  | "error";

export type SorterErrorCode =
  | "bluetooth-off"
  | "bluetooth-unauthorized"
  | "connect-failed"
  | "identify-failed"
  | "sorter-limit"
  | "servo-driver-missing"
  | "test-failed"
  | "sensor-blocked"
  | "emergency-stopped"
  | "emergency-stop-reset-failed"
  | "connection-lost"
  | "heartbeat-lost"
  | "setup-incomplete"
  | "sorter-offline"
  | "sorter-in-use";

export interface SorterError {
  code: SorterErrorCode;
  detail?: string;
  module?: number;
}

export type SensorNote = "dropped" | "dropFailed" | "stillBlocked" | "noResponse";

export interface SorterNotice {
  reason: SerialResetReason;
}

export interface SorterStatusReply {
  version?: string;
  board?: string;
  id?: string;
  name?: string;
  bleMtu?: number;
  uptimeMs?: number;
  servoDriver?: string;
  wifi?: string;
}

export interface SorterContextValue {
  phase: SorterPhase;
  error: SorterError | null;
  notice: SorterNotice | null;
  dismissNotice: () => void;
  sensorNote: SensorNote | null;
  clearingSensor: boolean;
  dropBlockedCard: () => Promise<void>;
  markSensorCleared: () => Promise<void>;
  resettingEmergencyStop: boolean;
  resetEmergencyStop: () => Promise<void>;
  discovered: DiscoveredSorter[];
  recentSorters: RecentSorter[];
  device: Device | null;
  firmwareVersion: string | null;
  board: string | null;
  hasWifi: boolean;
  isCloudConnection: boolean;
  isReady: boolean;
  isConnected: boolean;
  startDiscovery: () => void;
  stopDiscovery: () => void;
  connect: (id: string) => Promise<void>;
  connectCloud: (deviceGuid: string) => Promise<void>;
  disconnect: () => Promise<void>;
  runSelfTest: () => Promise<boolean>;
  sendRequest: (command: object, timeoutMs?: number) => Promise<SerialRequestResult>;
  sendRoute: (route: BinRoute, options?: RouteOptions) => Promise<unknown>;
  feed: () => Promise<SerialReply | null>;
  feedRequiringEmptyModuleOne: () => Promise<SerialReply | null>;
  readSensors: () => Promise<SerialReply | null>;
  sendNeutral: () => Promise<boolean>;
  sendEmergencyStop: () => Promise<boolean>;
  clearDevice: () => Promise<void>;
  retractCard: () => Promise<RetractCardOutcome>;
  sendCommand: (command: object) => void;
  applySavedCalibration: () => Promise<void>;
  updateDevice: (device: Device) => void;
  subscribe: (listener: SerialMessageListener) => () => void;
}

export interface TestOutcome {
  ok: boolean;
  error: string | null;
  blockedModule: number | null;
  servoDriverMissing: boolean;
}

export type SorterWifiResult =
  | { ok: true; restarting: boolean; serverLinkRemovalFailed: boolean }
  | { ok: false; error: string | null };

export interface SorterWifiControls {
  isSupported: boolean;
  needsWifiBoard: boolean;
  needsFirmware: boolean;
  sharesRadioWithBluetooth: boolean;
  canConfigure: boolean;
  isCloudConnection: boolean;
  status: SorterWifiStatus | null;
  configure: (values: SorterWifiFormValues) => Promise<SorterWifiResult>;
  forget: () => Promise<SorterWifiResult>;
}
