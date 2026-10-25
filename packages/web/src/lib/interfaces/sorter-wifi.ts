import type { SorterWifiFormValues } from "@/schemas/sorter-wifi.schema";
import type { SorterWifiStatus } from "@magic-vault/shared";

export type SorterWifiResult =
  | { ok: true; restarting: boolean; serverLinkRemovalFailed: boolean }
  | { ok: false; error: string | null };

export interface SorterWifiControls {
  isSupported: boolean;
  needsWifiBoard: boolean;
  needsFirmware: boolean;
  sharesRadioWithBluetooth: boolean;
  canConfigure: boolean;
  status: SorterWifiStatus | null;
  configure: (values: SorterWifiFormValues) => Promise<SorterWifiResult>;
  forget: () => Promise<SorterWifiResult>;
}

export interface SorterWifiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSsid: string | null;
  onSubmit: (values: SorterWifiFormValues) => Promise<SorterWifiResult>;
}

export interface SorterWifiStatusListProps {
  status: SorterWifiStatus | null;
}

export interface MobileRemoteSortersProps {
  disabled: boolean;
  onConnect: (deviceGuid: string) => Promise<void>;
  connectingGuid: string | null;
}

export interface WifiSorterOption {
  guid: string;
  name: string;
  online: boolean;
  inUse: boolean;
  connectedHere: boolean;
}

export interface WifiSorterMenuItemsProps {
  onSelect: (deviceGuid: string) => void;
  disabled?: boolean;
}
