import type {
  MACHINE_ATTENTION_KINDS,
  MACHINE_COMMANDS,
  MACHINE_RUN_STATES,
} from "../constants/machine-status.constant";

export type MachineRunState = (typeof MACHINE_RUN_STATES)[number];
export type MachineCommand = (typeof MACHINE_COMMANDS)[number];
export type MachineAttentionKind = (typeof MACHINE_ATTENTION_KINDS)[number];
export type MachineSource = "station" | "piHost";

export interface MachineAttention {
  kind: MachineAttentionKind;
  module?: number;
  binNumbers?: number[];
  detail?: string;
}

export interface MachineBinFill {
  binNumber: number;
  count: number;
  capacity: number | null;
  isCatchAll: boolean;
}

export interface MachineWorkflowStep {
  workflowName: string;
  position: number;
  stepCount: number;
}

export interface MachineLastCard {
  name: string | null;
  binNumber: number | null;
  matched: boolean;
}

export interface MachineStatusInput {
  name: string;
  deviceGuid: string | null;
  collectionGuid: string | null;
  collectionName: string | null;
  runState: MachineRunState;
  attention: MachineAttention | null;
  isEmergencyStopped: boolean;
  canPause: boolean;
  canResume: boolean;
  canEmergencyStop: boolean;
  sessionScanCount: number;
  presetName: string | null;
  workflowStep: MachineWorkflowStep | null;
  binFill: MachineBinFill[] | null;
  hasCamera: boolean;
  lastCard: MachineLastCard | null;
}

export interface MachineStatus extends MachineStatusInput {
  machineId: string;
  source: MachineSource;
  updatedAt: number;
}

export interface MachineCommandEvent {
  machineId: string;
  command: MachineCommand;
  commandId: string;
}

export interface MachineCameraFrameUploadResult {
  keepSending: boolean;
}
