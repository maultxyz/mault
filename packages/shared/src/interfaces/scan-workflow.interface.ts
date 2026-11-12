import type { PlayingCardWithDistance } from "./card.interface";
import type { ScannerControlCommand } from "./scanner-control-code.interface";

export type ScanWorkflowResult =
  | "control"
  | "removal"
  | "duplicate"
  | "matched"
  | "unmatched"
  | "stopped";

export interface ScanWorkflowAdapter<Frame, Outcome> {
  controlStage: "before-identify" | "after-miss";
  capture(): Promise<Frame>;
  readControl(frame: Frame): Promise<string | null> | string | null;
  applyControl(command: ScannerControlCommand | null): Promise<void> | void;
  identify(frame: Frame): Promise<Outcome>;
  card(outcome: Outcome): PlayingCardWithDistance | null;
  isRemoval(): boolean;
  remove(outcome: Outcome): Promise<void> | void;
  isDuplicate(card: PlayingCardWithDistance): boolean;
  duplicate(outcome: Outcome): Promise<void> | void;
  refineFoil?(outcome: Outcome): Promise<Outcome>;
  matched(outcome: Outcome): Promise<void> | void;
  unmatched(outcome: Outcome): Promise<void> | void;
  checkpoint?(): Promise<boolean>;
}

export interface ScanDispositionAdapter<
  Plan extends { action: "pause" | "route" },
> {
  revision?(): unknown;
  prepare(): Plan;
  hold(plan: Plan): Promise<boolean>;
  assign(plan: Plan): Promise<void> | void;
  pick(plan: Plan): Promise<void> | void;
  route(plan: Plan): Promise<void> | void;
  persist(plan: Plan): Promise<void> | void;
  complete(plan: Plan): Promise<void> | void;
  checkpoint?(): Promise<boolean>;
}

export interface MatchedScanRecordInput {
  scanId: string;
  scannedAt: number;
  card: PlayingCardWithDistance;
  binNumber?: number;
  capturedImageUrl?: string;
  alternativeMatches?: PlayingCardWithDistance[];
  foilType: string | null;
  condition?: import("./card-condition.interface").CardCondition;
  lowConfidenceMatch?: boolean;
  vectorizedOn?: import("./scanner.interface").ScanVectorizeSource;
  diagnostics?: import("./scanner.interface").MatchedScanDiagnostics;
}
