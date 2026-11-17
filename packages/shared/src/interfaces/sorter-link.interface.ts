import type {
  CLOUD_LINK_STATES,
  WIFI_LINK_STATES,
} from "../constants/sorter-link.constant";

export type WifiLinkState = (typeof WIFI_LINK_STATES)[number];
export type CloudLinkState = (typeof CLOUD_LINK_STATES)[number];

export interface SorterLinkStatus {
  guid: string;
  linked: boolean;
  online: boolean;
  inUse: boolean;
  firmwareVersion: string | null;
}

export interface SorterLinkCredentials {
  token: string;
  url: string | null;
}

export interface SorterWifiStatus {
  wifi: WifiLinkState;
  ssid: string | null;
  ip: string | null;
  rssi: number | null;
  cloud: CloudLinkState;
  host: string | null;
}

export type SorterLinkOpenFailure = "offline" | "inUse" | "failed";

export type SorterLinkSocketOpenResult =
  | { ok: true; socket: WebSocket }
  | { ok: false; reason: SorterLinkOpenFailure };

export interface SorterLinkTextCodec {
  encodeText: (text: string) => Uint8Array;
  decodeBytes: (bytes: Uint8Array) => string;
}
