import type { WSContext } from "hono/ws";
import type { WebSocket } from "ws";

export interface SorterLinkTarget {
  orgId: string;
  deviceGuid: string;
  firmwareVersion: string | null;
}

export type SorterLinkEnv = { Variables: { sorterLink: SorterLinkTarget } };

export type SorterLinkSocket = WSContext<WebSocket>;

export interface DeviceLink extends SorterLinkTarget {
  socket: SorterLinkSocket;
  client: SorterLinkSocket | null;
  stopKeepAlive: () => void;
}

export type AttachClientResult = "ok" | "offline" | "in_use";
