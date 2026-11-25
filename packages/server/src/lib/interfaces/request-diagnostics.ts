export type RequestDiagnosticStage = "request" | "verifyImpersonationToken" | "verifyToken" | "getUserRole" | "orgMembership" | "memberSeat" | "handler";
export interface RequestDiagnosticPoolCounts { total: number; idle: number; waiting: number }
export interface RequestDiagnosticPools {
  main: RequestDiagnosticPoolCounts;
  single: RequestDiagnosticPoolCounts;
  background: RequestDiagnosticPoolCounts;
}
export interface RequestDiagnosticRecord {
  event: "slow" | "complete" | "abort";
  ordinal: number;
  category: string;
  method: string;
  elapsedMs: number;
  status: number;
  stage: RequestDiagnosticStage;
  pools: RequestDiagnosticPools;
}
export interface RequestDiagnosticState { stage: RequestDiagnosticStage }
export interface RequestDiagnosticOptions {
  enabled: () => boolean;
  readPools: () => RequestDiagnosticPools;
  emit: (record: RequestDiagnosticRecord) => void | Promise<void>;
  slowMs: number;
  maxTracked: number;
}
