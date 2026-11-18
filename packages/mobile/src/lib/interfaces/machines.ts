import type { MachineBinFill, MachineCommand, MachineStatus } from "@magic-vault/shared";

export interface MachinePanelProps {
  machine: MachineStatus;
}

export interface MachineCameraViewProps extends MachinePanelProps {
  isVisible: boolean;
}

export interface MachinePanelSectionProps extends MachineCameraViewProps {
  showsName: boolean;
}

export interface MachineBinTileProps {
  fill: MachineBinFill;
  spansFullWidth: boolean;
}

export interface MachineCameraFrameState {
  imageUri: string | null;
  isConnecting: boolean;
}

export interface MachineCommandVariables {
  machine: MachineStatus;
  command: MachineCommand;
}

export interface MachinePageDotsProps {
  machines: MachineStatus[];
  selectedMachineId: string;
  onSelectMachine: (machineId: string) => void;
}

export interface MachineRecentCardsStripProps {
  collectionGuid: string;
  fallback: string;
}

export interface MachinesLayoutProps {
  machines: MachineStatus[];
}
