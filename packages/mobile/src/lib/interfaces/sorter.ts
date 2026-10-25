import type {
  BinRoute,
  CommLogEntry,
  RouteOptions,
  SerialMessageListener,
  SerialReply,
  SerialRequestResult,
  SerialResetReason,
} from "@magic-vault/shared";
import type { Device } from "@/lib/interfaces/devices";

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
  bleMtu?: number;
  uptimeMs?: number;
  servoDriver?: string;
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
  discovered: DiscoveredSorter[];
  device: Device | null;
  firmwareVersion: string | null;
  board: string | null;
  isReady: boolean;
  isConnected: boolean;
  commLog: CommLogEntry[];
  startDiscovery: () => void;
  stopDiscovery: () => void;
  connect: (id: string) => Promise<void>;
  connectCloud: (deviceGuid: string) => Promise<void>;
  disconnect: () => Promise<void>;
  runSelfTest: () => Promise<boolean>;
  sendRequest: (command: object, timeoutMs?: number) => Promise<SerialRequestResult>;
  sendRoute: (route: BinRoute, options?: RouteOptions) => Promise<unknown>;
  feed: () => Promise<SerialReply | null>;
  sendNeutral: () => Promise<boolean>;
  clearDevice: () => Promise<void>;
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
