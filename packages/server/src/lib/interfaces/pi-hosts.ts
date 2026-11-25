import type {
  PiHostSummary,
  PiLinkDeviceIdentity,
  PiLinkScanActionResult,
  PiScanSessionState,
} from "@magic-vault/shared";
import type { WSContext } from "hono/ws";
import type { WebSocket } from "ws";

export interface PiHostTokenRecord extends PiLinkDeviceIdentity {
  id: number;
  lastSeenAt: Date | null;
  activeScanUserId: string | null;
}

export type StoredPiHostSummary = Omit<PiHostSummary, "connected" | "scanState">;

export type PiLinkEnv = { Variables: { piHost: PiHostTokenRecord } };

export interface PiLinkPairingRow {
  expiresAt: Date;
  piHostId: number | null;
  claimedAt: Date | null;
  tokenDeliveredAt: Date | null;
}

export type PiLinkPairingPollState = "pending" | "deliver" | "expired";

export type PiHostClaimResult =
  | { ok: true; guid: string }
  | { ok: false; reason: "notFound" };

export interface PiLinkDeviceConnection {
  socket: PiLinkSocket;
  orgId: string;
  state: PiScanSessionState | null;
}

export interface PiLinkPendingCommand {
  hostGuid: string;
  resolve: (result: PiLinkScanActionResult) => void;
  timer: ReturnType<typeof setTimeout>;
}

export type PiLinkSocket = WSContext<WebSocket>;

export interface PiLinkDeviceCredential {
  baseUrl: string;
  token: string;
  orgId: string;
  hostGuid: string;
  hostName: string;
}

export type PiHostCameraEnv = { Variables: { piHostGuid: string } };

export interface PiSorterBridgeCredential {
  token: string;
  deviceGuid: string;
}
