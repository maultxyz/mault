export interface SerialSessionTransport {
  write(data: Uint8Array): Promise<void>;
  onData(listener: (chunk: Uint8Array) => void): void;
}

export interface SerialTextDecoder {
  decode(chunk: Uint8Array): string;
}

export interface SerialSessionOptions {
  createDecoder: () => SerialTextDecoder;
  encodeText: (text: string) => Uint8Array;
  maxCommLogEntries: number;
}

export interface SerialRequestResult {
  sent: boolean;
  line: string;
}

export interface PendingSerialReply {
  seq: number | null;
  resolve: (line: string) => void;
}

export interface CommLogEntry {
  direction: "sent" | "received" | "connected" | "disconnected" | "restarted";
  text: string;
  timestamp: number;
}

export interface RouteOptions {
  feedNext?: boolean;
}

export interface SkippedRouteResponse {
  skipped: true;
}

export interface SerialRouteQueue {
  tail: Promise<unknown>;
  pending: number;
}

export type SerialReply = Record<string, unknown>;

export type SerialMessageListener = (message: unknown) => void;

export type SerialBootBannerHandler = (message: unknown) => boolean;
