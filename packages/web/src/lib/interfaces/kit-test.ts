import type { RawCommandResult } from "@/lib/interfaces/scanner";
import type { FirmwareLedState } from "@magic-vault/shared";

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
