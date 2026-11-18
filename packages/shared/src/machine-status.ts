import { MACHINE_STATUS_STALE_AFTER_MS } from "./constants/machine-status.constant";
import type {
  MachineBinFill,
  MachineRunState,
  MachineStatus,
  MachineWorkflowStep,
} from "./interfaces/machine-status.interface";
import type { PresetWorkflow } from "./interfaces/sort-bins.interface";
import {
  activeWorkflowForGame,
  activeWorkflowStep,
  orderedWorkflowSteps,
  workflowStepNumber,
} from "./preset-workflows";

const RUN_STATE_DISPLAY_ORDER: Record<MachineRunState, number> = {
  attention: 0,
  running: 1,
  paused: 2,
  stopped: 3,
  idle: 4,
};

export function sortMachinesForDisplay(machines: MachineStatus[]): MachineStatus[] {
  return [...machines].sort(
    (first, second) =>
      RUN_STATE_DISPLAY_ORDER[first.runState] - RUN_STATE_DISPLAY_ORDER[second.runState] ||
      first.name.localeCompare(second.name) ||
      first.machineId.localeCompare(second.machineId),
  );
}

export function upsertMachineStatus(
  machines: MachineStatus[],
  status: MachineStatus,
): MachineStatus[] {
  const others = machines.filter((machine) => machine.machineId !== status.machineId);
  return sortMachinesForDisplay([...others, status]);
}

export function removeMachineStatusFromList(machines: MachineStatus[], machineId: string): MachineStatus[] {
  return machines.filter((machine) => machine.machineId !== machineId);
}

export function machineBinFillPercent(fill: MachineBinFill): number | null {
  if (fill.capacity == null || fill.capacity <= 0) return null;
  return Math.min(100, Math.round((fill.count / fill.capacity) * 100));
}

export function orderMachineBinFill(fill: MachineBinFill[]): MachineBinFill[] {
  return [...fill].sort(
    (first, second) =>
      Number(first.isCatchAll) - Number(second.isCatchAll) || first.binNumber - second.binNumber,
  );
}

export function isMachineStatusStale(status: MachineStatus, now: number): boolean {
  return now - status.updatedAt > MACHINE_STATUS_STALE_AFTER_MS;
}

export function machineShowsLiveCamera(status: MachineStatus): boolean {
  return (
    status.hasCamera &&
    (status.runState === "running" || status.runState === "paused" || status.runState === "attention")
  );
}

export function machineWorkflowStep(
  workflows: PresetWorkflow[],
  gameGuid: string | null | undefined,
): MachineWorkflowStep | null {
  const workflow = activeWorkflowForGame(workflows, gameGuid);
  const step = activeWorkflowStep(workflow);
  if (!workflow || !step) return null;
  return {
    workflowName: workflow.name,
    position: workflowStepNumber(workflow, step),
    stepCount: orderedWorkflowSteps(workflow).length,
  };
}

export function machineBinFillFromCounts(
  bins: { binNumber: number; isCatchAll?: boolean; isDisabled?: boolean }[],
  countOf: (binNumber: number) => number,
  capacityOf: (binNumber: number) => number | null,
): MachineBinFill[] {
  return orderMachineBinFill(
    bins
      .filter((bin) => !bin.isDisabled)
      .map((bin) => ({
        binNumber: bin.binNumber,
        count: countOf(bin.binNumber),
        capacity: capacityOf(bin.binNumber),
        isCatchAll: !!bin.isCatchAll,
      })),
  );
}
