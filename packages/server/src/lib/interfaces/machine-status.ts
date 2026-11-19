import type { MachineStatus } from "@magic-vault/shared";

export interface MachineCameraFrame {
  bytes: Buffer;
  capturedAt: number;
}

export interface MachineEntry {
  status: MachineStatus;
  expiresAt: number;
  frame: MachineCameraFrame | null;
  cameraLeaseUntil: number;
  cameraRequestedAt: number;
}
