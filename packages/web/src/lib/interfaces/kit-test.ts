import type { RawCommandResult } from "@/lib/interfaces/scanner";

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
