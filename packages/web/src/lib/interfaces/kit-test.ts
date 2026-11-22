import type { RawCommandResult } from "@/lib/interfaces/scanner";
import type {
  ChannelLayout,
  FirmwareLedState,
  ModuleConfig,
  ServoName,
} from "@magic-vault/shared";
import type { RefObject } from "react";

export type KitServoVerdict = "pass" | "fail";

export interface KitServoResult {
  id: string;
  channel: number;
  verdict: KitServoVerdict;
  testedAt: number;
}

export interface KitTestSession {
  servoResults: KitServoResult[];
  recordServo: (channel: number, verdict: KitServoVerdict) => void;
  resetServos: () => void;
}

export interface KitPanelProps {
  session: KitTestSession;
  disabled: boolean;
}

export interface RawCommandFormValues {
  command: string;
}

export interface RawCommandHistoryEntry {
  id: string;
  sentAt: number;
  command: string;
  status: RawCommandResult["status"];
  reply: string | null;
}

export interface KitRawCommandConsoleProps {
  disabled: boolean;
}

export interface RawCommandHistoryRowProps {
  entry: RawCommandHistoryEntry;
}

export interface KitLedSelection {
  strip: number;
  led: number;
}

export interface KitLedBenchProps {
  disabled: boolean;
}

export interface KitLedStripRowProps {
  strip: number;
  leds: FirmwareLedState[];
  selection: KitLedSelection;
  disabled: boolean;
  onSelect: (selection: KitLedSelection) => void;
  onStripToggle: (strip: number, on: boolean) => void;
}

export interface KitLedSwatchProps {
  led: FirmwareLedState;
}

export type KitStressEndReason = "manual" | "allServosStopped" | "boardStopped";

export interface KitStressChannelResult {
  channel: number;
  cycles: number;
  stoppedAtMs: number | null;
  stoppedBy: KitStressStopSource | null;
}

export interface KitServoStressTest {
  isRunning: boolean;
  startedAtMs: number | null;
  endedAtMs: number | null;
  endReason: KitStressEndReason | null;
  results: KitStressChannelResult[];
  start: (plans: KitStressChannelPlan[]) => void;
  stop: () => void;
  markServoStopped: (channel: number) => void;
}

export interface KitServoStressBenchProps {
  stressTest: KitServoStressTest;
  watchCamera: KitServoWatchCamera;
  planInputs: KitStressPlanInputs;
  disabled: boolean;
}

export type KitServoStressTarget = "min" | "max";

export type KitStressStopSource = "manual" | "camera";

export interface KitWatchBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type KitWatchStatus = "learning" | "watching" | "noMotion";

export interface KitWatchDiscriminator {
  changedPixelIndices: Uint32Array;
  midpoint: Float32Array;
  maxMinusMin: Float32Array;
  halfEnergy: number;
}

export interface KitWatchChannelState {
  status: KitWatchStatus;
  references: Partial<Record<KitServoStressTarget, Float32Array>>;
  discriminator: KitWatchDiscriminator | null;
  previousPatch: Float32Array | null;
  consecutiveMisses: number;
  lastMovementPercent: number | null;
}

export interface KitWatchChannelSummary {
  status: KitWatchStatus;
  consecutiveMisses: number;
  lastMovementPercent: number | null;
}

export interface KitWatchSettledResult {
  state: KitWatchChannelState;
  isStopped: boolean;
}

export interface KitServoStressMotionWatch {
  resetForRun: (channels: number[]) => void;
  checkSettledPositions: (
    target: KitServoStressTarget,
    channels: number[],
  ) => Promise<number[]>;
}

export interface KitServoWatchCamera extends KitServoStressMotionWatch {
  cameras: MediaDeviceInfo[];
  selectedCameraId: string | null;
  stream: MediaStream | null;
  isStarting: boolean;
  hasError: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
  boxes: Record<number, KitWatchBox>;
  watchSummaries: Record<number, KitWatchChannelSummary>;
  refreshCameras: () => Promise<void>;
  startCamera: (cameraId: string) => Promise<void>;
  stopCamera: () => void;
  setBox: (channel: number, box: KitWatchBox) => void;
  clearBox: (channel: number) => void;
}

export interface KitWatchBoxEditorProps {
  watchCamera: KitServoWatchCamera;
  channels: number[];
  activeChannel: number | null;
  disabled: boolean;
}

export interface KitServoWatchPanelProps {
  watchCamera: KitServoWatchCamera;
  channels: number[];
  isRunning: boolean;
  disabled: boolean;
}

export type KitStressChannelRole =
  | {
      kind: "moduleServo";
      moduleNumber: number;
      servo: ServoName;
      isCalibrated: boolean;
    }
  | { kind: "feeder" }
  | { kind: "unassigned" };

export interface KitStressChannelPlan {
  channel: number;
  role: KitStressChannelRole;
  pulses: Record<KitServoStressTarget, number> | null;
  restPulse: number | null;
}

export interface KitStressPlanInputs {
  channelLayout: ChannelLayout;
  moduleCalibrations: ModuleConfig[];
  hasSavedCalibration: boolean;
}
