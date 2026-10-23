export interface PiUpdateState {
  phase: "idle" | "running" | "succeeded" | "failed";
  startedAt: number | null;
  message: string | null;
}

export interface PiUpdateStatus {
  state: PiUpdateState;
  available: boolean;
  installedVersion: string | null;
  latestVersion: string | null;
}
