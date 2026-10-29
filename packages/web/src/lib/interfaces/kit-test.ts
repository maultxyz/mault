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
