import type {
  PiHostClaimFormValues,
  PiHostScanAction,
  PiHostSummary,
  PiLinkLocalStatusResponse,
  PiScanSessionSettingsBody,
  PiScanSessionStartBody,
} from "@magic-vault/shared";

export interface RaspberryPiList {
  hosts: PiHostSummary[];
  canManage: boolean;
}

export interface RaspberryPiRowProps {
  host: PiHostSummary;
  canManage: boolean;
  onRemove: (host: PiHostSummary) => void;
  onRename: (host: PiHostSummary) => void;
}

export interface RaspberryPiStartDialogProps {
  host: PiHostSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface RenameRaspberryPiDialogProps {
  host: PiHostSummary | null;
  onOpenChange: (open: boolean) => void;
  onRename: (guid: string, name: string) => Promise<unknown>;
}

export interface LinkRaspberryPiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLink: (values: PiHostClaimFormValues) => Promise<unknown>;
  initialCode?: string | null;
}

export interface PiLinkSetup {
  status: PiLinkLocalStatusResponse | null;
  isUnreachable: boolean;
}

export interface PiLinkSetupStepsProps {
  code: string;
  appUrl: string;
}

export interface PiLinkSetupLinkedProps {
  hostName: string;
  connected: boolean;
  appUrl: string | null;
}

export type RaspberryPiScanRequest =
  | { kind: "start"; body: PiScanSessionStartBody }
  | { kind: "settings"; body: PiScanSessionSettingsBody }
  | { kind: "stop" }
  | { kind: "action"; action: PiHostScanAction };

export interface RaspberryPiCamera {
  frame: string | null;
  isUnavailable: boolean;
}
