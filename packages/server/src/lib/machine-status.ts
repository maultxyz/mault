import { randomUUID } from "node:crypto";
import {
  MACHINE_CAMERA_FRAME_STALE_MS,
  MACHINE_CAMERA_LEASE_MS,
  MACHINE_CAMERA_REQUESTED_EVENT,
  MACHINE_COMMAND_EVENT,
  MACHINE_REMOVED_EVENT,
  MACHINE_STATUS_EVENT,
  MACHINE_STATUS_IDLE_TTL_MS,
  MACHINE_STATUS_RUNNING_TTL_MS,
  sortMachinesForDisplay,
  type MachineCommand,
  type MachineCommandEvent,
  type MachineSource,
  type MachineStatus,
  type MachineStatusInput,
} from "@magic-vault/shared";
import { emitToOrg } from "./session-stream";
import type { MachineCameraFrame, MachineEntry } from "./interfaces/machine-status";

const machinesByOrg = new Map<string, Map<string, MachineEntry>>();

function orgMachines(orgId: string): Map<string, MachineEntry> {
  let machines = machinesByOrg.get(orgId);
  if (!machines) {
    machines = new Map();
    machinesByOrg.set(orgId, machines);
  }
  return machines;
}

function statusLifetimeMs(status: MachineStatusInput): number {
  return status.runState === "running" || status.runState === "attention"
    ? MACHINE_STATUS_RUNNING_TTL_MS
    : MACHINE_STATUS_IDLE_TTL_MS;
}

function dropExpiredMachines(orgId: string, now: number) {
  const machines = machinesByOrg.get(orgId);
  if (!machines) return;
  for (const [machineId, entry] of machines) {
    if (entry.expiresAt > now) continue;
    machines.delete(machineId);
    emitToOrg(orgId, MACHINE_REMOVED_EVENT, { machineId });
  }
  if (machines.size === 0) machinesByOrg.delete(orgId);
}

export function listMachineStatuses(orgId: string): MachineStatus[] {
  dropExpiredMachines(orgId, Date.now());
  const machines = machinesByOrg.get(orgId);
  if (!machines) return [];
  return sortMachinesForDisplay([...machines.values()].map((entry) => entry.status));
}

export function findMachineStatus(orgId: string, machineId: string): MachineStatus | null {
  dropExpiredMachines(orgId, Date.now());
  return machinesByOrg.get(orgId)?.get(machineId)?.status ?? null;
}

export function publishMachineStatus(
  orgId: string,
  machineId: string,
  source: MachineSource,
  input: MachineStatusInput,
): MachineStatus {
  const now = Date.now();
  dropExpiredMachines(orgId, now);
  const machines = orgMachines(orgId);
  const previous = machines.get(machineId);
  const status: MachineStatus = { ...input, machineId, source, updatedAt: now };
  machines.set(machineId, {
    status,
    expiresAt: now + statusLifetimeMs(input),
    frame: previous?.frame ?? null,
    cameraLeaseUntil: previous?.cameraLeaseUntil ?? 0,
    cameraRequestedAt: previous?.cameraRequestedAt ?? 0,
  });
  emitToOrg(orgId, MACHINE_STATUS_EVENT, status);
  return status;
}

export function removeMachineStatus(orgId: string, machineId: string): boolean {
  const machines = machinesByOrg.get(orgId);
  if (!machines?.delete(machineId)) return false;
  if (machines.size === 0) machinesByOrg.delete(orgId);
  emitToOrg(orgId, MACHINE_REMOVED_EVENT, { machineId });
  return true;
}

export function sendMachineCommand(
  orgId: string,
  machineId: string,
  command: MachineCommand,
): MachineCommandEvent {
  const event: MachineCommandEvent = { machineId, command, commandId: randomUUID() };
  emitToOrg(orgId, MACHINE_COMMAND_EVENT, event);
  return event;
}

export function renewMachineCameraLease(orgId: string, machineId: string): void {
  const entry = machinesByOrg.get(orgId)?.get(machineId);
  if (!entry) return;
  const now = Date.now();
  const wasWatched = entry.cameraLeaseUntil > now;
  const frameIsStale =
    !entry.frame || now - entry.frame.capturedAt > MACHINE_CAMERA_FRAME_STALE_MS;
  const mayAskAgain = now - entry.cameraRequestedAt > MACHINE_CAMERA_FRAME_STALE_MS;
  entry.cameraLeaseUntil = now + MACHINE_CAMERA_LEASE_MS;
  if (!wasWatched || (frameIsStale && mayAskAgain)) {
    entry.cameraRequestedAt = now;
    emitToOrg(orgId, MACHINE_CAMERA_REQUESTED_EVENT, { machineId });
  }
}

export function storeMachineCameraFrame(
  orgId: string,
  machineId: string,
  bytes: Buffer,
): { stored: boolean; keepSending: boolean } {
  const entry = machinesByOrg.get(orgId)?.get(machineId);
  if (!entry) return { stored: false, keepSending: false };
  entry.frame = { bytes, capturedAt: Date.now() };
  return { stored: true, keepSending: entry.cameraLeaseUntil > Date.now() };
}

export function readMachineCameraFrame(
  orgId: string,
  machineId: string,
): MachineCameraFrame | null {
  return machinesByOrg.get(orgId)?.get(machineId)?.frame ?? null;
}
