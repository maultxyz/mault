import { hostname } from "node:os";
import {
  MACHINE_NAME_MAX_LENGTH,
  MACHINE_PI_HOST_POLL_MS,
  MACHINE_STATUS_HEARTBEAT_MS,
  PI_HOST_MACHINE_ID,
  machineBinFillFromCounts,
  machineWorkflowStep,
  scanBinCapacity,
  type MachineAttention,
  type MachineRunState,
  type MachineStatusInput,
  type MachineWorkflowStep,
  type PiScanSessionState,
} from "@magic-vault/shared";
import { authQuery } from "../../db";
import { publishMachineStatus } from "../machine-status";
import { isPiHost } from "../pi-host";
import { loadPresetWorkflows } from "../preset-workflows";
import { getPiScanMachineSource, listPiScanSessionOrgIds } from "./session";
import type { PiScanRunContext } from "../interfaces/pi-scan";

const publishedByOrg = new Map<string, { signature: string; publishedAt: number }>();
const workflowStepByKey = new Map<string, MachineWorkflowStep | null>();
const workflowStepLoads = new Set<string>();

function runStateOf(state: PiScanSessionState): {
  runState: MachineRunState;
  attention: MachineAttention | null;
} {
  if (state.emergencyStopped) {
    return { runState: "attention", attention: { kind: "emergencyStopped" } };
  }
  if (state.phase === "error") {
    return {
      runState: "attention",
      attention: { kind: "scannerError", detail: state.message ?? undefined },
    };
  }
  if (state.phase === "paused" && state.message) {
    return { runState: "attention", attention: { kind: "scannerError", detail: state.message } };
  }
  if (state.phase === "running") return { runState: "running", attention: null };
  if (state.phase === "paused") return { runState: "paused", attention: null };
  if (state.phase === "stopped") return { runState: "stopped", attention: null };
  return { runState: "idle", attention: null };
}

function binFillOf(context: PiScanRunContext) {
  return machineBinFillFromCounts(
    context.configs,
    (binNumber) => context.counts.get(binNumber) ?? 0,
    (binNumber) =>
      scanBinCapacity(
        context.heights.get(binNumber),
        context.cardThickness,
        context.set,
        context.configs.find((bin) => bin.binNumber === binNumber) ?? { isCatchAll: false },
        context.storageBatchStarts?.get(binNumber) ?? [],
      ),
  );
}

function workflowStepFor(orgId: string, context: PiScanRunContext, jwtClaims: string) {
  const key = `${orgId}:${context.gameGuid}:${context.set.guid}`;
  if (workflowStepByKey.has(key)) return workflowStepByKey.get(key) ?? null;
  if (!workflowStepLoads.has(key)) {
    workflowStepLoads.add(key);
    void authQuery(jwtClaims, (tx) => loadPresetWorkflows(tx, orgId))
      .then((workflows) => workflowStepByKey.set(key, machineWorkflowStep(workflows, context.gameGuid)))
      .catch(() => workflowStepByKey.set(key, null))
      .finally(() => workflowStepLoads.delete(key));
  }
  return null;
}

export function buildPiHostMachineStatus(orgId: string): MachineStatusInput | null {
  const source = getPiScanMachineSource(orgId);
  if (!source) return null;
  const { state, context, cameraId, jwtClaims } = source;
  const { runState, attention } = runStateOf(state);
  const isActive = state.phase === "running" || state.phase === "paused";
  return {
    name: hostname().slice(0, MACHINE_NAME_MAX_LENGTH) || "Raspberry Pi",
    deviceGuid: context?.deviceGuid ?? null,
    collectionGuid: state.collectionGuid,
    collectionName: context?.collectionName ?? null,
    runState,
    attention,
    isEmergencyStopped: !!state.emergencyStopped,
    canPause: state.phase === "running" && !state.stopping,
    canResume: state.phase === "paused" && !state.stopping && !state.emergencyStopped,
    canEmergencyStop: isActive && !state.emergencyStopped,
    sessionScanCount: state.cardsScanned,
    presetName: context?.set.name ?? null,
    workflowStep: context ? workflowStepFor(orgId, context, jwtClaims) : null,
    binFill: context ? binFillOf(context) : null,
    hasCamera: isActive && (!!cameraId || !!context),
    lastCard: state.lastCard
      ? { name: state.lastCard.name, binNumber: state.lastCard.binNumber, matched: state.lastCard.matched }
      : null,
  };
}

function publishChangedPiHostStatuses() {
  const now = Date.now();
  for (const orgId of listPiScanSessionOrgIds()) {
    const status = buildPiHostMachineStatus(orgId);
    if (!status) continue;
    const signature = JSON.stringify(status);
    const previous = publishedByOrg.get(orgId);
    if (
      previous &&
      previous.signature === signature &&
      now - previous.publishedAt < MACHINE_STATUS_HEARTBEAT_MS
    )
      continue;
    publishMachineStatus(orgId, PI_HOST_MACHINE_ID, "piHost", status);
    publishedByOrg.set(orgId, { signature, publishedAt: now });
  }
}

export function startPiHostMachineStatusPublisher(): void {
  if (!isPiHost()) return;
  setInterval(publishChangedPiHostStatuses, MACHINE_PI_HOST_POLL_MS).unref();
}
