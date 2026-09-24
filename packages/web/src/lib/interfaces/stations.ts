import type { Device } from "@/features/calibration/api/devices";

export type StationPanelLayout = "horizontal" | "vertical";

export type StationConnectKind = "usb" | "bluetooth";

export interface StationState {
  id: string;
  deviceGuid: string | null;
  collectionGuid: string | null;
  cameraId: string | null;
}

export interface DevicePrefs {
  collectionGuid: string | null;
  cameraId: string | null;
}

export interface StationConnector {
  connect: () => Promise<void>;
  connectBluetooth: () => Promise<void>;
}

export interface StationsContextValue {
  stations: StationState[];
  activeStationId: string;
  connectedStationIds: ReadonlySet<string>;
  panelLayout: StationPanelLayout | null;
  // null when unlimited (Business plan, or billing isn't configured).
  maxConnectedSorters: number | null;
  canConnectAnotherSorter: boolean;
  isStationLive: (id: string) => boolean;
  setActiveStation: (id: string) => void;
  bindStationDevice: (id: string, deviceGuid: string) => void;
  claimStationCollection: (id: string, collectionGuid: string | null) => boolean;
  setStationCamera: (id: string, cameraId: string | null) => void;
  setStationConnected: (id: string, connected: boolean) => void;
  registerConnector: (id: string, connector: StationConnector) => () => void;
  connectAnotherSorter: (kind: StationConnectKind) => void;
  getPanelElement: (id: string) => HTMLElement;
  attachPanels: (layout: StationPanelLayout) => () => void;
}

export interface StationContextValue {
  station: StationState;
  index: number;
  isActive: boolean;
  isLive: boolean;
}

export type PreTestHook = (device: Device | undefined) => Promise<void>;
