import type { PlayingCard } from "@magic-vault/shared";
import type { ReactNode } from "react";
import type { Device } from "@/lib/interfaces/calibration";

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
  connectPort: (port: SerialPort) => Promise<void>;
  connectBluetoothDevice: (device: BluetoothDevice) => Promise<void>;
  disconnect: () => void;
}

export interface StationsContextValue {
  stations: StationState[];
  activeStationId: string;
  connectedStationIds: ReadonlySet<string>;
  panelLayout: StationPanelLayout | null;
  panelsDocked: boolean;
  maxConnectedSorters: number;
  sorterLimitIsHardCap: boolean;
  canConnectAnotherSorter: boolean;
  isStationLive: (id: string) => boolean;
  setActiveStation: (id: string) => void;
  bindStationDevice: (id: string, deviceGuid: string) => void;
  claimStationCollection: (id: string, collectionGuid: string | null) => boolean;
  setStationCamera: (id: string, cameraId: string | null) => void;
  setStationConnected: (id: string, connected: boolean) => void;
  registerConnector: (id: string, connector: StationConnector) => () => void;
  connectAnotherSorter: (kind: StationConnectKind) => void;
  connectPortToStandby: (port: SerialPort) => Promise<void>;
  connectBluetoothDeviceToStandby: (device: BluetoothDevice) => Promise<void>;
  disconnectStation: (id: string) => void;
  getPanelElement: (id: string) => HTMLElement;
  attachPanels: (layout: StationPanelLayout) => () => void;
  overviewOpen: boolean;
  attachOverview: () => () => void;
  getDevicePrefs: (deviceGuid: string) => DevicePrefs | undefined;
  getOverviewTileElement: (id: string) => HTMLElement;
}

export interface StationTabProps {
  station: StationState;
  index: number;
  isActive: boolean;
}

export type StationStatus = "sorting" | "paused" | "offline";

export interface StationStatusDotProps {
  status: StationStatus;
}

export interface StationOverviewCardProps {
  name: string;
  status: StationStatus;
  camera: ReactNode;
  latestCard: PlayingCard | undefined;
  collectionName: string | undefined;
  totalCount: number;
  onOpen?: () => void;
  openLabel?: string;
  action?: ReactNode;
}

export interface OfflineDeviceTileProps {
  device: Device;
}

export interface RenameDeviceButtonProps {
  device: Device;
}

export interface StationContextValue {
  station: StationState;
  index: number;
  isActive: boolean;
  isLive: boolean;
}

export type PreTestHook = (device: Device | undefined) => Promise<void>;

export interface BleReconnectState {
  cancel: (() => void) | null;
}
