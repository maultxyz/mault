export type KitServoVerdict = "pass" | "fail";

export interface KitServoResult {
  id: string;
  channel: number;
  verdict: KitServoVerdict;
  testedAt: number;
}

export type KitSelfTestState =
  | { status: "notRun" }
  | { status: "passed"; at: number }
  | { status: "failed"; at: number; error: string | null };

export interface KitSensorState {
  id: string;
  module: number | null;
  current: boolean | null;
  seenCard: boolean;
  seenClear: boolean;
}

export interface KitSensorReading {
  ir: boolean[];
  hopper: boolean | null;
}

export interface KitTestSession {
  selfTest: KitSelfTestState;
  setSelfTest: (state: KitSelfTestState) => void;
  servoResults: KitServoResult[];
  recordServo: (channel: number, verdict: KitServoVerdict) => void;
  resetServos: () => void;
  sensors: KitSensorState[];
  recordSensorReading: (reading: KitSensorReading) => void;
  resetSensors: () => void;
}

export interface KitPanelProps {
  session: KitTestSession;
  disabled: boolean;
}

export interface KitContinuousServoPanelProps {
  disabled: boolean;
}

export interface KitReportDevice {
  board: string | null;
  firmwareVersion: string | null;
  deviceId: string | null;
}

export interface KitTestReportProps {
  session: KitTestSession;
}
