import {
  removeMachineStatusFromList,
  sortMachinesForDisplay,
  upsertMachineStatus,
  type MachineStatus,
} from "@magic-vault/shared";

let machines: MachineStatus[] = [];
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) listener();
}

export function subscribeMachineStatuses(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getMachineStatuses(): MachineStatus[] {
  return machines;
}

export function replaceMachineStatuses(next: MachineStatus[]) {
  machines = sortMachinesForDisplay(next);
  emitChange();
}

export function applyMachineStatus(status: MachineStatus) {
  machines = upsertMachineStatus(machines, status);
  emitChange();
}

export function dropMachineStatus(machineId: string) {
  machines = removeMachineStatusFromList(machines, machineId);
  emitChange();
}
