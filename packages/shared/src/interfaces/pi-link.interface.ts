import type {
  PI_LINK_DEVICE_ACTIONS,
  PI_LINK_PAIRING_STATUSES,
  PI_LINK_SCAN_ACTIONS,
} from "../constants/pi-link.constant";
import type { PiUpdateStatus } from "./pi-update.interface";
import type { PiScanSessionState } from "./pi-scan.interface";

export type PiLinkPairingStatus = (typeof PI_LINK_PAIRING_STATUSES)[number];

export interface PiHostSummary {
  guid: string;
  name: string;
  pairedAt: string;
  lastSeenAt: string | null;
  sorterDeviceGuid: string | null;
  connected: boolean;
  scanState: PiScanSessionState | null;
  update: PiUpdateStatus | null;
}

export interface PiHostStatusEvent {
  hostGuid: string;
  connected: boolean;
  scanState: PiScanSessionState | null;
  update: PiUpdateStatus | null;
}

export type PiHostUpdateStatusKey = "updating" | "available" | "failed";

export interface PiHostUpdateControls {
  statusKey: PiHostUpdateStatusKey | null;
  installedVersion: string | null;
  latestVersion: string | null;
  canUpdate: boolean;
}

export type PiHostScanStatusKey = "offline" | "idle" | "running" | "paused" | "stopping" | "error";

export type PiHostScanAction = "pause" | "resume" | "emergency-stop" | "feed";

export type PiHostScanSessionSubpath = PiHostScanAction | "settings";

export interface PiHostScanControls {
  statusKey: PiHostScanStatusKey;
  canStart: boolean;
  canPause: boolean;
  canResume: boolean;
  canStop: boolean;
  canEmergencyStop: boolean;
}

export interface PiLinkPairingCreated {
  code: string;
  pollSecret: string;
  expiresAt: string;
}

export type PiLinkPairingPoll =
  | { status: "pending"; expiresAt: string }
  | { status: "expired" }
  | {
      status: "claimed";
      token: string;
      orgId: string;
      hostGuid: string;
      hostName: string;
    };

export interface PiLinkDeviceIdentity {
  hostGuid: string;
  orgId: string;
  name: string;
}

export type PiLinkScanAction = (typeof PI_LINK_SCAN_ACTIONS)[number];

export type PiLinkDeviceAction = (typeof PI_LINK_DEVICE_ACTIONS)[number];

export type PiLinkCommandAction = PiLinkScanAction | PiLinkDeviceAction;

export interface PiLinkScanActionResult {
  status: number;
  body: {
    success: boolean;
    message?: string;
    code?: string;
    data?: PiScanSessionState;
  };
}

export interface PiLinkCommandMessage {
  type: "command";
  id: string;
  userId: string;
  action: PiLinkCommandAction;
  body?: unknown;
}

export interface PiLinkCameraMessage {
  type: "camera";
  watching: boolean;
}

export type PiLinkServerMessage = PiLinkCommandMessage | PiLinkCameraMessage;

export type PiLinkDeviceMessage =
  | ({ type: "reply"; id: string } & PiLinkScanActionResult)
  | { type: "state"; state: PiScanSessionState; sessionActive: boolean }
  | { type: "ended" }
  | { type: "frame"; image: string }
  | { type: "update"; update: PiUpdateStatus };

export interface PiHostScanStatus {
  connected: boolean;
  state: PiScanSessionState | null;
}

export type PiLinkLocalStatus =
  | { state: "off" }
  | { state: "pairing"; code: string | null; expiresAt: string | null }
  | { state: "linked"; hostName: string; connected: boolean };

export type PiLinkLocalStatusResponse = PiLinkLocalStatus & { appUrl: string | null };
