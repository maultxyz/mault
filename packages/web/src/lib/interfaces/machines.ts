import type { MachineBinFill, MachineCommand, MachineStatus } from "@magic-vault/shared";

export interface MachinePanelProps {
  machine: MachineStatus;
}

export interface MachineCameraFrameState {
  imageUrl: string | null;
  isConnecting: boolean;
}

export interface MachineCommandVariables {
  machine: MachineStatus;
  command: MachineCommand;
}

export interface MachinePickerProps {
  machines: MachineStatus[];
  selectedMachineId: string;
  onSelectMachine: (machineId: string) => void;
}

export interface MachinePageDotsProps extends MachinePickerProps {}

export interface MachineBinTileProps {
  fill: MachineBinFill;
}

export interface MachinePanelSectionProps extends MachinePanelProps {
  showsName: boolean;
}
